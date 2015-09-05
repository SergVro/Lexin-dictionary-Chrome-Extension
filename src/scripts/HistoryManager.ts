import interfaces = require("./Interfaces");
import ITranslationParser = interfaces.ITranslationParser;
import IHistoryManager = interfaces.IHistoryManager;
import IHistoryItem = interfaces.IHistoryItem;
import ISettingsStorage = interfaces.ISettingsStorage;
import TranslationParser = require("./Dictionary/TranslationParser");

class HistoryManager implements IHistoryManager {
    storageKey: string = "history";
    translationParser: ITranslationParser;
    private storage: Storage;

    constructor(translationParser: ITranslationParser, storage: Storage) {
        this.translationParser = translationParser;
        this.storage = storage;
    }

    getHistory(langDirection: string, compress?: boolean): IHistoryItem[] {
        //  Summary
        //      Returns translation history for the specified language direction.
        //      If compress is true - all duplicate translations will be merged

        var key = this.getStorageKey(langDirection);
        var storedHistory = this.storage.getItem(key);
        var history: IHistoryItem[] = storedHistory ? JSON.parse(storedHistory) : [];
        if (history && compress) {
            // remove duplicates. We do it only on history request since we don"t want to do it on every translation operation
            this._removeDuplicates(history);
            history.sort(this.sort_by("added", true));
            this.storage.setItem(key, JSON.stringify(history));
        }
        return history;
    }

    private getStorageKey(langDirection: string) {
        return this.storageKey + langDirection;
    }

    clearHistory(langDirection: string): void {
        //  Summary
        //      Clears translation history for the specified language direction
        this.storage.removeItem(this.getStorageKey(langDirection));
    }

    addToHistory(langDirection: string, translations: IHistoryItem[]): void {
        //  Summary
        //      Adds a new word and translation to the translation history

        var history = this.getHistory(langDirection, false);
        if (!history) {
            history = [];
        }
        history = history.concat(translations);
        var serializedHistory = JSON.stringify(history);
        this.storage.setItem(this.getStorageKey(langDirection), serializedHistory);
    }

    private _removeDuplicates(history: IHistoryItem[]): void {
        //  Summary
        //      Removes duplicate entries from the specified history array
        for (var i = history.length - 1; i >= 0; i--) {
            for (var j = i - 1; j >= 0; j--) {
                if (history[i].word === history[j].word) {
                    if (history[i].translation === history[j].translation) { // if we already have the same word with the same translation
                        history.splice(i, 1);                               // remove it
                        break;
                    }
                    // try to combine different translations in the list
                    var separator = "; ";
                    var iTranslations = history[i].translation.split(separator);
                    var jTranslations = history[j].translation.split(separator);
                    var allTranslations = this.combineTranslations(jTranslations, iTranslations);

                    history[j].translation = allTranslations.join(separator);
                    history.splice(i, 1);                               // remove it
                    break;
                }
            }
        }
    }

    private combineTranslations(translations1: string[], translations2: string[]): string[] {
        //  Summary
        //      Combines two translation arrays in a single array and removes duplicate entries
        var result = $.merge([], translations1);
        for (var i = 0; i < translations2.length; i++) {
            if ($.inArray(translations2[i], result) === -1) {
                result.push(translations2[i]);
            }
        }
        return result;
    }

    private sort_by(field: string, reverse: boolean, primer?) {
        //  Summary
        //      Sorting routine
        var reverseNum = (reverse) ? -1 : 1;
        return function (a, b) {

            a = a[field];
            b = b[field];

            if (typeof (primer) !== "undefined") {
                a = primer(a);
                b = primer(b);
            }

            if (a < b) {
                return reverseNum * -1;
            }
            if (a > b) {
                return reverseNum;
            }
            return 0;
        };
    }
}

export = HistoryManager;
