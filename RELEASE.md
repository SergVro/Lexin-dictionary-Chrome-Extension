# Releasing to the Chrome Web Store

Releases are tag-driven. Pushing a `vX.Y.Z` (or `vX.Y.Z.W`) tag runs
[`.github/workflows/release.yml`](.github/workflows/release.yml), which reuses
the same lint/test/build gate ([`ci.yml`](.github/workflows/ci.yml)) and Docker
E2E suite ([`test.yml`](.github/workflows/test.yml)) as ordinary CI runs - both
are declared with `workflow_call` so `release.yml` calls them as jobs instead
of duplicating their steps - then packages a deterministic ZIP, authenticates
to Google Cloud via OIDC (no stored service-account key), submits the package
to the Chrome Web Store API v2 for automatic publication once Google's review
succeeds, and publishes a GitHub release for the tag.

## Cutting a release

**From a host terminal, by hand — never from the dev container.** One command here
pushes a tag, and that tag publishes to the store; `.claude/settings.json` denies the
whole path to agents for that reason. See
[ADR 0007](docs/adr/0007-develop-in-a-container-to-sandbox-the-agent.md).

```bash
npm run release -- 2.0.1
```

That is the whole thing. From a clean tree on the branch you are releasing,
[`scripts/webstore/release.js`](scripts/webstore/release.js) writes the version
into `src/manifest.json`, `package.json` and `package-lock.json`, commits it as
`chore: release 2.0.1`, pushes the branch, tags `v2.0.1` and pushes the tag -
which is what starts everything in `release.yml`. It prints the plan and asks
before pushing, since the push is the point of no return.

| | |
|---|---|
| `--dry-run` | run the checks, print the plan, change nothing |
| `--no-push` | bump, commit and tag locally; print the pushes to run |
| `--yes`, `-y` | skip the confirmation (required when stdin is not a terminal) |
| `--remote=<name>` | push somewhere other than `origin` |

Pick a version higher than both the version currently in `src/manifest.json`
and whatever is already published to the store; the workflow's Chrome Web Store
preflight rejects non-incrementing versions.

Before touching anything it refuses to go on if the working tree is dirty (the
release commit would sweep the changes in), if `HEAD` is detached, if the
version is older than the committed one, or if the tag already exists locally
or on the remote. The branch is pushed *before* the tag is created, so a
rejected push - someone else got there first - leaves no tag to clean up: pull,
and run the same command again. Re-running after a `--no-push` or a failed push
is expected to work; it notices the version files are already right, skips the
commit, and goes on to the tag.

`npm run release:version -- 2.0.1`
([`scripts/webstore/bump.js`](scripts/webstore/bump.js)) writes those three
files and stops, for when you want to commit and tag by hand.

The bump lands before the tag either way, so the tag names a commit that
already agrees with what is being released. The workflow's first job
([`scripts/webstore/verify-version.js`](scripts/webstore/verify-version.js))
compares the tag against those committed files and fails the release in seconds
if they disagree. A unit test checks the same three files against each other on
every pull request, so a hand-edit of one of them surfaces long before a
release.

Keeping `package.json` in step is not cosmetic: npm prints it at the head of
every script it runs, so a stale one has every build and test log announcing a
version the extension left behind releases ago.

Chrome allows a fourth version component and npm does not, so a `vX.Y.Z.W` tag
puts `X.Y.Z.W` in the manifest and `X.Y.Z` in the npm files.

Packaging still stamps the tag's version into `dist/manifest.json` itself and
never reads the committed one, so the ZIP matches its tag no matter what.
`src/manifest.json` is never touched by the workflow.

The GitHub release page appears as soon as the store accepts the submission,
which is earlier than the extension going live - Google publishes it
automatically hours to days later, once review passes, and the release notes
say so. In the rare case a submission is rejected, delete that release by hand
(`gh release delete v2.0.1`) and cut a new version.

Its notes are generated from the titles of the pull requests merged since the
previous release, so PR titles are what readers of the release page see.

## One-time setup

Most of this is scripted. [`scripts/webstore/setup-wif.sh`](scripts/webstore/setup-wif.sh)
creates the Google Cloud project, the publisher service account, the workload
identity pool and its GitHub OIDC provider, then the protected GitHub
environment and the variables the workflow reads. Every step checks before it
acts, so the script is safe to re-run:

```bash
CWS_PUBLISHER_ID=<publisher id> CWS_EXTENSION_ID=<extension id> \
  bash scripts/webstore/setup-wif.sh
```

It needs `gcloud` and `gh` installed and authenticated as an account that can
create Google Cloud projects and administer this repository. Names and IDs are
overridable through the environment - see section 0 of the script. Steps 2 and
6 below are dashboard-only and have no API; everything else the script handles.

1. **Google Cloud project and APIs** - scripted. Enables `iam`,
   `iamcredentials`, `sts`, `chromewebstore` and `cloudresourcemanager`.
   `iamcredentials` is the one that backs the workflow's `token_format:
   access_token`, and is easy to miss.
2. **Link the service account to the publisher** - *manual*. The script
   creates the account; add its email under the Chrome Web Store Developer
   Dashboard's Account section yourself. Only one service account can be
   linked to a publisher at a time. Skipping this is silent until release
   time: authentication succeeds and the upload then fails with a 403.
   ([service-account setup](https://developer.chrome.com/docs/webstore/service-accounts))
3. **Workload Identity Federation** - scripted; see the table below for what
   it grants. This is what avoids storing a long-lived JSON key in GitHub.
   ([GitHub OIDC guidance](https://docs.github.com/en/actions/how-tos/secure-your-work/security-harden-deployments/oidc-in-google-cloud-platform))
4. **Protected GitHub environment** - scripted. Creates
   `chrome-web-store-production` with a required-reviewer rule and a `v*.*.*`
   tag deployment policy, so no branch can deploy to it.
5. **Environment variables** on that environment (Settings → Environments →
   chrome-web-store-production → Variables - not secrets, none of these are
   sensitive on their own). The script sets the first three unconditionally
   and the last two only if you pass them in:
   - `GCP_PROJECT_ID`
   - `GCP_WIF_PROVIDER` - the full workload identity provider resource name
   - `GCP_SERVICE_ACCOUNT` - the service account email to impersonate
   - `CWS_PUBLISHER_ID`
   - `CWS_EXTENSION_ID`
6. **For a brand-new store item** - *manual*. Create it in the Developer
   Dashboard and complete its Store Listing, Privacy, and visibility settings
   once. The API's upload endpoint only updates an existing item - it cannot
   create one.

### What the federation grants

| | |
|---|---|
| Issuer | `https://token.actions.githubusercontent.com` |
| Mapped attributes | `google.subject`, `repository`, `repository_owner`, `ref`, `environment`, `actor` |
| Condition | this repo (by numeric ID) **and** `ref_type == 'tag'` **and** `ref` starts with `refs/tags/v` **and** `environment == 'chrome-web-store-production'` |
| Grant | `roles/iam.workloadIdentityUser` on the service account, to `principalSet://.../attribute.repository/SergVro/Lexin-dictionary-Chrome-Extension` |

Two choices in there are deliberate. The condition matches on the numeric
`repository_id` and `repository_owner_id` rather than the string names,
because names are reusable after a rename and the numeric IDs are not. And the
grant is bound to `attribute.repository` rather than to the subject, because a
job that declares an environment gets a `sub` of
`repo:OWNER/REPO:environment:NAME` instead of the ref form - a subject-based
binding would be needlessly brittle.

Google requires an attribute condition for shared issuers like GitHub. Without
one it refuses to create the provider, since otherwise any repository on GitHub
could mint tokens against this project.

### Verifying the setup

```bash
gcloud iam workload-identity-pools providers describe github-actions \
  --location=global --workload-identity-pool=github \
  --project="$GCP_PROJECT_ID" \
  --format='yaml(state,attributeCondition,attributeMapping)'

gcloud iam service-accounts get-iam-policy "$GCP_SERVICE_ACCOUNT"

gh variable list --env chrome-web-store-production
```

Section 10 of the script prints all three at the end of a run. Note that the
attribute condition itself is only truly exercised by a real tag push, so the
first release doubles as the test of the OIDC path.

## What the workflow does

1. Checks the tag against the versions committed to the repo
   (`scripts/webstore/verify-version.js`). It runs on its own, before
   everything else, so a tag pushed without `npm run release:version` costs
   seconds rather than a full E2E run.
2. Calls `ci.yml` (lint, unit tests, build) and `test.yml` (Docker-based
   Playwright E2E suite) as reusable workflow jobs - the exact same gates as
   ordinary CI, defined once and shared rather than duplicated. Only once both
   succeed does the `publish` job rebuild `dist/` (needed locally to package
   it) and continue.
3. Packages `dist/` into `lexin-extension-<version>.zip` with `manifest.json`
   at the root (`scripts/webstore/package.js`), plus a `.sha256` checksum.
   Two builds from the same commit and tag produce byte-identical ZIPs.
4. Inspects the ZIP (`scripts/webstore/inspect-zip.js`) to confirm the
   expected top-level files are present and the manifest version matches the
   tag.
5. Uploads the ZIP and checksum as a workflow artifact for audit/debugging.
6. Authenticates to Google Cloud via `google-github-actions/auth`, requesting
   a short-lived `chromewebstore`-scoped access token (`token_format:
   access_token`, `create_credentials_file: false`) - no JSON key ever touches
   the runner.
7. Runs a Chrome Web Store preflight (`scripts/webstore/chrome-web-store.js`'s
   `fetchStatus` / `assertReleasable`) that blocks the release if the item has
   been taken down, is under an active policy warning, already has a submission
   awaiting review, or the target version does not increment the published one.
8. Uploads the package via the v2 `media.upload` endpoint, polling with a
   bounded number of attempts if the API reports `UPLOAD_IN_PROGRESS`.
9. Submits the item for publication via the v2 `publish` endpoint
   (`publishType: DEFAULT_PUBLISH`, `blockOnWarnings: true`). Google publishes
   it automatically once review succeeds - the workflow's job succeeding means
   "accepted and submitted for review", not "live in the store".
10. Writes a job summary with the version, checksum, extension ID, and
    returned submission state. Credentials are never printed.
11. In a separate `github-release` job, downloads that artifact and creates the
    GitHub release for the tag with auto-generated notes and the ZIP and its
    checksum attached, so the exact submitted package outlives the 90-day
    artifact retention.

    It is a distinct job on purpose. The store submission is not repeatable -
    the preflight in step 7 blocks a second upload while the first still awaits
    review - so if release creation were a step on the publish job, a transient
    GitHub API failure would be unrecoverable: GitHub re-runs whole jobs, and
    the retry would fail at the store step before ever reaching it. Split out,
    "Re-run failed jobs" replays only this job. It also re-uploads the assets
    rather than failing if the release already exists.

The release job runs under the `chrome-web-store-production` environment with
a non-cancelling concurrency group, so two tag pushes can't race each other
into overlapping submissions.
