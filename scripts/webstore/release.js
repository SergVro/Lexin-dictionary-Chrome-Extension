#!/usr/bin/env node
// Cuts a release: bumps the version files, commits, pushes, tags, pushes the
// tag - which is what starts the Chrome Web Store submission over in
// release.yml.
//
// Usage: npm run release -- <version> [options]      (3.1.0 or v3.1.0)
//
//   --no-push        bump, commit and tag locally; print the pushes to run
//   --dry-run        run the checks and print the plan, change nothing
//   --yes, -y        skip the confirmation prompt (required when not a TTY)
//   --remote=<name>  push somewhere other than origin
//
// The branch is pushed before the tag is created, so a rejected push (someone
// else got there first) leaves no tag behind to clean up - re-pull and re-run.
import { execFileSync } from "node:child_process";
import { createInterface } from "node:readline/promises";
import { applyVersion, readVersions, resolveVersionInput, REPO_ROOT } from "./bump.js";
import { compareChromeVersions } from "./version.js";

export const DEFAULT_REMOTE = "origin";
// Releases are cut from master. Anywhere else is allowed - a tag can point at
// any commit - but it is worth saying out loud before the push.
export const RELEASE_BRANCH = "master";

export function parseArgs(argv) {
  const options = { push: true, yes: false, dryRun: false, remote: DEFAULT_REMOTE };
  const positional = [];

  for (const arg of argv) {
    if (arg === "--no-push") {
      options.push = false;
    } else if (arg === "--dry-run") {
      options.dryRun = true;
    } else if (arg === "--yes" || arg === "-y") {
      options.yes = true;
    } else if (arg.startsWith("--remote=")) {
      options.remote = arg.slice("--remote=".length);
    } else if (arg.startsWith("-")) {
      throw new Error(`Unknown option "${arg}"`);
    } else {
      positional.push(arg);
    }
  }

  if (positional.length > 1) {
    throw new Error(`Expected one version, got ${positional.length}: ${positional.join(", ")}`);
  }

  options.version = positional[0];
  return options;
}

function run(args) {
  return execFileSync("git", args, { cwd: REPO_ROOT, encoding: "utf-8" }).trim();
}

/** The git surface this script needs, narrow enough for a test to stand in for. */
export function createGit(exec = run) {
  return {
    isDirty: () => exec(["status", "--porcelain"]) !== "",
    currentBranch: () => exec(["rev-parse", "--abbrev-ref", "HEAD"]),
    // `tag --list` prints nothing and exits 0 for an unknown tag, where
    // `rev-parse` would exit non-zero and throw.
    hasTag: (tag) => exec(["tag", "--list", tag]) !== "",
    hasRemoteTag: (remote, tag) => exec(["ls-remote", "--tags", remote, `refs/tags/${tag}`]) !== "",
    remoteUrl: (remote) => exec(["remote", "get-url", remote]),
    commitAll: (message) => exec(["commit", "--quiet", "--all", "--message", message]),
    createTag: (tag, message) => exec(["tag", "--annotate", tag, "--message", message]),
    // --quiet drops git's progress report, which only repeats what this script
    // logs; a failing push still writes its error to stderr.
    push: (remote, ref) => exec(["push", "--quiet", remote, ref])
  };
}

/**
 * Refuses a release the repo is not in a state to cut. Every check here is one
 * that is cheaper to fail locally than after a tag has been pushed.
 */
export function assertReadyToRelease({ version, tag, state, remote }) {
  if (state.dirty) {
    throw new Error(
      "The working tree has uncommitted changes. The release commit takes everything " +
      "tracked, so commit or stash them first."
    );
  }

  if (state.branch === "HEAD") {
    throw new Error("HEAD is detached. Check out the branch you are releasing from.");
  }

  if (compareChromeVersions(version, state.current) < 0) {
    throw new Error(
      `Version ${version} is older than the committed version ${state.current}. ` +
      "The Chrome Web Store rejects a submission that does not increment the published one."
    );
  }

  // Equal to the committed version is deliberately allowed: that is a re-run
  // after a --no-push or a rejected push, where the bump commit landed and only
  // the tag is missing. Re-releasing a version that genuinely shipped is caught
  // by the tag checks below instead - the last release left its tag behind.
  if (state.hasTag) {
    throw new Error(`Tag ${tag} already exists locally. Delete it (git tag -d ${tag}) or pick another version.`);
  }

  if (state.hasRemoteTag) {
    throw new Error(`Tag ${tag} already exists on ${remote}, so ${version} has been released already.`);
  }
}

/** The GitHub Actions page for a remote, so the run can be watched. */
export function actionsUrl(remoteUrl) {
  const match = /github\.com[:/]([^/]+\/[^/]+?)(?:\.git)?$/.exec(remoteUrl ?? "");
  return match ? `https://github.com/${match[1]}/actions` : null;
}

async function confirmOnTty(question) {
  const rl = createInterface({ input: process.stdin, output: process.stdout });
  try {
    const answer = await rl.question(`${question} [y/N] `);
    return answer.trim().toLowerCase() === "y";
  } finally {
    rl.close();
  }
}

export async function runRelease(input, options = {}, deps = {}) {
  const {
    git = createGit(),
    readCurrentVersions = readVersions,
    writeVersion = applyVersion,
    confirm = confirmOnTty,
    log = console.log
  } = deps;

  const version = resolveVersionInput(input);
  const tag = `v${version}`;
  const remote = options.remote ?? DEFAULT_REMOTE;

  const branch = git.currentBranch();
  const state = {
    dirty: git.isDirty(),
    branch,
    current: (await readCurrentVersions()).manifest,
    hasTag: git.hasTag(tag),
    hasRemoteTag: options.push ? git.hasRemoteTag(remote, tag) : false
  };

  assertReadyToRelease({ version, tag, state, remote });

  const message = `chore: release ${version}`;
  log(`Releasing ${state.current} -> ${version}`);
  log(`  commit  ${message}`);
  log(`  tag     ${tag}`);
  log(options.push ? `  push    ${branch} and ${tag} to ${remote}` : "  push    skipped (--no-push)");

  if (branch !== RELEASE_BRANCH) {
    log(`\nNote: releasing from "${branch}", not ${RELEASE_BRANCH}.`);
  }

  if (options.dryRun) {
    log("\nDry run - nothing changed.");
    return { version, tag, branch, remote, pushed: false, dryRun: true };
  }

  if (options.push && !options.yes) {
    log("\nPushing the tag submits the extension to the Chrome Web Store.");
    if (!await confirm("Continue?")) {
      log("Aborted - nothing changed.");
      return { version, tag, branch, remote, pushed: false, aborted: true };
    }
  }

  await writeVersion(version);

  // Nothing to commit means the files already carried this version - a re-run
  // after a push failed, most likely. Carry on to the tag rather than dying on
  // git's "nothing to commit".
  if (git.isDirty()) {
    git.commitAll(message);
    log(`\nCommitted ${message}`);
  } else {
    log("\nVersion files already at this version - nothing to commit.");
  }

  if (!options.push) {
    git.createTag(tag, message);
    log(`Tagged ${tag}`);
    log("\nPush when ready:");
    log(`  git push ${remote} ${branch} && git push ${remote} ${tag}`);
    return { version, tag, branch, remote, pushed: false };
  }

  // Branch first, tag second: if the branch push is rejected there is no tag to
  // undo, and a tag is the one thing here that cannot be quietly re-cut.
  git.push(remote, branch);
  log(`Pushed ${branch} to ${remote}`);

  git.createTag(tag, message);
  git.push(remote, tag);
  log(`Pushed ${tag} to ${remote} - the release workflow is running.`);

  const url = actionsUrl(git.remoteUrl(remote));
  if (url) {
    log(url);
  }

  return { version, tag, branch, remote, pushed: true };
}

async function main() {
  const options = parseArgs(process.argv.slice(2));

  if (!options.version) {
    throw new Error("Usage: npm run release -- <version> [--no-push] [--dry-run] [--yes]");
  }

  if (options.push && !options.yes && !options.dryRun && !process.stdin.isTTY) {
    throw new Error("Not a terminal, so the confirmation cannot be asked for. Re-run with --yes.");
  }

  await runRelease(options.version, options);
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((error) => {
    console.error(error.message);
    process.exit(1);
  });
}
