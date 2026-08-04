import { mkdir, mkdtemp, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { applyVersion, readVersions, resolveVersionInput } from "../../scripts/webstore/bump.js";
import { findVersionMismatches } from "../../scripts/webstore/verify-version.js";
import { toPackageVersion } from "../../scripts/webstore/version.js";

/**
 * Guards the one version the repo declares about itself.
 *
 * src/manifest.json, package.json and package-lock.json used to drift: the
 * manifest was bumped by hand at release time and package.json sat at 1.8.0
 * through four releases, so every build and test log announced 1.8.0 long after
 * 3.0.0 shipped. `npm run release:version -- <version>` writes all three, and
 * this test is what makes a hand-edit of one of them fail on the pull request
 * rather than at release time.
 */
describe("committed versions", () => {

    it("should agree across the manifest and the npm files", async () => {
        const versions = await readVersions();

        expect(versions.package).toBe(toPackageVersion(versions.manifest));
        expect(versions.lock).toBe(versions.package);
        expect(versions.lockPackage).toBe(versions.package);
    });
});

describe("findVersionMismatches", () => {

    const committed = {
        manifest: "3.1.0",
        package: "3.1.0",
        lock: "3.1.0",
        lockPackage: "3.1.0"
    };

    it("reports nothing when the tag matches every file", () => {
        expect(findVersionMismatches("v3.1.0", committed)).toEqual([]);
    });

    it("reports a manifest left behind by the tag", () => {
        const mismatches = findVersionMismatches("v3.2.0", committed);
        expect(mismatches).toHaveLength(3);
        expect(mismatches[0]).toMatch(/manifest\.json/);
    });

    it("reports package.json alone when only it is stale", () => {
        const mismatches = findVersionMismatches("v3.1.0", { ...committed, package: "1.8.0" });
        expect(mismatches).toHaveLength(1);
        expect(mismatches[0]).toMatch(/package\.json says "1\.8\.0"/);
    });

    it("reports a lockfile whose packages[\"\"] entry was missed", () => {
        const mismatches = findVersionMismatches("v3.1.0", { ...committed, lockPackage: "1.8.0" });
        expect(mismatches).toHaveLength(1);
        expect(mismatches[0]).toMatch(/package-lock\.json/);
    });

    it("holds package.json to the three-component form of a four-component tag", () => {
        const fourComponent = { ...committed, manifest: "3.1.0.2" };
        expect(findVersionMismatches("v3.1.0.2", fourComponent)).toEqual([]);
    });
});

describe("resolveVersionInput", () => {

    it("takes a bare version or a tag", () => {
        expect(resolveVersionInput("3.1.0")).toBe("3.1.0");
        expect(resolveVersionInput("v3.1.0")).toBe("3.1.0");
        expect(resolveVersionInput("  v3.1.0  ")).toBe("3.1.0");
    });

    it("takes Chrome's fourth component", () => {
        expect(resolveVersionInput("3.1.0.2")).toBe("3.1.0.2");
    });

    it("rejects a version too short to make a tag release.yml triggers on", () => {
        // `v3.1` does not match the workflow's `v*.*.*`, so a release cut with
        // it would push a tag and then sit there doing nothing.
        expect(() => resolveVersionInput("3.1")).toThrow(/does not match/);
        expect(() => resolveVersionInput("3")).toThrow(/does not match/);
    });

    it("rejects a prerelease suffix, which Chrome has no notion of", () => {
        expect(() => resolveVersionInput("3.1.0-rc1")).toThrow(/does not match/);
    });
});

describe("applyVersion", () => {

    /** A throwaway repo root holding the three files applyVersion rewrites. */
    async function writeFixture(version: string) {
        const root = await mkdtemp(path.join(tmpdir(), "lexin-bump-"));
        await mkdir(path.join(root, "src"));

        const write = (file: string, data: unknown) =>
            writeFile(path.join(root, file), JSON.stringify(data, null, 2) + "\n");

        await write("src/manifest.json", { manifest_version: 3, version, permissions: ["storage"] });
        await write("package.json", { name: "lexin-chrome-extension", version });
        await write("package-lock.json", {
            name: "lexin-chrome-extension",
            version,
            packages: { "": { version } }
        });

        return root;
    }

    it("writes the version into all three files and reports what they held", async () => {
        const root = await writeFixture("1.8.0");

        const result = await applyVersion("3.1.0", root);

        expect(result).toMatchObject({ manifestVersion: "3.1.0", packageVersion: "3.1.0" });
        expect(result.previous.manifest).toBe("1.8.0");
        expect(await readVersions(root)).toEqual({
            manifest: "3.1.0",
            package: "3.1.0",
            lock: "3.1.0",
            lockPackage: "3.1.0"
        });
    });

    it("keeps the manifest's fourth component out of the npm files", async () => {
        const root = await writeFixture("3.1.0");

        await applyVersion("3.1.0.2", root);

        expect(await readVersions(root)).toMatchObject({
            manifest: "3.1.0.2",
            package: "3.1.0",
            lock: "3.1.0"
        });
    });

    it("leaves every other field of the files it rewrites alone", async () => {
        const root = await writeFixture("1.8.0");

        await applyVersion("3.1.0", root);

        const manifest = JSON.parse(await readFile(path.join(root, "src", "manifest.json"), "utf-8"));
        expect(manifest.permissions).toEqual(["storage"]);
        expect(manifest.manifest_version).toBe(3);
    });

    it("rejects a version Chrome would reject, before touching a file", async () => {
        const root = await writeFixture("1.8.0");

        await expect(applyVersion("65536.0.0", root)).rejects.toThrow(/between 0 and 65535/);
        expect((await readVersions(root)).manifest).toBe("1.8.0");
    });
});
