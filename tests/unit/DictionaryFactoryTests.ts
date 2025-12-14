import DictionaryFactory from "../../src/scripts/Dictionary/DictionaryFactory.js";

describe("DictionaryFactory", () => {
    let factory: DictionaryFactory;

    beforeEach(() => {
        factory = new DictionaryFactory();
    });

    it("should return all supported languages", () => {
        const languages = factory.getAllSupportedLanguages();
        expect(languages.length).toBe(20);
    });

    describe("getDictionary", () => {
        it("should get Lexikon dictionary", () => {
            const dictionary = factory.getDictionary("swe_swe");
            expect(dictionary.getSupportedLanguages().length).toBe(19);
        });

        it("should get Folkets dictionary", () => {
            const dictionary = factory.getDictionary("swe_eng");
            expect(dictionary.getSupportedLanguages()[0].value).toBe("swe_eng");
        });

        it("should throw error for unknown dictionary", () => {
            expect(() => factory.getDictionary("swe_bbb")).toThrow("There is no dictionary with support of swe_bbb");
        });
    });
});
