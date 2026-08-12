# Develop in a container, so an agent's mistakes stop at the repo

Most work on this extension now goes through AI coding agents. The branch list says so
plainly — `codex/code-scan`, `codex/fix-history-race`,
`cursor/modernize-build-and-update-extensions-2465`, `feat/claude-github-action` — and
`.claude/settings.local.json` has grown to seventy-nine allow rules, each one a command
somebody decided not to be asked about again.

Every one of those commands ran on the host, as the user who owns the machine. An agent
with a shell has `~/.ssh`, `~/.config/gcloud`, the login keychain, every other checkout
under `~/Developer`, the host Docker daemon, and `rm`. Nothing in this repo confined it,
and the allowlist is not a confinement — it is a list of things nobody wants to confirm
twice.

`.devcontainer/` moves the development loop into a container so that the blast radius of
a mistake is this checkout plus a disposable Linux environment, rather than the machine.
The hard requirement was that the **Playwright E2E suite runs inside it**: a sandbox the
extension cannot be tested in would just push the interesting work back onto the host,
and the sandbox would be theatre.

## What it protects, and what it does not

An oversold sandbox is worse than none, so this list is the ADR.

**Protected.** The host filesystem outside this repo — `~/.ssh`, `~/.aws`,
`~/.config/gcloud`, `~/Library`, every other checkout, `/etc`, `/usr/local`. The macOS
keychain, which has no API surface from Linux, so a stolen credential helper is inert.
Host global npm and Homebrew installs, and `~/.npmrc`. Host processes, `launchd`, the
GUI, and the browser profiles that are not in this repo. And the **host Docker
daemon**: `/var/run/docker.sock` is deliberately not mounted, because a container that
can talk to the host daemon can start a privileged container with the host root
filesystem attached — mounting that socket does not weaken this sandbox, it deletes it.

**Not protected**, and this half is the point:

- **The working tree and `.git/`.** Bind-mounted read-write, which is the entire reason
  the container is useful. An agent can still `rm -rf src/`, rewrite history, or add a
  malicious dependency to `package.json`. Git and a habit of committing are the
  mitigation; the container is not.
- **Outbound network.** Unrestricted, by choice — see *The firewall not built*.
- **Push.** Git credentials are forwarded, by choice — see *Credentials*.
- **Container root.** `pwuser` has passwordless `sudo`, needed to take ownership of the
  `node_modules` volume on first create. Anything "hardened" inside the container is
  therefore advisory. The boundary that carries weight is the container itself.
- **Chromium's own sandbox.** Playwright launches with `chromiumSandbox: false`, so the
  browser rendering live pages from the internet is confined only by the container.
  This was already true of `Dockerfile.test`; it is why that image runs as root.
- **A Docker Desktop VM escape.** Low probability, total impact. The residual.

One line, if the rest is forgotten: **this protects the machine, not the repository.**

## Why the Playwright image

`.devcontainer/Dockerfile` is `FROM mcr.microsoft.com/playwright:v1.62.0-noble` plus
`sudo` and a `USER` line. It is the same base `Dockerfile.test` uses, and the choice
makes the hard requirement a non-event: the image already carries the *full* Chromium
build that `channel: "chromium"` resolves to — the thing `playwright.config.ts` calls
load-bearing, because the headless shell loads no extensions at all — at the
`PLAYWRIGHT_BROWSERS_PATH` it sets itself, along with every system library that build
links against. It also ships Node 24 and npm 11 from nodesource, which is the major
`ci.yml` uses and, on the machine this was written on, the same patch as the host.

The alternative was a generic `typescript-node:24` image plus
`npx playwright install --with-deps chromium`: a half-gigabyte browser download and an
apt dependency install on every image build, for a browser set this repo already proves
works, and with no fidelity to the image CI runs.

The cost is a third place naming the Playwright version — `@playwright/test` in
`package.json`, and a `FROM` line in each of the two Dockerfiles. That is deliberate,
and it is the same shape as the extension version living in three files:
`tests/unit/PlaywrightImagePinTests.ts` fails the pull request when they disagree, the
way `tests/unit/VersionSyncTests.ts` does. Folding both images into one multi-stage file
was the alternative; it was rejected because the two have opposite ideas about the most
basic question — whether the source is baked into the image — and because `test.yml` and
`scripts/run-tests-docker.sh` both build `Dockerfile.test` with no `--target`, which
would make stage ordering a load-bearing, invisible constraint.

## Why `node_modules` cannot be shared

`package-lock.json` carries seventy-three platform-constrained optional packages:
`@typescript/typescript-darwin-arm64` and its linux siblings, `@esbuild/*`,
`@rolldown/binding-*`, `lightningcss-*`. The host tree holds the darwin builds. Sharing
it into a Linux container breaks `tsc`, `esbuild` and Vitest's rolldown — that is, the
build, the type check and the unit tests.

So a named volume is mounted over `${containerWorkspaceFolder}/node_modules`, and
`post-create.sh` runs `npm ci` inside. The volume shadows the path *inside the
container's mount namespace only*: the host's `node_modules/` is not renamed, hidden or
emptied, and the container never reads a byte of it. That is what keeps `npm run dev`
and `npm run store-assets` working on the host with no setup at all, and it is why the
GUI workflows below cost nothing to leave there.

The price is one rule, which is written into `Readme.md` and `agents.md` because nothing
enforces it: **change a dependency in the container and the host tree is stale until it
runs its own `npm ci`.** Nothing fails loudly when that is forgotten; the host simply
keeps building against yesterday's dependencies.

`dist/`, `test-results/` and `playwright-report/` deliberately stay on the bind mount.
All three are platform-independent output, so a build made in the container loads
straight into host Chrome by way of *Load unpacked*, the E2E fixture's
`path.resolve(__dirname, "../../dist")` needs no adjustment, and the host can open an
HTML report the container produced.

`~/.claude` is a named volume rather than a bind mount of the host's, which costs one
`claude login` per volume and is worth it: settings in that directory can carry hooks,
and hooks execute on the **host**, under the host's Claude Code. Sharing the directory
would hand anything inside this container a documented way to run commands on the
machine the container exists to protect.

## Credentials

Dev Containers copies the host `~/.gitconfig`, wires a credential helper back to the
host, and forwards the SSH agent. All of that was left on. An agent in the container can
therefore commit *and push*, which is the point — unattended work that cannot open a
pull request is not much use.

The thing that must not follow from it is a release. `scripts/webstore/release.js`
commits, tags, and pushes **branch and tag** to `origin`; a `v*.*.*` tag makes
`release.yml` publish to the Chrome Web Store over Workload Identity Federation. It
prompts only when `process.stdin.isTTY`, and `--yes` skips even that. One command,
straight to production, from a session nobody is watching.

`.claude/settings.json` — the first committed Claude settings file in this repo — denies
that path: `npm run release`, both webstore scripts, `git tag`, `--tags` and force
pushes. Deny beats allow, so it overrides the personal allowlist in
`settings.local.json`, which stays untracked and allow-only.

Be clear about what that is worth. It stops the accident, not a determined agent —
nothing there prevents `git push origin HEAD:refs/tags/v3.4.0` — and only Claude Code
reads the file, so Codex and Cursor are unaffected by it. **Releases are cut from a host
terminal, by hand.** The deny list is a guard rail on the way there, not the fence.

## Why the GUI workflows stayed outside

`npm run dev`, `npm run store-assets` and `npx playwright test --headed|--debug|--ui`
all need a real window. They stay on the host, and a `desktop-lite` feature with noVNC
on port 6080 was considered and not taken.

The strongest reason is correctness, not convenience. `scripts/store-assets/capture.mjs`
renders real UI with the token layer's system font stack, and a Linux container has
DejaVu where macOS has SF Pro. Every screenshot and promo tile submitted to the store
would silently change typeface, and nothing would catch it —
`tests/unit/StoreScreenshotPngTests.ts` checks the PNG encoding, not the pixels. That
workflow is host-only on the merits.

`npm run dev` is a human loop whose value is a real Chrome window, settings persisted in
`.chrome-dev-profile/`, and bookmarkable `chrome-extension://<id>/…` URLs. The extension
ID is derived from the path to `dist/`, which differs in the container, so even the
printed URLs would not be the host's bookmarks. Over noVNC it would be a laggy
1280×720 approximation of something that already works.

For an agent debugging a visual regression, the answer is the artefacts the headless
suite already produces — `screenshot`, `video` and `trace`, all `retain-on-failure`,
all landing in `test-results/` on the bind mount where an agent can read them.

`npm run test:e2e:docker` is host-only for a different reason: the only way to make it
work inside is to mount the host Docker socket, and that deletes the sandbox. Reproduce
a CI failure from a host terminal.

## The firewall not built

The reference implementation of this pattern adds an `iptables` + `ipset` egress
allowlist, and it was considered. The domains this repo needs are short and knowable:
`registry.npmjs.org`, the GitHub hosts, `api.anthropic.com` and friends, the VS Code
marketplace, and the two dictionaries the E2E suite really calls — `lexin.nada.kth.se`
and `folkets-lexikon.csc.kth.se`.

It was not built, for three reasons worth recording so the decision can be revisited
rather than rediscovered:

- **It breaks agent research.** `.claude/settings.local.json` already carries six
  `WebFetch(domain:…)` rules. A question about TypeScript 7 or Playwright mid-task would
  fail until somebody edits an allowlist and restarts the container.
- **DNS-based allowlists are leaky in both directions.** The `ipset` is filled once, at
  start, from resolved A records. CDN-fronted hosts rotate addresses, so allowed things
  break; they also share addresses with everything else on the same CDN, so blocked
  things get through.
- **`sudo` undoes it in one command.** Making it real means narrowing the sudoers rule
  to the firewall script alone, which costs `apt-get install` inside the container.

And none of it addresses the thing most likely to be damaged, which is the working tree.
If it is ever wanted, it is additive: `--cap-add=NET_ADMIN --cap-add=NET_RAW`, a
`postStartCommand`, an init script, and the narrow sudoers line replacing — not joining
— the broad one.

## Consequences

- The container is the primary development environment. `npm run build`, `lint`,
  `typecheck`, `test` and `test:e2e` all run in it; `dev`, `store-assets`, the headed
  Playwright modes, `test:e2e:docker` and `release` run on the host. `Readme.md` carries
  the table and `agents.md` carries the same list, because that is the file an agent
  reads before trying one of them.
- The container does **not** set `CI`. Runs therefore reuse an existing server, get no
  retries and no `github` reporter — unlike `Dockerfile.test`, which exists precisely to
  reproduce those. Two images, two jobs, one pin; `DOCKER_TESTING.md` draws the line.
- Two dependency trees now exist for one lockfile, and keeping the host's fresh is a
  manual step nobody is reminded to take.
- The E2E suite still makes live, unmocked calls to KTH from inside the container, which
  is what proves outbound HTTPS works — and means a red run can be the network rather
  than the code, exactly as ADR 0003 describes.
- Reversing all of it is deleting `.devcontainer/`, deleting
  `tests/unit/PlaywrightImagePinTests.ts`, deleting `.claude/settings.json`, and
  `docker volume rm` on the five `lexin-*` volumes. Nothing in `src/`, the build, or CI
  depends on any of it.
