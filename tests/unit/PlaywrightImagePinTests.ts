import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");

/** Every file that names a mcr.microsoft.com/playwright image tag. */
const IMAGES = [
    "Dockerfile.test",
    path.join(".devcontainer", "Dockerfile")
];

/**
 * Guards the Playwright version the repo declares three times.
 *
 * @playwright/test in package.json is what the suite runs against. Two Docker images
 * say it again in a FROM tag - Dockerfile.test, which reproduces the CI run, and
 * .devcontainer/Dockerfile, which is the development environment - because the image
 * ships the browser set of its own version.
 *
 * When they drift, a run stops being the run CI does. In the CI image the
 * `npx playwright install chromium` safety net downloads a second browser set on
 * every build; in the dev container it cannot, because /ms-playwright is root-owned,
 * so the E2E suite fails outright on a container someone has to rebuild to fix.
 *
 * Same shape as the version guard in VersionSyncTests.ts, and for the same reason:
 * the constant is deliberately repeated across files that cannot import each other,
 * so a test is what makes a hand-edit of one of them fail on the pull request.
 *
 * A failure here means: bump @playwright/test and both FROM lines, in one commit.
 */
describe("the Playwright image pin", () => {

    /** The version @playwright/test is pinned to, verbatim. */
    async function packagePin(): Promise<string> {
        const contents = await readFile(path.join(REPO_ROOT, "package.json"), "utf-8");
        return JSON.parse(contents).devDependencies["@playwright/test"];
    }

    /** The version out of `FROM mcr.microsoft.com/playwright:v1.62.0-noble`. */
    async function imagePin(file: string): Promise<string> {
        const contents = await readFile(path.join(REPO_ROOT, file), "utf-8");
        const match = contents.match(/^FROM\s+mcr\.microsoft\.com\/playwright:v([\d.]+)-noble\s*$/m);

        if (!match) {
            throw new Error(`${file} has no pinned mcr.microsoft.com/playwright FROM line`);
        }

        return match[1];
    }

    it("is exact in package.json, so the images have something to match", async () => {
        // A range here ("^1.62.0") would let a fresh npm ci pull a Playwright the
        // images' browsers do not belong to, without changing a single file - and
        // without failing the check below either.
        expect(await packagePin()).toMatch(/^\d+\.\d+\.\d+$/);
    });

    it.each(IMAGES)("matches @playwright/test in %s", async (file) => {
        expect(await imagePin(file)).toBe(await packagePin());
    });
});
