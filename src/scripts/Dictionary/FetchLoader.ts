import { ILoader } from "../Interfaces.js";

/**
 * FetchLoader implements ILoader using the native fetch API with encoding detection
 * Handles both text and JSON responses with automatic charset detection
 */
class FetchLoader implements ILoader {
    get(url: string): Promise<any> {
        return fetch(url)
            .then(response => {
                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }
                // Detect encoding from Content-Type header, default to ISO-8859-1 for older servers
                // The Lexin server may send ISO-8859-1 (Latin-1) encoding
                const contentType = response.headers?.get("Content-Type") || "";
                let encoding = "utf-8";
                
                // Check if charset is specified in Content-Type header
                const charsetMatch = contentType.match(/charset=([^;]+)/i);
                if (charsetMatch) {
                    encoding = charsetMatch[1].trim().toLowerCase();
                } else {
                    // If no charset specified, default to ISO-8859-1 for Lexin server
                    // This is common for older Swedish websites
                    encoding = "iso-8859-1";
                }
                
                return response.arrayBuffer().then(buffer => {
                    const decoder = new TextDecoder(encoding);
                    return decoder.decode(buffer);
                });
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

export default FetchLoader;
