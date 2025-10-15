import $ from "jquery";
import { IDictionary, IHistoryItem, ILanguage, ILoader } from "../Interfaces.js";
import TranslationDirection from "./TranslationDirection.js";
import TranslationParser from "./TranslationParser.js";

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

    getTranslation(word: string, langDirection: string, direction: TranslationDirection): JQueryPromise<string> {
        this.checkLanguage(langDirection);
        const queryUrl: string = this.createQueryUrl(word, langDirection, direction);
        const deferred = $.Deferred();
        this.loader.get(queryUrl).done((data) => {
            if (!this.isWordFound(word, data) && word.toLowerCase() !== word) {
                this.getTranslation(word.toLowerCase(), langDirection, direction).done((dataLower) => {
                    deferred.resolve(dataLower);
                }).fail((error) => deferred.reject(error));
            }
            deferred.resolve(data);
        }).fail((error) => deferred.reject(error));

        return deferred.promise();
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

    htmlDecode(value: string): string {
        return $("<div />").html(value).text();
    }
}

export default DictionaryBase;

