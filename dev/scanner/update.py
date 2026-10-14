"""One-shot official signature update; no background system service."""
import subprocess
import sys
from settings import configuration, certificate_args, engine_environment


def update():
    config = configuration()
    command = [str(config['freshclam']), '--config-file=' + str(config['freshclam_config']),
               *certificate_args(config)]
    result = subprocess.run(command, env=engine_environment(config), timeout=180)
    if result.returncode:
        print('Signature update incomplete; inspection remains closed if definitions are unavailable/stale.', file=sys.stderr)
    return result.returncode


if __name__ == '__main__':
    try:
        sys.exit(update())
    except (OSError, subprocess.SubprocessError):
        print('Signature updater unavailable. Check local paths and connectivity.', file=sys.stderr)
        sys.exit(1)
