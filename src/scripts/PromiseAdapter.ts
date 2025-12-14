/**
 * PromiseAdapter provides JQueryPromise-like interface for native Promises
 * This is needed because jQuery doesn't work in service workers (no DOM)
 */

/**
 * Converts a native Promise to a JQueryPromise-like object
 * This allows code that expects JQueryPromise to work with native Promises
 */
export function promiseToJQueryPromise<T>(promise: Promise<T>): JQueryPromise<T> {
    const jqPromise = promise as any;
    
    // Override .then() to return a JQueryPromise-like object
    const originalThen = promise.then.bind(promise);
    jqPromise.then = function<U>(
        onFulfilled?: ((value: T) => U | Promise<U> | JQueryPromise<U>) | null,
        onRejected?: ((error: any) => any) | null
    ): JQueryPromise<U> {
        const newPromise = originalThen(onFulfilled, onRejected);
        return promiseToJQueryPromise(newPromise);
    };
    
    // Add .done() method (same as .then() but doesn't return a new promise)
    jqPromise.done = function(callback: (value?: T) => void): JQueryPromise<T> {
        promise.then(callback);
        return jqPromise;
    };
    
    // Add .fail() method (same as .catch() but doesn't return a new promise)
    jqPromise.fail = function(callback: (error?: any) => void): JQueryPromise<T> {
        promise.catch(callback);
        return jqPromise;
    };
    
    // Add .always() method (runs on both success and failure)
    jqPromise.always = function(callback: () => void): JQueryPromise<T> {
        promise.then(callback, callback);
        return jqPromise;
    };
    
    // Add .state() method (returns "pending", "resolved", or "rejected")
    jqPromise.state = function(): string {
        // We can't actually determine the state of a native Promise
        // This is a limitation, but most code doesn't check state
        return "pending";
    };
    
    return jqPromise as JQueryPromise<T>;
}

/**
 * Creates a JQueryDeferred-like object using native Promises
 */
export function createDeferred<T>(): { 
    resolve: (value?: T) => void;
    reject: (error?: any) => void;
    promise: () => JQueryPromise<T>;
} {
    let resolveFn: (value?: T) => void;
    let rejectFn: (error?: any) => void;
    
    const promise = new Promise<T>((resolve, reject) => {
        resolveFn = resolve;
        rejectFn = reject;
    });
    
    const jqPromise = promiseToJQueryPromise(promise);
    
    return {
        resolve: (value?: T) => resolveFn!(value),
        reject: (error?: any) => rejectFn!(error),
        promise: () => jqPromise
    };
}

export default { promiseToJQueryPromise, createDeferred };

