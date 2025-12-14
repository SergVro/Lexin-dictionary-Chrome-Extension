import { ILoader } from "../Interfaces.js";

/**
 * JQueryLoader implements ILoader using native fetch() API
 * Note: Keeping the class name for backward compatibility, but it no longer uses jQuery
 */
class JQueryLoader implements ILoader {
    get(url: string): Promise<any> {
        return fetch(url)
            .then(response => {
                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }
                return response.text();
            })
            .then(text => {
                // Try to parse as JSON, fallback to text
                try {
                    return JSON.parse(text);
                } catch {
                    return text;
                }
            });
    }
}

export default JQueryLoader;
