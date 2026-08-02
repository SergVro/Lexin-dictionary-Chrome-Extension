import LanguageLabel from "../../src/scripts/common/LanguageLabel.js";
import { LANGUAGE_KEY } from "../../src/scripts/common/LanguageManager.js";
import TranslationDirection from "../../src/scripts/dictionary/TranslationDirection.js";
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

    describe("describeDirection", () => {
        it("should read out of Swedish for the 'to' direction", () => {
            expect(label.describeDirection("swe_eng", TranslationDirection.to)).toEqual({
                code: "sv→eng",
                name: "Swedish → English"
            });
        });

        it("should read into Swedish for the 'from' direction", () => {
            // What the Action Popup's swap control flips. Before, the direction was
            // implied by which of two text fields the reader typed in.
            expect(label.describeDirection("swe_eng", TranslationDirection.from)).toEqual({
                code: "eng→sv",
                name: "English → Swedish"
            });
        });

        it("should stay a single language for the monolingual dictionary", () => {
            // swe_swe has no pair to swap, either way round.
            const to = label.describeDirection("swe_swe", TranslationDirection.to);
            const from = label.describeDirection("swe_swe", TranslationDirection.from);
            expect(to).toEqual({ code: "sv", name: "Swedish" });
            expect(from).toEqual(to);
        });
    });

    describe("isMonolingual", () => {
        it("should recognise the Swedish-only dictionary", () => {
            // The Action Popup keeps this one pointing at "to": Lexin answers nothing
            // when asked for its "from" direction, and the swap control is disabled.
            expect(label.isMonolingual("swe_swe")).toBe(true);
        });

        it("should not treat a pair as monolingual", () => {
            expect(label.isMonolingual("swe_eng")).toBe(false);
            expect(label.isMonolingual("swe_srp_cyrillic")).toBe(false);
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
