import { IDictionary, ILanguage } from "../Interfaces.js";
import LexinDictionary from "./LexinDictionary.js";
import FolketsDictionary from "./FolketsDictionary.js";
import JQueryLoader from "./JQueryLoader.js";


class DictionaryFactory {
    private dictionaries: IDictionary[];

    constructor(dictionaries? : IDictionary[]) {
        if (dictionaries) {
            this.dictionaries = dictionaries;
        } else {
            // Use JQueryLoader for contexts where jQuery is available (popup, options, history pages)
            const loader = new JQueryLoader();
            this.dictionaries = [
                new LexinDictionary(loader),
                new FolketsDictionary(loader)
            ];
        }
    }

    getDictionary(langDirection: string): IDictionary {
        const compatibleDictionaries = this.dictionaries.filter((d) => d.isLanguageSupported(langDirection));
        if (compatibleDictionaries.length > 0) {
            return compatibleDictionaries[0];
        } else {
            throw new Error("There is no dictionary with support of " + langDirection);
        }
    }

    getAllSupportedLanguages(): ILanguage[] {
        let result: ILanguage[] = [];
        this.dictionaries.forEach((d) => result = result.concat(d.getSupportedLanguages()));
        result.sort((first, second) => {
            if (first.text < second.text) {
                return -1;
            }
            if (first.text > second.text) {
                return 1;
            }
            return 0;
        });
        return result;
    }
}

export default DictionaryFactory;
