import { ILoader } from "../Interfaces.js";
import { promiseToJQueryPromise } from "../PromiseAdapter.js";

/**
 * FetchLoader implements ILoader using the native fetch API
 * This is needed for service workers where jQuery doesn't work
 */
class FetchLoader implements ILoader {
    get(url: string): JQueryPromise<any> {
        const promise = fetch(url)
            .then(response => {
                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }
                return response.text();
            });
        
        return promiseToJQueryPromise(promise);
    }
}

export default FetchLoader;


