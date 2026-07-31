import {
    parseTagVersion,
    validateChromeVersion,
    resolveReleaseVersion,
    compareChromeVersions
} from "../../scripts/webstore/version.js";

describe("parseTagVersion", () => {

    it("accepts a vX.Y.Z tag", () => {
        expect(parseTagVersion("v2.0.1")).toBe("2.0.1");
    });

    it("accepts a vX.Y.Z.W tag", () => {
        expect(parseTagVersion("v2.0.1.5")).toBe("2.0.1.5");
    });

    it("rejects a tag without the leading v", () => {
        expect(() => parseTagVersion("2.0.1")).toThrow(/does not match/);
    });

    it("rejects a two-component tag", () => {
        expect(() => parseTagVersion("v2.0")).toThrow(/does not match/);
    });

    it("rejects a five-component tag", () => {
        expect(() => parseTagVersion("v2.0.1.5.9")).toThrow(/does not match/);
    });

    it("rejects a tag with a pre-release suffix", () => {
        expect(() => parseTagVersion("v2.0.1-rc1")).toThrow(/does not match/);
    });

    it("rejects a non-string tag", () => {
        // @ts-expect-error exercising runtime guard against non-string input
        expect(() => parseTagVersion(undefined)).toThrow(/must be a string/);
    });
});

describe("validateChromeVersion", () => {

    it("accepts a minimal single-component version", () => {
        expect(validateChromeVersion("1")).toBe("1");
    });

    it("accepts a four-component version", () => {
        expect(validateChromeVersion("2.0.1.5")).toBe("2.0.1.5");
    });

    it("accepts the maximum component value", () => {
        expect(validateChromeVersion("65535.0.0")).toBe("65535.0.0");
    });

    it("accepts a lone zero component alongside non-zero components", () => {
        expect(validateChromeVersion("0.1.0.0")).toBe("0.1.0.0");
    });

    it("rejects more than four components", () => {
        expect(() => validateChromeVersion("1.2.3.4.5")).toThrow(/1 to 4 components/);
    });

    it("rejects a component above 65535", () => {
        expect(() => validateChromeVersion("65536.0.0")).toThrow(/between 0 and 65535/);
    });

    it("rejects a negative component", () => {
        expect(() => validateChromeVersion("1.-1.0")).toThrow(/non-negative integer/);
    });

    it("rejects a non-numeric component", () => {
        expect(() => validateChromeVersion("1.a.0")).toThrow(/non-negative integer/);
    });

    it("rejects a component with a leading zero", () => {
        expect(() => validateChromeVersion("1.02.0")).toThrow(/leading zero/);
    });

    it("rejects an all-zero version", () => {
        expect(() => validateChromeVersion("0.0.0.0")).toThrow(/must not be all zero/);
    });
});

describe("resolveReleaseVersion", () => {

    it("parses and validates a well-formed tag", () => {
        expect(resolveReleaseVersion("v2.0.1")).toBe("2.0.1");
    });

    it("rejects a well-formed tag whose version violates Chrome's rules", () => {
        expect(() => resolveReleaseVersion("v65536.0.0")).toThrow(/between 0 and 65535/);
    });
});

describe("compareChromeVersions", () => {

    it("treats equal versions as equal", () => {
        expect(compareChromeVersions("2.0.1", "2.0.1")).toBe(0);
    });

    it("treats a missing trailing component as zero", () => {
        expect(compareChromeVersions("2.0.1", "2.0.1.0")).toBe(0);
    });

    it("orders by the first differing component", () => {
        expect(compareChromeVersions("2.0.2", "2.0.10")).toBeLessThan(0);
    });

    it("reports when the first version is newer", () => {
        expect(compareChromeVersions("2.1.0", "2.0.99")).toBeGreaterThan(0);
    });
});
