import Settings from "../../src/scripts/common/Settings.js";
import { FakeAsyncSettingsStorage } from "./util/fakes.js";

describe("Settings", () => {
    let storage: FakeAsyncSettingsStorage;
    let settings: Settings;

    beforeEach(() => {
        storage = new FakeAsyncSettingsStorage();
        // Pinned off a Mac, so the suite reads the same on a developer's laptop as it
        // does on the Linux box in CI. The Mac branch is tested explicitly below.
        settings = new Settings(storage, () => false);
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

    describe("triggerModifier", () => {
        it("should default to alt", async () => {
            // Every existing reader looks words up with Alt. The setting exists for
            // the desktops that take Alt for themselves, not to move anyone else.
            expect(await settings.getTriggerModifier()).toBe("alt");
        });

        it("should round-trip every modifier", async () => {
            await settings.setTriggerModifier("shift");
            expect(await settings.getTriggerModifier()).toBe("shift");

            await settings.setTriggerModifier("ctrl");
            expect(await settings.getTriggerModifier()).toBe("ctrl");

            await settings.setTriggerModifier("alt");
            expect(await settings.getTriggerModifier()).toBe("alt");
        });

        it("should treat anything it does not understand as alt", async () => {
            // A value written by a newer version, or a corrupted store. Alt is at
            // least a gesture the reader can perform.
            await storage.setItem("triggerModifier", "hyper");
            expect(await settings.getTriggerModifier()).toBe("alt");
        });

        it("should fall back to alt when the platform cannot deliver the stored key", async () => {
            // Ctrl+click is the secondary click on a Mac, so the gesture never fires
            // there. Honouring the stored value would leave the reader with no way to
            // look a word up at all; Alt at least works.
            const onAMac = new Settings(storage, () => true);
            await storage.setItem("triggerModifier", "ctrl");

            expect(await onAMac.getTriggerModifier()).toBe("alt");
            expect(await settings.getTriggerModifier()).toBe("ctrl");
        });
    });
});
