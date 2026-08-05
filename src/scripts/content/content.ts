import MessageService from "../messaging/MessageService.js";
import MessageHandlers from "../messaging/MessageHandlers.js";
import ContentScript from "./ContentScript.js";
import ThemeManager from "../common/ThemeManager.js";
import LanguageLabel from "../common/LanguageLabel.js";
import DictionaryFactory from "../dictionary/DictionaryFactory.js";
import Settings, { TRIGGER_MODIFIER_KEY } from "../common/Settings.js";
import { createChromeStorage } from "../common/ChromeStorageAdapter.js";

const messageService = new MessageService();
const messageHandlers = new MessageHandlers();

// Content scripts may use chrome.storage directly, so the card can read the
// Appearance setting and the current Language Direction for its header.
const { settingsStorage } = createChromeStorage();

// Only for the language *names*. Constructing the factory has no side effects - no
// storage writes, no requests - which matters because this runs in every frame of
// every page the reader visits.
const languages = new DictionaryFactory().getAllSupportedLanguages();

const contentScript = new ContentScript(
    messageService,
    messageHandlers,
    new ThemeManager(settingsStorage),
    new LanguageLabel(settingsStorage, languages),
    new Settings(settingsStorage)
);
contentScript.initialize();

// The one setting that cannot wait for the next card, and the extension's only
// storage subscription.
//
// Every other setting is re-read by the action that displays it, so staleness heals
// itself after one card. The trigger cannot work that way: a reader changes it
// precisely because their desktop intercepts the current one, so the page they were
// reading has no way to open a card and re-read on its own. Waiting would look
// exactly like the setting doing nothing.
//
// The key check comes first because this fires for every write to local storage,
// including the history append behind every lookup, in every frame of the page.
chrome.storage.onChanged.addListener((changes, areaName) => {
    if (areaName === "local" && TRIGGER_MODIFIER_KEY in changes) {
        contentScript.refreshTrigger();
    }
});
