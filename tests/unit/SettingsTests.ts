import Settings from "../../src/scripts/common/Settings.js";
import { FakeAsyncSettingsStorage } from "./util/fakes.js";

describe("Settings", () => {
    let storage: FakeAsyncSettingsStorage;
    let settings: Settings;

    beforeEach(() => {
        storage = new FakeAsyncSettingsStorage();
        settings = new Settings(storage);
    });

    describe("recordHistory", () => {
        it("should default to on", async () => {
            // The setting is new, and every existing reader has had their lookups
            // recorded. Defaulting to off would silently stop that on upgrade.
            expect(await settings.getRecordHistory()).toBe(true);
        });

        it("should round-trip both ways", async () => {
            await settings.setRecordHistory(false);
            expect(await settings.getRecordHistory()).toBe(false);

            await settings.setRecordHistory(true);
            expect(await settings.getRecordHistory()).toBe(true);
        });

        it("should treat anything it does not understand as on", async () => {
            // A value written by a newer version, or a corrupted store. Quietly
            // dropping lookups is the worse failure.
            await storage.setItem("recordHistory", "maybe");
            expect(await settings.getRecordHistory()).toBe(true);
        });
    });
});
