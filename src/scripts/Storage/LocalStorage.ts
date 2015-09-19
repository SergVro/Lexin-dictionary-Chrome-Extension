import interfaces = require("../Interfaces");
import ISettingsStorage  = interfaces.ISettingsStorage;

class LocalStorage implements ISettingsStorage {
    getItem(key: string): JQueryPromise<any> {
        var dfd = $.Deferred<any>();
        var valueStr = localStorage[key];
        var value;
        try {
            value = JSON.parse(valueStr);
        } catch (e) {
            value = valueStr;
        }
        dfd.resolve(value);
        return dfd.promise();
    }

    setItem(key: string, value: any): JQueryPromise<void> {
        var dfd = $.Deferred<void>();
        localStorage[key] = JSON.stringify(value);
        dfd.resolve();
        return dfd.promise();
    }

    removeItem(key: string): JQueryPromise<void> {
        var dfd = $.Deferred<void>();
        localStorage.removeItem(key);
        dfd.resolve();
        return dfd.promise();

    }

}

export = LocalStorage;

