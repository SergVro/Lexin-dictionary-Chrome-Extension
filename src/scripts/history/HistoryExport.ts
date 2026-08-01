import { IHistoryItem } from "../common/Interfaces.js";

/**
 * Turning the History page into flashcards.
 *
 * The Help page used to answer this with eight manual steps: select the table, copy
 * it, open Quizlet, press Import, paste, pick "Tab" in one selector, "New Line" in
 * another, press Import. All of that is one button here.
 *
 * The formatters are pure and exported individually so they can be unit-tested - the
 * unit suite runs under `environment: 'node'`, with no Blob and no clipboard.
 */

export type ExportFormat = "csv" | "tsv" | "anki" | "clipboard";

/**
 * RFC 4180: a field goes in quotes if it contains a comma, a quote or a line break,
 * and inner quotes are doubled. Dictionary translations are comma-separated lists of
 * synonyms often enough that skipping this would break most exports.
 */
function csvField(value: string): string {
    if (/[",\r\n]/.test(value)) {
        return `"${value.replace(/"/g, "\"\"")}"`;
    }
    return value;
}

/** Tabs and newlines are the record separators, so they cannot survive inside a field. */
function tabField(value: string): string {
    return value.replace(/[\t\r\n]+/g, " ").trim();
}

function formatDate(added: number): string {
    return new Date(added).toISOString().substring(0, 10);
}

export function toCsv(items: IHistoryItem[]): string {
    const rows = ["Word,Translation,Date"];
    for (const item of items) {
        rows.push([item.word, item.translation, formatDate(item.added)].map(csvField).join(","));
    }
    return rows.join("\n");
}

/**
 * Two columns, tab-separated, no header - exactly what Quizlet's import box expects
 * with its default "Tab" and "New Line" separators. Anki's plain-text import reads the
 * same shape, which is why toAnki delegates: they differ only in file extension, and
 * offering both by name saves the reader guessing which one applies to them.
 */
export function toTsv(items: IHistoryItem[]): string {
    return items
        .map((item) => `${tabField(item.word)}\t${tabField(item.translation)}`)
        .join("\n");
}

export function toAnki(items: IHistoryItem[]): string {
    return toTsv(items);
}

export function format(items: IHistoryItem[], exportFormat: ExportFormat): string {
    switch (exportFormat) {
        case "csv":
            return toCsv(items);
        case "anki":
            return toAnki(items);
        default:
            return toTsv(items);
    }
}

export function fileNameFor(exportFormat: ExportFormat): string {
    const stamp = new Date().toISOString().substring(0, 10);
    const extension = exportFormat === "csv" ? "csv" : "txt";
    return `lexin-history-${stamp}.${extension}`;
}

/**
 * Saves text as a file.
 *
 * An object URL and a synthetic <a download> click, not chrome.downloads - the
 * extension asks for `storage` and nothing else, and this needs no permission at all.
 */
export function download(text: string, fileName: string): void {
    const blob = new Blob([text], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = fileName;
    document.body.appendChild(anchor);
    anchor.click();
    document.body.removeChild(anchor);
    // Revoking immediately can race the download in some builds; a tick is enough.
    setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/**
 * Copies text to the clipboard.
 *
 * navigator.clipboard needs transient user activation, which a click handler has, so
 * no `clipboardWrite` permission is required. The execCommand path is the fallback for
 * when the promise rejects anyway - it is deprecated, not gone.
 */
export async function copyToClipboard(text: string): Promise<boolean> {
    try {
        await navigator.clipboard.writeText(text);
        return true;
    } catch {
        const textarea = document.createElement("textarea");
        textarea.value = text;
        textarea.setAttribute("readonly", "readonly");
        textarea.style.position = "fixed";
        textarea.style.opacity = "0";
        document.body.appendChild(textarea);
        textarea.select();
        let copied: boolean;
        try {
            copied = document.execCommand("copy");
        } catch {
            copied = false;
        }
        document.body.removeChild(textarea);
        return copied;
    }
}
