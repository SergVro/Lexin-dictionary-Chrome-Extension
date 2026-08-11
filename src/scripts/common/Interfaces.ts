import TranslationDirection from "../dictionary/TranslationDirection.js";
import MessageType from "../messaging/MessageType.js";

export interface ILanguage {
    value: string;
    text: string;
}

export interface IHistoryItem {
    word: string;
    translation: string;
    added: number;
}

export interface ITranslation {
    translation: string;
    error: string;
}

export interface ISettingsStorage {
    [key: string]: any;
}

export interface IAsyncStorage {
    getItem(key: string): Promise<string | null>;
    setItem(key: string, value: string): Promise<void>;
    removeItem(key: string): Promise<void>;
    clear(): Promise<void>;
    /**
     * Every key currently stored. Replaced the getLength()/key(index) pair inherited
     * from the old localStorage shim, which nothing ever called and which cost a full
     * read of the store per index - enumerating history that way would have re-read
     * every word list once for each key.
     */
    keys(): Promise<string[]>;
}

export interface IAsyncSettingsStorage {
    getItem(key: string): Promise<string | null>;
    setItem(key: string, value: string): Promise<void>;
    removeItem(key: string): Promise<void>;
}

export interface IHistoryManager {
    getHistory(langDirection: string): Promise<IHistoryItem[]>;
    getDirections(): Promise<string[]>;
    clearHistory(langDirection: string): Promise<void>;
    addToHistory(langDirection: string, translations: IHistoryItem[]): Promise<void>;
    removeItem(langDirection: string, word: string, added: number): Promise<void>;
}

export interface IMessageService {
    loadHistory(language: string) : Promise<IHistoryItem[]>;
    loadHistoryDirections() : Promise<string[]>;
    clearHistory(language: string) : Promise<void>;
    removeHistoryItem(language: string, word: string, added: number) : Promise<void>;
    getTranslation(word: string, direction?: TranslationDirection): Promise<ITranslation>;
    getSelectedText(): Promise<string>;
    createNewTab(url: string): void;
    /** Opens the Action Popup on `word`, which the caller already knows. */
    openActionPopup(word: string): Promise<void>;
    /** The word a card handed over, or "" when the popup was opened some other way. */
    takePendingLookup(): Promise<string>;
    playAudio(url: string): Promise<void>;
    /** Asks the active tab to look up whatever it has selected. */
    translateSelection(): Promise<void>;
    /** What Chrome has the named command bound to, or "" when it is unassigned. */
    getCommandShortcut(command: string): Promise<string>;
}

/** Plays a pronunciation clip. See OffscreenAudioPlayer for the only implementation. */
export interface IAudioPlayer {
    play(url: string): Promise<void>;
}

export interface ITranslationManager {
    getTranslation(word: string, direction: TranslationDirection,
                   languageDirection?: string, skipHistory? : boolean): Promise<string>;
}

export interface ITranslationParser {
    parse(translation: string, parsingRegExp: RegExp): IHistoryItem[];
}

export interface IDictionary extends ITranslationParser{
    getTranslation(word: string, langDirection: string, direction: TranslationDirection): Promise<string> ;
    isLanguageSupported(langDirection: string): boolean;
    getSupportedLanguages(): ILanguage[];
    parseTranslation(translation: string, langDirection: string): IHistoryItem[];
}

export interface ILoader {
    get(url: string): Promise<any>;
}

export interface MessageHandler {
    (args: any): any;
}

export interface IMessageBus {
    registerHandler(method: MessageType, handler: MessageHandler, ignoreEmptyResult?: boolean);
    sendMessage(method: MessageType, args?: any): Promise<any>;
    sendMessageToActiveTab(method: MessageType, args?: any): Promise<any>;
    createNewTab(url: string): void;
    /** Runs `handler` when Chrome reports the named keyboard shortcut was pressed. */
    registerCommandHandler(command: string, handler: () => void): void;
    getCommandShortcut(command: string): Promise<string>;
}

export interface GetTranslationHandler {
    (word: string,  direction: TranslationDirection): Promise<ITranslation>;
}

export interface LoadHistoryHandler {
    (langDirection: string): Promise<IHistoryItem[]>;
}

export interface ClearHistoryHandler {
    (langDirection: string): Promise<void>;
}

export interface LoadHistoryDirectionsHandler {
    (): Promise<string[]>;
}

export interface RemoveHistoryItemHandler {
    (langDirection: string, word: string, added: number): Promise<void>;
}

export interface GetSelectionHandler {
    (): string;
}

export interface OpenActionPopupHandler {
    (word: string): Promise<void>;
}

/** Hands the pending word to the popup asking for it, and forgets it. */
export interface TakePendingLookupHandler {
    (): string;
}

export interface PlayAudioHandler {
    (url: string): Promise<any>;
}

/**
 * Answers the keyboard shortcut in one frame of the tab.
 *
 * Returns true where it acted and nothing at all where it did not - every frame is
 * asked, and only the one holding the reader's selection should reply. See
 * registerGetSelectionHandler, which stays silent for the same reason.
 */
export interface TranslateSelectionHandler {
    (): boolean | void;
}

export interface IMessageHandlers {
    registerGetTranslationHandler(handler: GetTranslationHandler): void ;
    registerLoadHistoryHandler(handler: LoadHistoryHandler): void;
    registerClearHistoryHandler(handler: ClearHistoryHandler): void;
    registerLoadHistoryDirectionsHandler(handler: LoadHistoryDirectionsHandler): void;
    registerRemoveHistoryItemHandler(handler: RemoveHistoryItemHandler): void;
    registerGetSelectionHandler(handler: GetSelectionHandler): void;
    registerOpenActionPopupHandler(handler: OpenActionPopupHandler): void;
    registerTakePendingLookupHandler(handler: TakePendingLookupHandler): void;
    registerPlayAudioHandler(handler: PlayAudioHandler): void;
    registerPlayAudioInOffscreenDocumentHandler(handler: PlayAudioHandler): void;
    registerTranslateSelectionHandler(handler: TranslateSelectionHandler): void;
}


