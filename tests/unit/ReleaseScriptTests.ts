import {
    parseArgs,
    assertReadyToRelease,
    actionsUrl,
    createGit,
    runRelease,
    DEFAULT_REMOTE
} from "../../scripts/webstore/release.js";

/**
 * `npm run release` is the one command that can put a tag on the remote, and a
 * pushed tag submits the extension to the Chrome Web Store - there is no
 * un-pushing that. So the checks in front of it, and the order it does things
 * in, are what these tests are about.
 */

/** Records what the release script asked git to do, in order. */
function fakeGit(overrides: Record<string, unknown> = {}) {
    const calls: string[] = [];
    let dirty = false;

    const git = {
        calls,
        setDirty: (value: boolean) => { dirty = value; },
        isDirty: () => dirty,
        currentBranch: () => "master",
        hasTag: () => false,
        hasRemoteTag: () => false,
        remoteUrl: () => "git@github.com:SergVro/Lexin-dictionary-Chrome-Extension.git",
        commitAll: (message: string) => { calls.push(`commit ${message}`); dirty = false; },
        createTag: (tag: string) => { calls.push(`tag ${tag}`); },
        push: (remote: string, ref: string) => { calls.push(`push ${remote} ${ref}`); },
        ...overrides
    };

    return git;
}

function fakeDeps(git = fakeGit(), current = "3.0.0") {
    const written: string[] = [];

    return {
        git,
        written,
        readCurrentVersions: async () => ({ manifest: current, package: current, lock: current, lockPackage: current }),
        writeVersion: async (version: string) => {
            written.push(version);
            git.setDirty(true);
        },
        confirm: async () => true,
        log: () => { }
    };
}

describe("parseArgs", () => {

    it("takes the version as the only positional argument", () => {
        expect(parseArgs(["3.1.0"])).toMatchObject({ version: "3.1.0", push: true, dryRun: false, yes: false });
    });

    it("defaults to pushing to origin", () => {
        expect(parseArgs(["3.1.0"]).remote).toBe(DEFAULT_REMOTE);
    });

    it("reads the flags", () => {
        const options = parseArgs(["v3.1.0", "--no-push", "--dry-run", "-y", "--remote=upstream"]);
        expect(options).toMatchObject({
            version: "v3.1.0",
            push: false,
            dryRun: true,
            yes: true,
            remote: "upstream"
        });
    });

    it("rejects an unknown flag rather than treating it as a version", () => {
        expect(() => parseArgs(["3.1.0", "--publish"])).toThrow(/Unknown option/);
    });

    it("rejects a second version", () => {
        expect(() => parseArgs(["3.1.0", "3.2.0"])).toThrow(/Expected one version/);
    });
});

describe("assertReadyToRelease", () => {

    const ready = {
        version: "3.1.0",
        tag: "v3.1.0",
        remote: "origin",
        state: { dirty: false, branch: "master", current: "3.0.0", hasTag: false, hasRemoteTag: false }
    };

    it("passes on a clean tree with an incrementing version", () => {
        expect(() => assertReadyToRelease(ready)).not.toThrow();
    });

    it("refuses to sweep uncommitted changes into the release commit", () => {
        expect(() => assertReadyToRelease({ ...ready, state: { ...ready.state, dirty: true } }))
            .toThrow(/uncommitted changes/);
    });

    it("refuses a detached HEAD, which has no branch to push", () => {
        expect(() => assertReadyToRelease({ ...ready, state: { ...ready.state, branch: "HEAD" } }))
            .toThrow(/detached/);
    });

    it("refuses a version older than the one committed", () => {
        expect(() => assertReadyToRelease({ ...ready, version: "2.9.0" })).toThrow(/older than/);
    });

    it("allows re-cutting the committed version when no tag exists for it", () => {
        // The resume case: the bump commit landed, the push did not. Refusing
        // here would leave the repo bumped with no way to finish the release.
        const resume = { ...ready, version: "3.0.0", tag: "v3.0.0" };
        expect(() => assertReadyToRelease(resume)).not.toThrow();
    });

    it("still refuses that re-cut once the tag is on the remote", () => {
        const released = {
            ...ready,
            version: "3.0.0",
            tag: "v3.0.0",
            state: { ...ready.state, hasRemoteTag: true }
        };
        expect(() => assertReadyToRelease(released)).toThrow(/released already/);
    });

    it("refuses a tag that already exists locally", () => {
        expect(() => assertReadyToRelease({ ...ready, state: { ...ready.state, hasTag: true } }))
            .toThrow(/already exists locally/);
    });

    it("refuses a version already released from the remote's point of view", () => {
        expect(() => assertReadyToRelease({ ...ready, state: { ...ready.state, hasRemoteTag: true } }))
            .toThrow(/released already/);
    });
});

describe("runRelease", () => {

    it("pushes the branch before creating the tag", async () => {
        const deps = fakeDeps();

        await runRelease("3.1.0", { push: true, yes: true }, deps);

        // A rejected branch push must not leave a tag behind: the tag is the one
        // step that cannot be quietly re-cut.
        expect(deps.git.calls).toEqual([
            "commit chore: release 3.1.0",
            "push origin master",
            "tag v3.1.0",
            "push origin v3.1.0"
        ]);
    });

    it("writes the version files before committing", async () => {
        const deps = fakeDeps();

        const result = await runRelease("v3.1.0", { push: true, yes: true }, deps);

        expect(deps.written).toEqual(["3.1.0"]);
        expect(result).toMatchObject({ version: "3.1.0", tag: "v3.1.0", pushed: true });
    });

    it("stops after tagging with --no-push", async () => {
        const deps = fakeDeps();

        const result = await runRelease("3.1.0", { push: false, yes: true }, deps);

        expect(deps.git.calls).toEqual(["commit chore: release 3.1.0", "tag v3.1.0"]);
        expect(result.pushed).toBe(false);
    });

    it("changes nothing on a dry run", async () => {
        const deps = fakeDeps();

        const result = await runRelease("3.1.0", { push: true, dryRun: true }, deps);

        expect(deps.written).toEqual([]);
        expect(deps.git.calls).toEqual([]);
        expect(result).toMatchObject({ dryRun: true, pushed: false });
    });

    it("changes nothing when the confirmation is declined", async () => {
        const deps = { ...fakeDeps(), confirm: async () => false };

        const result = await runRelease("3.1.0", { push: true }, deps);

        expect(deps.written).toEqual([]);
        expect(deps.git.calls).toEqual([]);
        expect(result).toMatchObject({ aborted: true, pushed: false });
    });

    it("does not ask for confirmation with --yes", async () => {
        const confirm = async () => { throw new Error("should not be asked"); };
        const deps = { ...fakeDeps(), confirm };

        await expect(runRelease("3.1.0", { push: true, yes: true }, deps)).resolves.toBeDefined();
    });

    it("skips the commit when the files already carry the version", async () => {
        // The resume case: a previous run bumped and committed, then the push
        // failed. Re-running must reach the tag rather than dying on git's
        // "nothing to commit".
        const deps = fakeDeps();
        deps.writeVersion = async (version: string) => { deps.written.push(version); };

        await runRelease("3.1.0", { push: true, yes: true }, deps);

        expect(deps.git.calls).toEqual(["push origin master", "tag v3.1.0", "push origin v3.1.0"]);
    });

    it("honours --remote", async () => {
        const deps = fakeDeps();

        await runRelease("3.1.0", { push: true, yes: true, remote: "upstream" }, deps);

        expect(deps.git.calls).toContain("push upstream v3.1.0");
    });

    it("releases from a branch other than master", async () => {
        const deps = fakeDeps(fakeGit({ currentBranch: () => "hotfix" }));

        await runRelease("3.1.0", { push: true, yes: true }, deps);

        expect(deps.git.calls).toContain("push origin hotfix");
    });

    it("rejects a version whose tag release.yml would not trigger on", async () => {
        // Chrome accepts "3.1"; the `v3.1` tag it becomes does not match the
        // workflow's `v*.*.*`, so pushing it would run nothing.
        await expect(runRelease("3.1", { push: false, yes: true }, fakeDeps())).rejects.toThrow(/does not match/);
    });

    it("rejects a version Chrome itself would reject", async () => {
        await expect(runRelease("65536.0.0", { push: false, yes: true }, fakeDeps()))
            .rejects.toThrow(/between 0 and 65535/);
    });

    it("touches nothing when the version is rejected", async () => {
        const deps = fakeDeps();

        await expect(runRelease("3.1", { push: false, yes: true }, deps)).rejects.toThrow();

        expect(deps.written).toEqual([]);
        expect(deps.git.calls).toEqual([]);
    });
});

describe("createGit", () => {

    it("reads emptiness from git rather than parsing its output", () => {
        const git = createGit((args: string[]) => (args[0] === "status" ? "" : "M  package.json"));
        expect(git.isDirty()).toBe(false);
        expect(createGit(() => " M package.json").isDirty()).toBe(true);
    });

    it("treats an empty `tag --list` as the tag not existing", () => {
        expect(createGit(() => "").hasTag("v3.1.0")).toBe(false);
        expect(createGit(() => "v3.1.0").hasTag("v3.1.0")).toBe(true);
    });

    it("asks the remote about the exact tag ref", () => {
        const args: string[][] = [];
        const git = createGit((argv: string[]) => { args.push(argv); return ""; });

        git.hasRemoteTag("origin", "v3.1.0");

        expect(args[0]).toEqual(["ls-remote", "--tags", "origin", "refs/tags/v3.1.0"]);
    });
});

describe("actionsUrl", () => {

    it("derives the Actions page from an SSH remote", () => {
        expect(actionsUrl("git@github.com:SergVro/Lexin-dictionary-Chrome-Extension.git"))
            .toBe("https://github.com/SergVro/Lexin-dictionary-Chrome-Extension/actions");
    });

    it("derives it from an HTTPS remote", () => {
        expect(actionsUrl("https://github.com/SergVro/Lexin-dictionary-Chrome-Extension"))
            .toBe("https://github.com/SergVro/Lexin-dictionary-Chrome-Extension/actions");
    });

    it("returns null for a remote it cannot read, rather than a broken link", () => {
        expect(actionsUrl("git@gitlab.com:someone/something.git")).toBeNull();
        expect(actionsUrl(undefined)).toBeNull();
    });
});
