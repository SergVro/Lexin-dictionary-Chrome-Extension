#!/usr/bin/env bash
# Runs once, when the container is created (postCreateCommand in devcontainer.json),
# as pwuser.
#
# Almost all of it is about the named volumes: Docker creates every one of them empty
# and owned by root:root, because none of these paths exists in the image for it to
# copy ownership from. Until they are handed over, `npm ci` fails twice - once on
# node_modules, once on the cache directory, with the misleading "your cache folder
# contains root-owned files, due to a bug in previous versions of npm".
#
# Only the mount points need this, not the trees underneath them.
set -euo pipefail

cd "$(dirname "$0")/.."

for volume in \
    node_modules \
    "$HOME/.npm" \
    "$HOME/.claude" \
    "$HOME/.config/gh" \
    "$HOME/.vscode-server"
do
    if [ -d "$volume" ] && [ ! -w "$volume" ]; then
        sudo chown "$(id -u):$(id -g)" "$volume"
    fi
done

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
