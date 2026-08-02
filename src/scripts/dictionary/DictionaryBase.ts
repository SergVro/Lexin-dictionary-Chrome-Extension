import { IDictionary, IHistoryItem, ILanguage, ILoader } from "../common/Interfaces.js";
import TranslationDirection from "./TranslationDirection.js";
import TranslationParser from "./TranslationParser.js";
import { decodeHtmlEntities } from "../util/HtmlEntities.js";

class DictionaryBase extends TranslationParser implements IDictionary{

    loader: ILoader;

    constructor(loader: ILoader) {
        super();
        this.loader = loader;
    }

    get tryLowerCase(): boolean {
        return true;
    }

    get supportedLanguages(): ILanguage[] {
        return [];
    }

    get parsingRegExp(): RegExp {
        throw new Error("This property is abstract");
    }

    isLanguageSupported(langDirection: string): boolean {
        return this.supportedLanguages.some((lang) => lang.value === langDirection);
    }

    getSupportedLanguages(): ILanguage[] {
        return this.supportedLanguages;
    }

    getTranslation(word: string, langDirection: string, direction: TranslationDirection): Promise<string> {
        this.checkLanguage(langDirection);
        const queryUrl: string = this.createQueryUrl(word, langDirection, direction);
        
        return new Promise<string>((resolve, reject) => {
            this.loader.get(queryUrl).then((data) => {
                if (!this.isWordFound(word, data) && word.toLowerCase() !== word) {
                    this.getTranslation(word.toLowerCase(), langDirection, direction).then((dataLower) => {
                        resolve(dataLower);
                    }).catch((error) => reject(error));
                } else {
                    resolve(data);
                }
            }).catch((error) => reject(error));
        });
    }

    isWordFound(_word: string, _translation: string): boolean {
        throw new Error("This method is abstract");
    }

    parseTranslation(translation: string, langDirection: string): IHistoryItem[] {
        this.checkLanguage(langDirection);
        return this.parse(translation, this.parsingRegExp);
    }

    createQueryUrl(_word: string, _langDirection: string, _direction: TranslationDirection) : string {
        throw new Error("This method is abstract");
    }

    checkLanguage(langDirection: string) {
        if (!this.isLanguageSupported(langDirection)) {
            throw new Error("This dictionary does not support language " + langDirection);
        }
    }

    /**
     * Used by isWordFound to compare the response against the word that was asked
     * for. Shared with TranslationParser and the history store, which need the same
     * decoding for text they lift out of the markup - see util/HtmlEntities.
     */
    htmlDecode(value: string): string {
        return decodeHtmlEntities(value);
    }
}

export default DictionaryBase;

