#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."

# No package installation is needed. Ops supplies the locked Node executable.
node_executable="${NODE_EXECUTABLE:-node}"
"$node_executable" scripts/validate.mjs
"$node_executable" --test scripts/validate.test.mjs
git diff --check
