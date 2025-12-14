import { ILoader } from "../Interfaces.js";

/**
 * FetchLoader implements ILoader using the native fetch API
 * This is needed for service workers where jQuery doesn't work
 */
class FetchLoader implements ILoader {
    get(url: string): Promise<any> {
        return fetch(url)
            .then(response => {
                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }
                return response.text();
            });
    }
}

export default FetchLoader;


