import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import FetchLoader from "../../src/scripts/Dictionary/FetchLoader.js";

describe("FetchLoader", () => {
    let loader: FetchLoader;
    let originalFetch: typeof fetch;

    beforeEach(() => {
        loader = new FetchLoader();
        // Store original fetch
        originalFetch = global.fetch;
    });

    afterEach(() => {
        // Restore original fetch
        global.fetch = originalFetch;
    });

    it("should decode Swedish characters (å, ä, ö) correctly from UTF-8", async () => {
        // Create UTF-8 encoded response with Swedish characters
        const swedishText = "bil [bi:l] LYSSNA subst.\n〈bilen, bilar, bilarna〉\nett fordon för ett litet antal personer\nBILD SVENSKA, BILD SVENSKA\nSammansättningar:\n\nbil|buren\nbil|fri\nbil|körning\nbil|skatt\nbil|trafik\nlast|bil\nperson|bil\nExempel:\n\nhon tycker det är roligt att köra bil\nhan åkte bil till jobbet";
        
        // Encode as UTF-8 ArrayBuffer
        const encoder = new TextEncoder();
        const utf8Buffer = encoder.encode(swedishText);
        
        // Mock fetch to return the UTF-8 encoded buffer
        global.fetch = vi.fn(() => {
            return Promise.resolve({
                ok: true,
                headers: new Headers({
                    "Content-Type": "text/html; charset=utf-8"
                }),
                arrayBuffer: () => Promise.resolve(utf8Buffer.buffer),
            } as Response);
        });

        const result = await loader.get("http://example.com/test");
        
        // Verify Swedish characters are correctly decoded
        expect(result).toContain("för");
        expect(result).toContain("körning");
        expect(result).toContain("kör");
        expect(result).toContain("åkte");
        expect(result).toContain("Sammansättningar");
        expect(result).toContain("är");
        
        // Verify the text matches exactly
        expect(result).toBe(swedishText);
    });

    it("should handle responses without proper Content-Type charset header (defaults to ISO-8859-1)", async () => {
        // Simulate a response that doesn't have charset in Content-Type
        // When no charset is specified, we default to ISO-8859-1 for Lexin server
        const textWithSwedishChars = "test med svenska tecken: å, ä, ö";
        
        // Encode as ISO-8859-1 (Latin-1) - each character is one byte
        const iso88591Buffer = new Uint8Array(textWithSwedishChars.length);
        for (let i = 0; i < textWithSwedishChars.length; i++) {
            const charCode = textWithSwedishChars.charCodeAt(i);
            // ISO-8859-1 can represent characters 0-255 directly
            iso88591Buffer[i] = charCode > 255 ? 63 : charCode; // Replace out-of-range with '?'
        }
        
        global.fetch = vi.fn(() => {
            return Promise.resolve({
                ok: true,
                headers: new Headers({
                    "Content-Type": "text/html"
                }),
                arrayBuffer: () => Promise.resolve(iso88591Buffer.buffer),
            } as Response);
        });

        const result = await loader.get("http://example.com/test");
        
        expect(result).toBe(textWithSwedishChars);
        expect(result).toContain("å");
        expect(result).toContain("ä");
        expect(result).toContain("ö");
    });

    it("should throw error when response is not ok", async () => {
        global.fetch = vi.fn(() => {
            return Promise.resolve({
                ok: false,
                status: 404,
                headers: new Headers(),
            } as Response);
        });

        await expect(loader.get("http://example.com/test")).rejects.toThrow("HTTP error! status: 404");
    });
});
