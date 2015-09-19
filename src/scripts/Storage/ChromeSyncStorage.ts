/// <reference path="../../lib/chrome/chrome.d.ts" />

import interfaces = require("../Interfaces");
import ISettingsStorage  = interfaces.ISettingsStorage;
import ChromeStorage = require("./ChromeStorage");

class ChromeSyncStorage extends ChromeStorage {

    constructor() {
        super(chrome.storage.sync);
    }
}

export = ChromeSyncStorage;

