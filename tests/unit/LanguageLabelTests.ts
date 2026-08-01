import LanguageLabel from "../../src/scripts/common/LanguageLabel.js";
import { LANGUAGE_KEY } from "../../src/scripts/common/LanguageManager.js";
import { FakeAsyncSettingsStorage } from "./util/fakes.js";

describe("LanguageLabel", () => {
    const languages = [
        { value: "swe_eng", text: "English" },
        { value: "swe_ara", text: "Arabic" },
        { value: "swe_srp_cyrillic", text: "Serbian (Cyrillic)" },
        { value: "swe_swe", text: "Swedish" }
    ];

    let storage: FakeAsyncSettingsStorage;
    let label: LanguageLabel;

    beforeEach(() => {
        storage = new FakeAsyncSettingsStorage();
        label = new LanguageLabel(storage, languages);
    });

    describe("describe", () => {
        it("should name a pair by its target code and full name", () => {
            expect(label.describe("swe_eng")).toEqual({ code: "sv→eng", name: "Swedish → English" });
            expect(label.describe("swe_ara")).toEqual({ code: "sv→ara", name: "Swedish → Arabic" });
        });

        it("should drop a variant suffix from the code but keep it in the name", () => {
            // The header has room for a three-letter code; "sv→srp_cyrillic" would
            // push the word itself out of the card.
            expect(label.describe("swe_srp_cyrillic")).toEqual({
                code: "sv→srp",
                name: "Swedish → Serbian (Cyrillic)"
            });
        });

        it("should show the monolingual dictionary as a single language", () => {
            expect(label.describe("swe_swe")).toEqual({ code: "sv", name: "Swedish" });
        });

        it("should fall back to the raw direction for a language it does not know", () => {
            expect(label.describe("swe_xyz")).toEqual({ code: "sv→xyz", name: "Swedish → swe_xyz" });
        });
    });

    describe("getCurrent", () => {
        it("should read the stored Language Direction", async () => {
            await storage.setItem(LANGUAGE_KEY, "swe_ara");
            expect(await label.getCurrent()).toEqual({ code: "sv→ara", name: "Swedish → Arabic" });
        });

        it("should default to Swedish when nothing is stored", async () => {
            expect(await label.getCurrent()).toEqual({ code: "sv", name: "Swedish" });
        });
    });
});
