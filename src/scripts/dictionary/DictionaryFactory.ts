import { IDictionary, ILanguage } from "../common/Interfaces.js";
import LexinDictionary from "./LexinDictionary.js";
import FolketsDictionary from "./FolketsDictionary.js";
import FetchLoader from "./FetchLoader.js";


class DictionaryFactory {
    private dictionaries: IDictionary[];

    constructor(dictionaries? : IDictionary[]) {
        if (dictionaries) {
            this.dictionaries = dictionaries;
        } else {
            // Use FetchLoader for all contexts (service worker and UI pages)
            const loader = new FetchLoader();
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
