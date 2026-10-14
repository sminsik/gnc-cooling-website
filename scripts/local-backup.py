"""Offline local D1/R2 snapshots. Never restore over an existing directory.

Python standard library only. Run writers to completion/stop dev before backup.
SQLite backup API includes committed WAL content without checkpointing the source.
"""
import argparse
from contextlib import closing, contextmanager
import datetime as dt
import hashlib
import json
import os
from pathlib import Path
import shutil
import socket
import sqlite3
import subprocess
import sys
import uuid

ROOT = Path(__file__).resolve().parent.parent
DEFAULT_STATE = ROOT / '.wrangler/state/v3'
FORMAT = 'gnc-local-d1-r2-v1'


class SnapshotError(ValueError):
    """Messages are controlled and contain no private source values."""


def require(condition, message):
    if not condition:
        raise SnapshotError(message)


def digest(path):
    with path.open('rb') as handle:
        return hashlib.file_digest(handle, 'sha256').hexdigest()


def canonical(value):
    return json.dumps(value, ensure_ascii=False, sort_keys=True, separators=(',', ':')).encode()


@contextmanager
def ro(path):
    with closing(sqlite3.connect(path.resolve().as_uri() + '?mode=ro', uri=True, timeout=5)) as db:
        yield db


def quote(name):
    return '"' + name.replace('"', '""') + '"'


def cell(value):
    # Preserve types, including BLOB and floating point representations.
    if isinstance(value, bytes):
        return ['blob', value.hex()]
    if isinstance(value, float):
        return ['float', value.hex()]
    return [type(value).__name__, value]


def sqlite_inventory(path):
    with ro(path) as db:
        require(db.execute('PRAGMA integrity_check').fetchall() == [('ok',)],
                'SQLite integrity check failed')
        require(not db.execute('PRAGMA foreign_key_check').fetchall(),
                'SQLite foreign key check failed')
        schema = db.execute("SELECT type,name,tbl_name,sql FROM sqlite_master ORDER BY type,name").fetchall()
        tables = {}
        for (name,) in db.execute("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name"):
            row_hashes = sorted(hashlib.sha256(canonical([cell(v) for v in row])).hexdigest()
                                for row in db.execute('SELECT * FROM ' + quote(name)))
            tables[name] = {'rows': len(row_hashes),
                            'sha256': hashlib.sha256(canonical(row_hashes)).hexdigest()}
        return {'integrity': 'ok', 'foreign_key_errors': 0,
                'schema_sha256': hashlib.sha256(canonical(schema)).hexdigest(), 'tables': tables}


def state_files(state):
    require(state.is_dir() and not state.is_symlink(), 'State directory missing or symlinked')
    result = []
    for kind in ('d1', 'r2'):
        folder = state / kind
        require(folder.is_dir() and not folder.is_symlink(), 'Both local D1 and R2 directories are required')
        for path in sorted(folder.rglob('*')):
            require(not path.is_symlink(), 'Symlinks are not allowed in snapshots')
            if not path.is_file():
                continue
            if path.name.endswith(('-wal', '-shm', '-journal')):
                continue
            require(path.suffix == '.sqlite' or (kind == 'r2' and 'blobs' in path.relative_to(folder).parts),
                    'Unexpected file in D1/R2 state; inspect manually')
            result.append(path)
    require(any(p.suffix == '.sqlite' and p.name != 'metadata.sqlite'
                for p in result if p.relative_to(state).parts[0] == 'd1'), 'No local D1 database found')
    return result


def inventory(state):
    files = state_files(state)
    databases = {}
    blobs = {}
    objects = {}
    object_checksums = {}
    for path in files:
        rel = path.relative_to(state).as_posix()
        if path.suffix == '.sqlite':
            databases[rel] = sqlite_inventory(path)
            if rel.startswith('r2/'):
                with ro(path) as db:
                    names = {row[0] for row in db.execute("SELECT name FROM sqlite_master WHERE type='table'")}
                    if '_mf_objects' in names:
                        # List keys/metadata without printing their contents to stdout.
                        objects[rel] = db.execute('SELECT key,blob_id,size,etag FROM _mf_objects ORDER BY key').fetchall()
        else:
            blobs[rel] = {'bytes': path.stat().st_size, 'sha256': digest(path)}
    def blob_path(blob_id):
        matches = [state / rel for rel in blobs if Path(rel).name == blob_id]
        require(len(matches) == 1, 'R2 metadata references missing or ambiguous blob')
        return matches[0]
    for rel, rows in objects.items():
        object_checksums[rel] = {}
        with ro(state / rel) as db:
            for blob_id, size in db.execute('SELECT blob_id,size FROM _mf_multipart_parts'):
                require(blob_path(blob_id).stat().st_size == size, 'R2 multipart size mismatch')
            for key, blob_id, size, etag in rows:
                ids = [blob_id] if blob_id is not None else [row[0] for row in db.execute(
                    'SELECT blob_id FROM _mf_multipart_parts WHERE object_key=? ORDER BY part_number', (key,))]
                sha = hashlib.sha256()
                actual_size = 0
                for part in ids:
                    with blob_path(part).open('rb') as handle:
                        while chunk := handle.read(1024 * 1024):
                            sha.update(chunk)
                            actual_size += len(chunk)
                require(actual_size == size, 'R2 object size mismatch')
                object_checksums[rel][key] = sha.hexdigest()
    # JSON round-trip normalises tuples so comparison after manifest loading is exact.
    return json.loads(canonical({'databases': databases, 'r2_files': blobs, 'r2_objects': objects,
                                'r2_object_sha256': object_checksums}))


def stopped(state, quiesced):
    require(quiesced, 'Stop all writers, then explicitly pass --quiesced')
    if state == DEFAULT_STATE.resolve():
        for port in (8787, 8788):
            with socket.socket() as probe:
                probe.settimeout(.2)
                require(probe.connect_ex(('127.0.0.1', port)) != 0,
                        'Project preview/HTTPS port is active; stop project writers first')
    # Covers alternate-port Wrangler commands launched from this project on Linux/Mac.
    rows = subprocess.check_output(['ps', '-axo', 'pid=,comm='], text=True).splitlines()
    for row in rows:
        parts = row.strip().split(None, 1)
        if len(parts) != 2 or int(parts[0]) == os.getpid():
            continue
        pid, command = parts
        if Path(command).name not in ('node', 'workerd', 'pnpm', 'wrangler'):
            continue
        args = subprocess.run(['ps', '-p', pid, '-o', 'args='], capture_output=True, text=True).stdout
        if Path(command).name != 'workerd' and not any(word in args for word in ('wrangler', 'miniflare')):
            continue
        if sys.platform.startswith('linux'):
            try:
                cwd = Path('/proc') / pid / 'cwd'
                cwd = cwd.resolve(strict=True)
            except OSError:
                continue
        else:
            require(shutil.which('lsof'), 'lsof is required to detect project writers on this platform')
            proc = subprocess.run(['lsof', '-a', '-p', pid, '-d', 'cwd', '-Fn'],
                                  capture_output=True, text=True)
            dirs = [line[1:] for line in proc.stdout.splitlines() if line.startswith('n')]
            if not dirs:
                continue
            cwd = Path(dirs[0]).resolve()
        if cwd == ROOT and state == DEFAULT_STATE.resolve():
            require(False, 'Project Node/workerd process is active; stop it before backup')


def private_json(path, value):
    with path.open('x', encoding='utf8') as handle:
        json.dump(value, handle, ensure_ascii=False, indent=2)
        handle.write('\n')


def tool_metadata():
    def git(*args):
        return subprocess.check_output(['git', '-C', str(ROOT), *args], text=True).strip()
    pkg = json.loads((ROOT / 'package.json').read_text())
    return {'source_commit': git('rev-parse', 'HEAD'),
            'source_worktree_dirty': bool(git('status', '--porcelain')),
            'required_node': pkg['engines']['node'], 'package_manager': pkg['packageManager'],
            'wrangler': json.loads((ROOT / 'node_modules/wrangler/package.json').read_text())['version'],
            'python': sys.version.split()[0], 'sqlite': sqlite3.sqlite_version, 'platform': sys.platform,
            'lockfile_sha256': digest(ROOT / 'pnpm-lock.yaml'),
            'wrangler_config_sha256': digest(ROOT / 'wrangler.jsonc'),
            'migration_files': {p.name: digest(p) for p in sorted((ROOT / 'migrations').glob('*.sql'))}}


def backup(state, output, quiesced):
    state, output = state.resolve(), output.resolve()
    require(not output.is_relative_to(state), 'Backup output must be outside source state')
    stopped(state, quiesced)
    before = inventory(state)
    output.mkdir(parents=True, exist_ok=True, mode=0o700)
    stamp = dt.datetime.now(dt.timezone.utc).strftime('%Y%m%dT%H%M%S.%fZ')
    destination = output / (stamp + '-' + uuid.uuid4().hex[:8])
    destination.mkdir(mode=0o700)
    saved = destination / 'state/v3'
    for path in state_files(state):
        target = saved / path.relative_to(state)
        target.parent.mkdir(parents=True, exist_ok=True, mode=0o700)
        if path.suffix == '.sqlite':
            with ro(path) as source, closing(sqlite3.connect(target)) as dest:
                source.backup(dest)
        else:
            shutil.copyfile(path, target)
        target.chmod(0o600)
    actual = inventory(saved)
    require(before == actual == inventory(state),
            'Source changed during backup or snapshot differs; incomplete backup must not be used')
    manifest = {'format': FORMAT, 'created_at_utc': stamp, 'source_state': str(state),
                'snapshot_method': 'quiesced-sqlite-backup-api-and-r2-blobs',
                'storage_version': 'v3', 'tools': tool_metadata(), 'inventory': actual,
                'files': {p.relative_to(saved).as_posix(): {'bytes': p.stat().st_size, 'sha256': digest(p)}
                          for p in state_files(saved)},
                'excluded': ['.dev.vars*', '.env*', 'credentials', 'certificates', 'logs',
                             'observability', 'cache', 'kv', 'WAL/SHM sidecars'],
                'restore': 'restore into a NEW persist root; use matching commit/lockfile and --persist-to ROOT'}
    # Manifest is the completion marker; interrupted snapshots without it are invalid.
    private_json(destination / 'manifest.json', manifest)
    return {'ok': True, 'backup': str(destination), 'database_files': len(actual['databases']),
            'r2_blob_files': len(actual['r2_files']),
            'r2_objects': sum(len(rows) for rows in actual['r2_objects'].values())}


def load_verified(folder):
    require(not folder.is_symlink(), 'Backup symlinks are not allowed')
    require(not (folder / 'manifest.json').is_symlink(), 'Manifest symlink is not allowed')
    manifest = json.loads((folder / 'manifest.json').read_text())
    require(manifest.get('format') == FORMAT, 'Unknown backup format')
    saved = folder / 'state/v3'
    require(not (folder / 'state').is_symlink(), 'Backup state symlink is not allowed')
    actual = {p.relative_to(saved).as_posix(): {'bytes': p.stat().st_size, 'sha256': digest(p)}
              for p in state_files(saved)}
    require(actual == manifest['files'], 'Backup file list/checksum mismatch')
    require(inventory(saved) == manifest['inventory'], 'Backup DB/R2 inventory mismatch')
    return manifest, saved


def restore(folder, destination):
    manifest, saved = load_verified(folder)
    require(not destination.exists() and not destination.is_symlink(), 'Restore destination must NOT exist')
    target = destination.resolve()
    require(not target.is_relative_to(ROOT / '.wrangler'), 'Restore cannot target live Wrangler state')
    source = Path(manifest['source_state']).resolve()
    require(not target.is_relative_to(source) and not source.is_relative_to(target),
            'Restore cannot overlap original state')
    require(not target.is_relative_to(folder.resolve()), 'Restore cannot be inside backup')
    destination.mkdir(parents=True, mode=0o700)
    for path in state_files(saved):
        output = destination / 'v3' / path.relative_to(saved)
        output.parent.mkdir(parents=True, exist_ok=True, mode=0o700)
        shutil.copyfile(path, output)
        output.chmod(0o600)
    result = verify(folder, destination / 'v3')
    private_json(destination / 'verification.json', result)
    return {**result, 'persist_root': str(destination.resolve())}


def verify(folder, state):
    manifest, saved = load_verified(folder)
    actual = inventory(state)
    require(actual == manifest['inventory'], 'Restored DB rows/schema/content or R2 inventory differs')
    # Compare file bytes too; intended before launching a restored runtime.
    files = {p.relative_to(state).as_posix(): {'bytes': p.stat().st_size, 'sha256': digest(p)}
             for p in state_files(state)}
    require(files == manifest['files'], 'Restored file list/checksum differs')
    return {'ok': True, 'verified_at_utc': dt.datetime.now(dt.timezone.utc).isoformat(),
            'integrity': 'ok', 'foreign_key_errors': 0, 'file_sha256_match': True,
            'database_files': len(actual['databases']),
            'table_counts': {name: {table: entry['rows'] for table, entry in data['tables'].items()}
                             for name, data in actual['databases'].items()},
            'r2_object_list_match': True,
            'r2_object_sha256_match': True,
            'r2_objects': sum(len(rows) for rows in actual['r2_objects'].values()),
            'r2_blob_files': len(actual['r2_files'])}


def main():
    os.umask(0o077)
    parser = argparse.ArgumentParser(description=__doc__)
    commands = parser.add_subparsers(dest='command', required=True)
    create = commands.add_parser('backup')
    create.add_argument('--state', type=Path, default=DEFAULT_STATE, help='Wrangler v3 storage directory')
    create.add_argument('--output', type=Path, default=ROOT / '.local-backups')
    create.add_argument('--quiesced', action='store_true', help='Confirm ALL source writers are stopped')
    recover = commands.add_parser('restore')
    recover.add_argument('backup', type=Path)
    recover.add_argument('--destination', type=Path, required=True, help='NEW --persist-to root, must not exist')
    check = commands.add_parser('verify')
    check.add_argument('backup', type=Path)
    check.add_argument('--state', type=Path, required=True, help='Restored v3 directory, before runtime start')
    args = parser.parse_args()
    try:
        if args.command == 'backup':
            result = backup(args.state, args.output, args.quiesced)
        elif args.command == 'restore':
            result = restore(args.backup, args.destination)
        else:
            result = verify(args.backup, args.state)
        print(json.dumps(result, ensure_ascii=False, indent=2))
    except SnapshotError as error:
        print('Backup/restore refused: ' + str(error), file=sys.stderr)
        return 1
    except (ValueError, OSError, sqlite3.Error, KeyError, subprocess.SubprocessError):
        # Do not include exception strings: they may contain keys or private data.
        print('Backup/restore validation failed. Check stopped writers, paths, manifest and checksums; '
              'existing state was not overwritten.', file=sys.stderr)
        return 1
    return 0


if __name__ == '__main__':
    sys.exit(main())
