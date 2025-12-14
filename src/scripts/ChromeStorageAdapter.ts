import { ISettingsStorage } from "./Interfaces.js";

/**
 * ChromeStorageAdapter provides a Storage-like interface for service workers
 * that uses chrome.storage.local API instead of localStorage.
 * 
 * Note: This adapter uses synchronous methods but chrome.storage is async.
 * It maintains an in-memory cache that is synchronized with chrome.storage.
 */
class ChromeStorageAdapter implements Storage {
    private cache: { [key: string]: string } = {};
    private cacheLoaded: boolean = false;
    private loadPromise: Promise<void> | null = null;

    constructor() {
        // Load cache on initialization
        this.loadCache().catch(err => {
            console.error("Failed to load storage cache:", err);
        });
    }

    /**
     * Wait for the cache to be fully loaded
     * Call this before using synchronous methods to ensure data is available
     */
    async waitForCache(): Promise<void> {
        await this.ensureCacheLoaded();
    }

    private async loadCache(): Promise<void> {
        if (this.loadPromise) {
            return this.loadPromise;
        }

        this.loadPromise = new Promise((resolve, reject) => {
            chrome.storage.local.get(null, (items) => {
                if (chrome.runtime.lastError) {
                    console.error("Error loading storage:", chrome.runtime.lastError);
                    reject(chrome.runtime.lastError);
                    return;
                }
                
                // Convert all values to strings (localStorage stores everything as strings)
                for (const key in items) {
                    if (items.hasOwnProperty(key)) {
                        this.cache[key] = String(items[key]);
                    }
                }
                this.cacheLoaded = true;
                resolve();
            });
        });

        return this.loadPromise;
    }

    private async ensureCacheLoaded(): Promise<void> {
        if (!this.cacheLoaded) {
            await this.loadCache();
        }
    }

    get length(): number {
        // This is synchronous, so we return cached length
        return Object.keys(this.cache).length;
    }

    key(index: number): string | null {
        const keys = Object.keys(this.cache);
        return index >= 0 && index < keys.length ? keys[index] : null;
    }

    getItem(key: string): string | null {
        // Synchronous access to cache
        // Note: Ensure cache is loaded before first use by calling waitForCache()
        return this.cache[key] || null;
    }

    setItem(key: string, value: string): void {
        // Update cache immediately
        this.cache[key] = value;
        
        // Persist to chrome.storage asynchronously
        chrome.storage.local.set({ [key]: value }, () => {
            if (chrome.runtime.lastError) {
                console.error("Error saving to storage:", chrome.runtime.lastError);
            }
        });
    }

    removeItem(key: string): void {
        // Remove from cache immediately
        delete this.cache[key];
        
        // Remove from chrome.storage asynchronously
        chrome.storage.local.remove(key, () => {
            if (chrome.runtime.lastError) {
                console.error("Error removing from storage:", chrome.runtime.lastError);
            }
        });
    }

    clear(): void {
        // Clear cache immediately
        this.cache = {};
        
        // Clear chrome.storage asynchronously
        chrome.storage.local.clear(() => {
            if (chrome.runtime.lastError) {
                console.error("Error clearing storage:", chrome.runtime.lastError);
            }
        });
    }
}

// Create a proxy to support object-like access for ISettingsStorage
class ChromeSettingsStorage implements ISettingsStorage {
    private adapter: ChromeStorageAdapter;

    constructor(adapter: ChromeStorageAdapter) {
        this.adapter = adapter;
    }

    [key: string]: any;

    // Use Proxy to intercept property access
    static create(adapter: ChromeStorageAdapter): ISettingsStorage {
        return new Proxy(new ChromeSettingsStorage(adapter), {
            get(target, prop: string) {
                if (prop in target && typeof prop !== 'string') {
                    return (target as any)[prop];
                }
                return target.adapter.getItem(prop);
            },
            set(target, prop: string, value: any) {
                target.adapter.setItem(prop, String(value));
                return true;
            },
            has(target, prop: string) {
                return target.adapter.getItem(prop) !== null;
            },
            ownKeys(target) {
                // This is tricky - we'd need to get all keys from storage
                // For now, return empty array
                return [];
            }
        }) as ISettingsStorage;
    }
}

// Factory function to create storage adapters
export function createChromeStorage(): { storage: Storage; settingsStorage: ISettingsStorage } {
    const adapter = new ChromeStorageAdapter();
    const settingsStorage = ChromeSettingsStorage.create(adapter);
    
    return {
        storage: adapter as Storage,
        settingsStorage: settingsStorage
    };
}

export default ChromeStorageAdapter;

