/// <reference path="..\..\lib\jquery\jquery.d.ts" />

import interfaces = require("./../Interfaces");
import IDictionary = interfaces.IDictionary;
import ILanguage = interfaces.ILanguage;

// All dictionaries should be registered within the factory
import LexinDictionary = require("./LexinDictionary");
import FolketsDictionary = require("./FolketsDictionary");


class DictionaryFactory {
    private dictionaries: IDictionary[];

    constructor() {
        this.dictionaries = [
            new LexinDictionary($),
            new FolketsDictionary($)
        ];
    }

    getDictionary(langDirection: string): IDictionary {
        var compatibleDictionaries = this.dictionaries.filter((d) => d.isLanguageSupported(langDirection));
        if (compatibleDictionaries.length > 0) {
            return compatibleDictionaries[0];
        } else {
            throw new Error("There is not dictionary with support of " + langDirection);
        }
    }

    getAllSupportedLanguages(): ILanguage[] {
        var result: ILanguage[] = [];
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

export = DictionaryFactory;
