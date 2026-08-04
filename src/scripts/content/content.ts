import MessageService from "../messaging/MessageService.js";
import MessageHandlers from "../messaging/MessageHandlers.js";
import ContentScript from "./ContentScript.js";
import ThemeManager from "../common/ThemeManager.js";
import LanguageLabel from "../common/LanguageLabel.js";
import Settings from "../common/Settings.js";
import DictionaryFactory from "../dictionary/DictionaryFactory.js";
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

// Options can be open beside an existing page. Apply a newly selected key without
// requiring that page (and every frame in it) to be reloaded.
chrome.storage.onChanged.addListener((changes, areaName) => {
    if (areaName === "local" && changes.lookupModifier) {
        contentScript.refreshLookupModifier();
    }
});
