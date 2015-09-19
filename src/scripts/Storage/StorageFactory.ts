
import interfaces = require("../Interfaces");
import ISettingsStorage  = interfaces.ISettingsStorage;
import ChromeSyncStorage = require("./ChromeSyncStorage");
import ChromeStorage = require("./ChromeStorage");
import LocalStorage = require("./LocalStorage");

class StorageFactory {
    private static storage: ISettingsStorage;
    private static syncStorage: ISettingsStorage;

    static getHistoryStorage(): ISettingsStorage {
        if (!this.storage) {
            if (this.getCurrentBrowser() === "Chrome") {
                this.storage = new ChromeStorage();
            } else {
                this.storage = new LocalStorage();
            }        }
        return this.storage;
    }

    static getOptionsStorage(): ISettingsStorage {
        if (!this.syncStorage) {
            if (this.getCurrentBrowser() === "Chrome") {
                this.syncStorage = new ChromeSyncStorage();
            } else {
                this.syncStorage = new LocalStorage();
            }
        }
        return this.syncStorage;

    }

    private static getCurrentBrowser(): string {
        return "Chrome"; // TODO implement me
    }
}

export = StorageFactory;

