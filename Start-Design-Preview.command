#!/bin/bash
cd -- "$(dirname -- "$0")" || exit 1
if ! command -v node >/dev/null; then
  bundled_node="$HOME/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin"
  if [ -x "$bundled_node/node" ]; then
    export PATH="$bundled_node:$PATH"
  fi
fi
if ! command -v node >/dev/null || ! node -e 'process.exit(Number(process.versions.node.split(".")[0])>=24?0:1)'; then
  echo 'Node.js 24 이상이 필요합니다. 프로젝트 권장 버전은 24.21.0입니다.'
  read -r -p 'Enter 키로 닫기' unused
  exit 1
fi
node scripts/dev-design.mjs --open
