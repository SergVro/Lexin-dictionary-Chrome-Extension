/// <reference path="../../lib/chrome/chrome.d.ts" />

import interfaces = require("../Interfaces");
import ISettingsStorage  = interfaces.ISettingsStorage;
import LocalStorage = require("./LocalStorage");

class ChromeStorage implements ISettingsStorage {
    private fallbackStorage: LocalStorage;
    storage: any;

    constructor(storage?) {
        this.fallbackStorage = new LocalStorage();
        this.storage = storage || chrome.storage.local;
    }

    getItem(key: string): JQueryPromise<any> {
        var dfd = $.Deferred<any>();
        this.storage.get(key, (value) => {
            var retValue;
            if (!value) {
                // fallback for previously stored items
                retValue = this.fallbackStorage.getItem(key);
                if (retValue) {
                    this.setItem(key, value);
                    this.fallbackStorage.removeItem(key);
                }
            } else {
                retValue = value[key];
            }
            dfd.resolve(retValue);
        });
        return dfd.promise();
    }

    setItem(key: string, value: any): JQueryPromise<void> {
        var dfd = $.Deferred<void>();
        var item = {}; item[key] = value;
        this.storage.set(item, () => dfd.resolve());
        return dfd.promise();
    }

    removeItem(key: string): JQueryPromise<void> {
        var dfd = $.Deferred<void>();
        this.storage.remove(key, () => dfd.resolve());
        return dfd.promise();
    }
}

export = ChromeStorage;

