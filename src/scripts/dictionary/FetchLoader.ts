import { ILoader } from "../common/Interfaces.js";

/**
 * The encoding to read a response in when its own answer cannot be believed.
 *
 * Lexin serves ISO-8859-1 bytes under a `Content-Type: text/html;charset=utf-8`
 * header - `författare` arrives as `f\xF6rfattare`, which is not valid UTF-8 - so a
 * loader that takes the header at its word turns every å, ä and ö in the response
 * into a replacement character, in the Translation Card and in the history alike.
 * Folkets, on the same host, declares utf-8 and means it, so the encoding cannot
 * simply be pinned per dictionary either.
 */
const FALLBACK_ENCODING = "iso-8859-1";

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
                let encoding = FALLBACK_ENCODING;

                // Check if charset is specified in Content-Type header
                const charsetMatch = contentType.match(/charset=([^;]+)/i);
                if (charsetMatch) {
                    encoding = charsetMatch[1].trim().toLowerCase();
                }
                // If no charset is specified, ISO-8859-1 stands: it is common for
                // older Swedish websites, and it reads any byte rather than failing.

                return response.arrayBuffer().then(buffer => this.decode(buffer, encoding));
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

    /**
     * Reads the body in the declared encoding, checking the declaration rather than
     * trusting it - see FALLBACK_ENCODING for who lies and why it matters.
     *
     * `fatal` turns a byte the encoding cannot represent into a throw instead of a
     * replacement character, which is what makes the mislabelling detectable at all.
     * An encoding label TextDecoder does not know throws here too, and lands in the
     * same place, which is the right place for it.
     */
    private decode(buffer: ArrayBuffer, encoding: string): string {
        try {
            return new TextDecoder(encoding, { fatal: true }).decode(buffer);
        } catch {
            return new TextDecoder(FALLBACK_ENCODING).decode(buffer);
        }
    }
}

export default FetchLoader;
