# The image the development environment - and the agent driving it - runs in.
#
# Same base as Dockerfile.test, for the same reason: it already carries the full
# Chromium build `channel: "chromium"` resolves to, at the PLAYWRIGHT_BROWSERS_PATH it
# sets itself, plus every system library that build links against. Nothing in here has
# to know anything about browsers, and `npm run test:e2e` needs no arrangement.
#
# It also ships Node 24 and npm 11 from nodesource - the same major ci.yml uses, and
# on this machine the same patch the host has. Nothing here installs or pins Node.
# Re-check that after a base bump:
#
#   docker run --rm mcr.microsoft.com/playwright:v1.62.0-noble node -v
#
# Keep this tag in lockstep with @playwright/test in package.json AND with
# Dockerfile.test. The image ships the browser set of its own version, and those
# browsers live at a root-owned /ms-playwright the dev user cannot write to - so a
# drift does not quietly download a second set here, it fails the E2E run outright.
# tests/unit/PlaywrightImagePinTests.ts turns that into a pull request failure first.
FROM mcr.microsoft.com/playwright:v1.62.0-noble

# sudo is here for one thing: chowning the node_modules volume on first create, which
# Docker hands over root-owned (see .devcontainer/post-create.sh).
#
# NOPASSWD:ALL means a process running as pwuser can become root *inside this
# container*. That is not host root: no host device, socket or filesystem outside the
# mounted workspace is reachable from here, and the Docker socket is deliberately not
# mounted. The container boundary is the one that matters - see
# docs/adr/0007-develop-in-a-container-to-sandbox-the-agent.md.
RUN apt-get update \
    && apt-get install -y --no-install-recommends sudo \
    && rm -rf /var/lib/apt/lists/* \
    && echo "pwuser ALL=(root) NOPASSWD:ALL" > /etc/sudoers.d/90-pwuser \
    && chmod 0440 /etc/sudoers.d/90-pwuser

# Every home directory devcontainer.json mounts a named volume over, created here so
# that pwuser owns it. Docker seeds a fresh named volume from whatever is at the mount
# point in the image - content *and* ownership - and creates it root-owned when there
# is nothing there. That difference is load-bearing for .vscode-server: VS Code
# installs its server into it before postCreateCommand ever runs, so a chown in that
# script is too late and the connection fails with "mkdir: cannot create directory
# '/home/pwuser/.vscode-server/bin': Permission denied".
#
# node_modules is not in this list and cannot be: it lives under the bind-mounted
# workspace, which does not exist at build time. post-create.sh chowns that one.
RUN mkdir -p /home/pwuser/.vscode-server \
             /home/pwuser/.npm \
             /home/pwuser/.claude \
             /home/pwuser/.config/gh \
    && chown -R pwuser:pwuser /home/pwuser

# The image's own account (uid 1001), reused rather than adding a second user: the
# browser directories are already world-usable, so there is nothing to re-own. The
# base image sets no USER and runs as root, which is fine for a one-shot CI container
# and not for one a person and an agent work in all day.
USER pwuser
