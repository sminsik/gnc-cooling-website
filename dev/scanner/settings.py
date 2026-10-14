"""Local paths only; preserves the original macOS work directory by default."""
import json
import os
from pathlib import Path
import shutil
import sys

PROJECT = Path(__file__).resolve().parents[2]
LEGACY_WORK = PROJECT.parent / '.work/c-local'


def work_directory():
    default = LEGACY_WORK if sys.platform == 'darwin' else PROJECT / '.local-scanner'
    return Path(os.environ.get('SCANNER_WORK_DIR', default)).expanduser().resolve()


def configuration():
    work = work_directory()
    file = work / 'scanner-config.json'
    config = json.loads(file.read_text()) if file.exists() else {}
    mac = work / 'clamav-expanded/clamav-1.5.4.macos.universal-programs.pkg/Payload/usr/local/clamav'
    linux = work / 'clamav'
    defaults = {
        'clamscan': mac / 'bin/clamscan' if sys.platform == 'darwin' else linux / 'usr/bin/clamscan',
        'freshclam': mac / 'bin/freshclam' if sys.platform == 'darwin' else linux / 'usr/bin/freshclam',
        'certs': mac / 'etc/certs' if sys.platform == 'darwin' else linux / 'etc/clamav/certs',
        'database': work / 'clamav-db',
        'freshclam_config': work / 'freshclam.conf',
    }
    for key, default in defaults.items():
        value = os.environ.get('SCANNER_' + key.upper()) or config.get(key) or default
        # Explicit absolute paths, or commands available on PATH, both work.
        config[key] = Path(shutil.which(str(value)) or value).expanduser().resolve()
    config['work'] = work
    config['library_dirs'] = [str(Path(p).expanduser().resolve()) for p in config.get('library_dirs', [])]
    return config


def engine_environment(config):
    env = dict(os.environ)
    if config['library_dirs']:
        variable = 'DYLD_LIBRARY_PATH' if sys.platform == 'darwin' else 'LD_LIBRARY_PATH'
        env[variable] = os.pathsep.join(config['library_dirs'] + ([env[variable]] if env.get(variable) else []))
    if config['certs'].is_dir():
        env['CVD_CERTS_DIR'] = str(config['certs'])
    return env


def certificate_args(config):
    return ['--cvdcertsdir=' + str(config['certs'])] if config['certs'].is_dir() else []
