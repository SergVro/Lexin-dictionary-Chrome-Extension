import DictionaryBase from "../../src/scripts/Dictionary/DictionaryBase.js";
import TranslationDirection from "../../src/scripts/Dictionary/TranslationDirection.js";
import { FakeLoader } from "./util/fakes.js";

describe("DictionaryBase", () => {
    let dictionary: DictionaryBase;
    let loader: FakeLoader;

    beforeEach(() => {
        loader = new FakeLoader();
        dictionary = new DictionaryBase(loader);
    });

    it("should decode HTML entities", () => {
        expect(dictionary.htmlDecode("Ingen unik tr&auml;ff")).toBe("Ingen unik träff");
    });

    it("should throw error for abstract isWordFound method", () => {
        expect(() => dictionary.isWordFound("test", "foo")).toThrow("This method is abstract");
    });

    it("should throw error for abstract createQueryUrl method", () => {
        expect(() => dictionary.createQueryUrl("test", "swe_foo", TranslationDirection.to)).toThrow("This method is abstract");
    });

    it("should throw error for unsupported language", () => {
        expect(() => dictionary.checkLanguage("swe_foo")).toThrow("This dictionary does not support language swe_foo");
    });
});
