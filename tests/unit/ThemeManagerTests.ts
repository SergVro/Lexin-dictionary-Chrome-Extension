import ThemeManager from "../../src/scripts/common/ThemeManager.js";
import { FakeAsyncSettingsStorage } from "./util/fakes.js";

describe("ThemeManager", () => {
    let storage: FakeAsyncSettingsStorage;

    beforeEach(() => {
        storage = new FakeAsyncSettingsStorage();
    });

    const managerPreferring = (prefersDark: boolean) =>
        new ThemeManager(storage, () => prefersDark);

    describe("getAppearance", () => {
        it("should default to system when nothing is stored", async () => {
            expect(await managerPreferring(false).getAppearance()).toBe("system");
        });

        it("should return the stored appearance", async () => {
            const manager = managerPreferring(false);
            await manager.setAppearance("dark");
            expect(await manager.getAppearance()).toBe("dark");
        });

        it("should fall back to system for a value it does not understand", async () => {
            // A value written by a newer version, or a corrupted store. Rendering
            // light-on-light is worse than ignoring the setting.
            await storage.setItem("appearance", "solarized");
            expect(await managerPreferring(false).getAppearance()).toBe("system");
        });
    });

    describe("resolveTheme", () => {
        it("should honour an explicit choice over the OS", async () => {
            const manager = managerPreferring(true);
            expect(manager.resolveTheme("light")).toBe("light");
            expect(manager.resolveTheme("dark")).toBe("dark");
        });

        it("should follow the OS when set to system", () => {
            expect(managerPreferring(true).resolveTheme("system")).toBe("dark");
            expect(managerPreferring(false).resolveTheme("system")).toBe("light");
        });
    });

    describe("getTheme", () => {
        it("should resolve the stored appearance in one step", async () => {
            const manager = managerPreferring(true);
            expect(await manager.getTheme()).toBe("dark");

            await manager.setAppearance("light");
            expect(await manager.getTheme()).toBe("light");
        });
    });
});
