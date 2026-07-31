import { assertReleasable } from "../../scripts/webstore/chrome-web-store.js";

function publishedStatus(crxVersion: string) {
    return {
        publishedItemRevisionStatus: {
            state: "PUBLISHED",
            distributionChannels: [{ deployPercentage: 100, crxVersion }]
        }
    };
}

describe("assertReleasable", () => {

    it("allows a version that increments the published version", () => {
        expect(() => assertReleasable(publishedStatus("2.0.0"), "2.0.1")).not.toThrow();
    });

    it("allows the first-ever release with no publish history", () => {
        expect(() => assertReleasable({}, "2.0.1")).not.toThrow();
    });

    it("rejects a taken-down item", () => {
        expect(() => assertReleasable({ takenDown: true }, "2.0.1")).toThrow(/taken down/);
    });

    it("rejects a warned item", () => {
        expect(() => assertReleasable({ warned: true }, "2.0.1")).toThrow(/policy warning/);
    });

    it("rejects when a submission is already awaiting review", () => {
        const status = {
            submittedItemRevisionStatus: { state: "SUBMITTED" }
        };
        expect(() => assertReleasable(status, "2.0.1")).toThrow(/awaiting review/);
    });

    it("rejects a version equal to the published version", () => {
        expect(() => assertReleasable(publishedStatus("2.0.1"), "2.0.1")).toThrow(/does not increment/);
    });

    it("rejects a version older than the published version", () => {
        expect(() => assertReleasable(publishedStatus("2.0.5"), "2.0.1")).toThrow(/does not increment/);
    });

    it("picks the highest crxVersion across multiple distribution channels", () => {
        const status = {
            publishedItemRevisionStatus: {
                state: "PUBLISHED",
                distributionChannels: [
                    { deployPercentage: 50, crxVersion: "2.0.1" },
                    { deployPercentage: 50, crxVersion: "2.0.3" }
                ]
            }
        };
        expect(() => assertReleasable(status, "2.0.2")).toThrow(/does not increment/);
        expect(() => assertReleasable(status, "2.0.4")).not.toThrow();
    });

    it("reports every violated condition together", () => {
        const status = {
            takenDown: true,
            warned: true,
            submittedItemRevisionStatus: { state: "SUBMITTED" },
            ...publishedStatus("2.0.5")
        };
        expect(() => assertReleasable(status, "2.0.1")).toThrow(
            /taken down.*policy warning.*awaiting review.*does not increment/s
        );
    });
});
