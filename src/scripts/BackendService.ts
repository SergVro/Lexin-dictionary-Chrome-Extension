//# sourceURL=BackendService.js
/// <reference path="..\lib\jquery\jquery.d.ts" />

import interfaces = require("./Interfaces");
import IBackendService = interfaces.IBackendService;
import ILanguage = interfaces.ILanguage;
import IHistoryItem = interfaces.IHistoryItem;
import ITranslation = interfaces.ITranslation;

import BackendMethods = require("./BackendMethods");
import TranslationDirection = require("./TranslationDirection");
import MessageBus = require("./MessageBus");

class BackendService implements IBackendService{

    loadHistory(language: string) : JQueryPromise<IHistoryItem[]> {
        return MessageBus.Instance.sendMessage(BackendMethods.getHistory, {langDirection: language});
    }

    clearHistory(language: string) : JQueryPromise<{}> {
        return MessageBus.Instance.sendMessage(BackendMethods.clearHistory, {langDirection: language});
    }

    getTranslation(word: string, direction?: TranslationDirection): JQueryPromise<ITranslation> {
        return MessageBus.Instance.sendMessage(BackendMethods.getTranslation,
            {word: word, direction: direction || TranslationDirection.to });
    }

    getSelectedText(): JQueryPromise<string> {
        return MessageBus.Instance.sendMessageToActiveTab(BackendMethods.getSelection);
    }

    createNewTab(url: string): void {
        MessageBus.Instance.createNewTab(url);
    }
}

export = BackendService;
