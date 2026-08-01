import { filterOptions } from "../../src/scripts/util/Combobox.js";

describe("Combobox filterOptions", () => {
    const languages = [
        { value: "swe_eng", text: "English" },
        { value: "swe_fin", text: "Finnish" },
        { value: "swe_kmr", text: "Northern Kurdish" },
        { value: "swe_srp", text: "Serbian (Latin)" },
        { value: "swe_srp_cyrillic", text: "Serbian (Cyrillic)" },
        { value: "swe_tur", text: "Turkish" }
    ];

    const textsFor = (query: string) => filterOptions(languages, query).map((option) => option.text);

    it("should return every option for an empty query", () => {
        expect(filterOptions(languages, "")).toHaveLength(languages.length);
        expect(filterOptions(languages, "   ")).toHaveLength(languages.length);
    });

    it("should not hand back the caller's array", () => {
        // The combobox keeps the filtered list as its own state and indexes into it.
        const all = filterOptions(languages, "");
        all.pop();
        expect(languages).toHaveLength(6);
    });

    it("should ignore case", () => {
        expect(textsFor("ENGLISH")).toEqual(["English"]);
        expect(textsFor("english")).toEqual(["English"]);
    });

    it("should match anywhere in the name, not just the start", () => {
        // "Northern Kurdish" and "Serbian (Cyrillic)" are the reason: the word a
        // reader reaches for is not the first one.
        expect(textsFor("kurdish")).toEqual(["Northern Kurdish"]);
        expect(textsFor("cyrillic")).toEqual(["Serbian (Cyrillic)"]);
    });

    it("should return every match, in the original order", () => {
        expect(textsFor("serbian")).toEqual(["Serbian (Latin)", "Serbian (Cyrillic)"]);
    });

    it("should fold diacritics so an unaccented query still matches", () => {
        const accented = [{ value: "x", text: "Österrike" }, { value: "y", text: "Ærø" }];
        expect(filterOptions(accented, "oster")).toHaveLength(1);
        expect(filterOptions(accented, "Österr")).toHaveLength(1);
    });

    it("should return nothing when no name matches", () => {
        expect(filterOptions(languages, "klingon")).toEqual([]);
    });
});
