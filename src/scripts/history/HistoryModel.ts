import { IMessageService, IHistoryItem } from "../common/Interfaces.js";
import LanguageManager from "../common/LanguageManager.js";

/** A history entry plus which Language Direction it came from. */
export interface IHistoryRow extends IHistoryItem {
    langDirection: string;
}

/** The All tab, as a Language Direction value. Never a real one. */
export const ALL_DIRECTIONS = "*";

class HistoryModel {
    private messageService: IMessageService;
    private languageManager: LanguageManager;

    constructor(MessageService: IMessageService, languageManager: LanguageManager) {
        this.messageService = MessageService;
        this.languageManager = languageManager;
    }

    /** The reader's default Language Direction, used to pick the opening tab. */
    async getLanguage(): Promise<string> {
        return await this.languageManager.getCurrentLanguage();
    }

    /**
     * The Language Directions that have something stored.
     *
     * Deliberately not filtered by the *enabled* set: history a reader accumulated
     * before turning a language off is still theirs, and still worth exporting.
     */
    loadDirections(): Promise<string[]> {
        return this.messageService.loadHistoryDirections();
    }

    /**
     * Rows for one direction, or for all of them merged newest-first.
     *
     * Each row carries its direction either way, so the All tab can name it and a
     * per-row delete knows which store to write back to.
     */
    async loadHistory(langDirection: string, directions?: string[]): Promise<IHistoryRow[]> {
        if (langDirection !== ALL_DIRECTIONS) {
            const items = await this.messageService.loadHistory(langDirection);
            return (items || []).map((item) => ({ ...item, langDirection: langDirection }));
        }

        const all = directions || await this.loadDirections();
        const lists = await Promise.all(all.map((direction) => this.loadHistory(direction)));
        // Each list already arrives newest-first; merging needs one more sort.
        return lists.reduce((merged, list) => merged.concat(list), [])
            .sort((first, second) => second.added - first.added);
    }

    clearHistory(langDirection: string): Promise<void> {
        return this.messageService.clearHistory(langDirection);
    }

    async clearAll(directions: string[]): Promise<void> {
        await Promise.all(directions.map((direction) => this.clearHistory(direction)));
    }

    removeItem(row: IHistoryRow): Promise<void> {
        return this.messageService.removeHistoryItem(row.langDirection, row.word, row.added);
    }
}

export default HistoryModel;
