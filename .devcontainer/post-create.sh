#!/usr/bin/env bash
# Runs once, when the container is created (postCreateCommand in devcontainer.json),
# as pwuser.
#
# The node_modules volume is the reason most of this exists: Docker creates it empty
# and owned by root:root, so npm ci would fail with EACCES on the mount point itself.
# It cannot be pre-created in the image the way the home directories are, because it
# lives under the bind-mounted workspace, which does not exist at build time.
#
# Only the mount point needs this, not the tree underneath it. The home-directory
# volumes are handled in the Dockerfile - they have to be, because VS Code writes to
# .vscode-server before this script gets to run.
set -euo pipefail

cd "$(dirname "$0")/.."

if [ ! -w node_modules ]; then
    sudo chown "$(id -u):$(id -g)" node_modules
fi

# The container's own dependency tree, from the same lockfile the host uses. This is
# what picks @typescript/typescript-linux-arm64, @esbuild/linux-arm64,
# @rolldown/binding-linux-arm64-gnu and lightningcss-linux-arm64-gnu instead of the
# darwin-arm64 packages sitting - untouched, and still working for the host - in the
# host's node_modules underneath this volume.
npm ci

# The workspace is a bind mount, so its files carry a uid this container knows nothing
# about; without this git refuses to touch the repo ("dubious ownership").
git config --global --add safe.directory "$PWD"

# Leaves the container ready for `npx playwright test`, and proves the toolchain on
# the way: tsc (native TypeScript 7) and esbuild both have to load their linux-arm64
# binaries to get through this line.
npm run build

# Deliberately no `npx playwright install`. Dockerfile.test carries it as a safety net
# for a drifted image tag; here it would be worse than useless, because the browsers
# live at a root-owned /ms-playwright that pwuser cannot write to. A drift should fail
# loudly at that point rather than download a second browser set into the home
# directory on every create - and tests/unit/PlaywrightImagePinTests.ts should have
# failed on the pull request long before.
