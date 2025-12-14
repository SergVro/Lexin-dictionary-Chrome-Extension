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

    getTranslation(word: string, langDirection: string, direction: TranslationDirection): Promise<string> {
        this.checkLanguage(langDirection);
        const queryUrl: string = this.createQueryUrl(word, langDirection, direction);
        
        // Use native Promise instead of jQuery Deferred (jQuery doesn't work in service workers)
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

    htmlDecode(value: string): string {
        // Decode HTML entities without using DOM (service workers don't have DOMParser)
        // Use a pure JavaScript implementation
        
        // Create a mapping of common HTML entities
        const entityMap: { [key: string]: string } = {
            "&amp;": "&",
            "&lt;": "<",
            "&gt;": ">",
            "&quot;": "\"",
            "&#39;": "'",
            "&apos;": "'",
            "&nbsp;": " ",
            "&copy;": "©",
            "&reg;": "®",
            "&trade;": "™",
            "&auml;": "ä",
            "&ouml;": "ö",
            "&aring;": "å",
            "&Auml;": "Ä",
            "&Ouml;": "Ö",
            "&Aring;": "Å"
        };
        
        // Replace named entities
        let decoded = value;
        for (const entity in entityMap) {
            if (entityMap.hasOwnProperty(entity)) {
                decoded = decoded.replace(new RegExp(entity, "g"), entityMap[entity]);
            }
        }
        
        // Replace numeric entities (&#123; and &#x1F;)
        decoded = decoded.replace(/&#(\d+);/g, (match, dec) => {
            return String.fromCharCode(parseInt(dec, 10));
        });
        
        decoded = decoded.replace(/&#x([0-9a-fA-F]+);/g, (match, hex) => {
            return String.fromCharCode(parseInt(hex, 16));
        });
        
        return decoded;
    }
}

export default DictionaryBase;

