import { ITranslationParser, IHistoryManager, IHistoryItem, IAsyncStorage } from "../common/Interfaces.js";
import Tracker from "../common/Tracker.js";
import { decodeHtmlEntities } from "../util/HtmlEntities.js";

class HistoryManager implements IHistoryManager {
    storageKey: string = "history";
    translationParser: ITranslationParser;
    private storage: IAsyncStorage;
    private maxHistoryBuffer: number;
    private maxHistoryLength: number;

    set maxHistory(value: number) {
        this.maxHistoryLength = value;
        this.maxHistoryBuffer = Math.floor(this.maxHistoryLength / 5);
    }

    constructor(translationParser: ITranslationParser, storage: IAsyncStorage) {
        this.translationParser = translationParser;
        this.storage = storage;
        this.maxHistory = 1000;
    }

    async getHistory(langDirection: string): Promise<IHistoryItem[]> {
        //  Summary
        //      Returns translation history for the specified language direction.

        const history = await this.loadHistory(langDirection);
        // remove duplicates. We do it only on history request since we don"t want to do it on every translation operation
        this.compress(history);
        await this.saveHistory(langDirection,  history);
        return history;
    }

    private async loadHistory(langDirection: string): Promise<IHistoryItem[]> {
        const key = this.getStorageKey(langDirection);
        const storedHistory = await this.storage.getItem(key);
        const history: IHistoryItem[] = storedHistory ? JSON.parse(storedHistory) : [];

        // Entries written before the parser decoded them still hold Lexin's numeric
        // character references. Decoding on the way out cleans them up wherever they
        // are read, and getHistory writes the result back - which also lets an
        // encoded entry merge with its decoded twin instead of sitting beside it
        // forever. Decoding is a no-op for anything without an "&", so this costs
        // nothing once a store has been through it.
        for (const item of history) {
            item.word = decodeHtmlEntities(item.word);
            item.translation = decodeHtmlEntities(item.translation);
        }
        return history;
    }

    private async saveHistory(langDirection: string, history: IHistoryItem[]): Promise<void> {
        const key = this.getStorageKey(langDirection);
        await this.storage.setItem(key, JSON.stringify(history));
    }

    private getStorageKey(langDirection: string) {
        return this.storageKey + langDirection;
    }

    async clearHistory(langDirection: string): Promise<void> {
        //  Summary
        //      Clears translation history for the specified language direction
        await this.storage.removeItem(this.getStorageKey(langDirection));
    }

    /**
     * Which Language Directions have anything stored.
     *
     * Read off the keys rather than kept as an index: an index would be one more thing
     * to keep in step with addToHistory and clearHistory, and it would go stale for
     * anyone upgrading from a build that never wrote it.
     */
    async getDirections(): Promise<string[]> {
        const keys = await this.storage.keys();
        return keys
            .filter((key) => key.indexOf(this.storageKey) === 0 && key.length > this.storageKey.length)
            .map((key) => key.substring(this.storageKey.length));
    }

    /**
     * Removes one entry, for the History page's per-row delete.
     *
     * Matched on word *and* timestamp: _removeDuplicates merges same-word entries
     * across lookups, so a word on its own does not identify a row.
     */
    async removeItem(langDirection: string, word: string, added: number): Promise<void> {
        const history = await this.loadHistory(langDirection);
        const remaining = history.filter((item) => !(item.word === word && item.added === added));
        if (remaining.length !== history.length) {
            await this.saveHistory(langDirection, remaining);
        }
    }

    async addToHistory(langDirection: string, translations: IHistoryItem[]): Promise<void> {
        //  Summary
        //      Adds a new word and translation to the translation history

        let history = await this.loadHistory(langDirection);
        if (!history) {
            history = [];
        }
        history = history.concat(translations);
        if (this.needToCompress(history)) {
            this.compress(history);
        }
        const serializedHistory = JSON.stringify(history);
        await this.storage.setItem(this.getStorageKey(langDirection), serializedHistory);
    }

    private _removeDuplicates(history: IHistoryItem[]): void {
        //  Summary
        //      Removes duplicate entries from the specified history array
        for (let i = history.length - 1; i >= 0; i--) {
            for (let j = i - 1; j >= 0; j--) {
                if (history[i].word === history[j].word) {
                    if (history[i].translation === history[j].translation) { // if we already have the same word with the same translation
                        history.splice(i, 1);                               // remove it
                        break;
                    }
                    // try to combine different translations in the list
                    const separator = "; ";
                    const iTranslations = history[i].translation.split(separator);
                    const jTranslations = history[j].translation.split(separator);
                    const allTranslations = this.combineTranslations(jTranslations, iTranslations);

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
        const result = [...translations1];
        for (let i = 0; i < translations2.length; i++) {
            if (!result.includes(translations2[i])) {
                result.push(translations2[i]);
            }
        }
        return result;
    }

    private sort_by(field: string, reverse: boolean, primer?) {
        //  Summary
        //      Sorting routine
        const reverseNum = (reverse) ? -1 : 1;
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

    private compress(history: IHistoryItem[]): void {
        this._removeDuplicates(history);
        history.sort(this.sort_by("added", true));
        if (this.needToCompress(history)) {
            const countToRemove = history.length - this.maxHistoryLength;
            history.splice(-countToRemove, countToRemove);

            Tracker.track("history", "compress");
        }
    }

    private needToCompress(history: IHistoryItem[]) {
        return history.length > (this.maxHistoryLength + this.maxHistoryBuffer);
    }
}

export default HistoryManager;
