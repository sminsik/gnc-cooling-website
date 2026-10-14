"""Prepare local paths and private key; does not download/install system packages."""
import json
import os
import pwd
import secrets
from settings import PROJECT, configuration

os.umask(0o077)
config = configuration()
work = config['work']
work.mkdir(parents=True, exist_ok=True, mode=0o700)
work.chmod(0o700)
database = config['database']
database.mkdir(parents=True, exist_ok=True, mode=0o700)
local_libs = sorted(path for path in (work / 'clamav/usr/lib').glob('*linux-gnu') if path.is_dir())
file = work / 'scanner-config.json'
if not file.exists():
    values = {key: str(config[key]) for key in ('clamscan', 'freshclam', 'certs', 'database', 'freshclam_config')}
    values['library_dirs'] = [str(path) for path in local_libs]
    with file.open('x') as handle:
        json.dump(values, handle, indent=2)
config_file = config['freshclam_config']
if not config_file.exists():
    config_file.write_text('DatabaseDirectory ' + str(database) + '\nDatabaseOwner ' + pwd.getpwuid(os.getuid()).pw_name +
                          '\nDatabaseMirror database.clamav.net\nScriptedUpdates yes\nBytecode yes\nTestDatabases yes\n')
key_file = work / 'scanner-secret'
if not key_file.exists():
    with key_file.open('x') as handle:
        handle.write(secrets.token_hex(32) + '\n')
token = key_file.read_text().strip()
if len(token) < 32:
    raise SystemExit('Existing scanner key is invalid; no key was printed or replaced.')
for name in ('.dev.vars', '.dev.vars.c-local'):
    target = PROJECT / 'dev/scanner' / name
    if target.exists():
        entries = dict(line.split('=', 1) for line in target.read_text().splitlines() if '=' in line and not line.startswith('#'))
        if entries.get('SCANNER_TOKEN', '').strip().strip('\"\'') != token:
            raise SystemExit('Existing adapter key does not match. No private config was overwritten.')
    else:
        with target.open('x') as handle:
            handle.write('SCANNER_TOKEN=' + token + '\n')
    target.chmod(0o600)
for path in (file, config_file, key_file):
    path.chmod(0o600)
print('Local scanner paths and matching adapter key prepared. Secret values are not displayed.')
