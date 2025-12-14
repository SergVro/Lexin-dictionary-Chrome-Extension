import { IAsyncStorage, IAsyncSettingsStorage } from "./Interfaces.js";

/**
 * ChromeStorageAdapter provides an async storage interface for service workers
 * that uses chrome.storage.local API instead of localStorage.
 * 
 * This adapter directly reads/writes to chrome.storage.local without any caching.
 * All operations are asynchronous and return Promises.
 */
class ChromeStorageAdapter implements IAsyncStorage {
    constructor() {
        // No initialization needed
    }

    async getLength(): Promise<number> {
        return new Promise((resolve, reject) => {
            chrome.storage.local.get(null, (items) => {
                if (chrome.runtime.lastError) {
                    reject(chrome.runtime.lastError);
                    return;
                }
                resolve(Object.keys(items).length);
            });
        });
    }

    async key(index: number): Promise<string | null> {
        return new Promise((resolve, reject) => {
            chrome.storage.local.get(null, (items) => {
                if (chrome.runtime.lastError) {
                    reject(chrome.runtime.lastError);
                    return;
                }
                const keys = Object.keys(items);
                resolve(index >= 0 && index < keys.length ? keys[index] : null);
            });
        });
    }

    async getItem(key: string): Promise<string | null> {
        return new Promise((resolve, reject) => {
            chrome.storage.local.get(key, (items) => {
                if (chrome.runtime.lastError) {
                    reject(chrome.runtime.lastError);
                    return;
                }
                resolve(items[key] !== undefined ? String(items[key]) : null);
            });
        });
    }

    async setItem(key: string, value: string): Promise<void> {
        return new Promise((resolve, reject) => {
            chrome.storage.local.set({ [key]: value }, () => {
                if (chrome.runtime.lastError) {
                    reject(chrome.runtime.lastError);
                    return;
                }
                resolve();
            });
        });
    }

    async removeItem(key: string): Promise<void> {
        return new Promise((resolve, reject) => {
            chrome.storage.local.remove(key, () => {
                if (chrome.runtime.lastError) {
                    reject(chrome.runtime.lastError);
                    return;
                }
                resolve();
            });
        });
    }

    async clear(): Promise<void> {
        return new Promise((resolve, reject) => {
            chrome.storage.local.clear(() => {
                if (chrome.runtime.lastError) {
                    reject(chrome.runtime.lastError);
                    return;
                }
                resolve();
            });
        });
    }
}

// Async settings storage adapter
class ChromeSettingsStorage implements IAsyncSettingsStorage {
    private adapter: ChromeStorageAdapter;

    constructor(adapter: ChromeStorageAdapter) {
        this.adapter = adapter;
    }

    async getItem(key: string): Promise<string | null> {
        return this.adapter.getItem(key);
    }

    async setItem(key: string, value: string): Promise<void> {
        return this.adapter.setItem(key, value);
    }

    async removeItem(key: string): Promise<void> {
        return this.adapter.removeItem(key);
    }
}

// Factory function to create storage adapters
export function createChromeStorage(): { storage: IAsyncStorage; settingsStorage: IAsyncSettingsStorage } {
    const adapter = new ChromeStorageAdapter();
    const settingsStorage = new ChromeSettingsStorage(adapter);
    
    return {
        storage: adapter,
        settingsStorage: settingsStorage
    };
}

export default ChromeStorageAdapter;

