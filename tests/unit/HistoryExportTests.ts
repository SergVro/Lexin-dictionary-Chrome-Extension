import { toCsv, toTsv, toAnki, format, fileNameFor } from "../../src/scripts/history/HistoryExport.js";
import { IHistoryItem } from "../../src/scripts/common/Interfaces.js";

describe("HistoryExport", () => {
    const at = (iso: string) => new Date(iso).getTime();

    const item = (word: string, translation: string, added = at("2026-08-01T10:00:00Z")): IHistoryItem =>
        ({ word, translation, added });

    describe("toTsv", () => {
        it("should write word and translation, tab separated, with no header", () => {
            // Exactly what Quizlet's import box expects with its default "Tab" and
            // "New Line" separators - a header row would import as a card.
            const tsv = toTsv([item("hem", "home"), item("jobb", "job")]);
            expect(tsv).toBe("hem\thome\njobb\tjob");
        });

        it("should strip tabs and newlines out of fields", () => {
            // They are the record separators; a translation containing one would
            // silently split into extra columns and rows.
            const tsv = toTsv([item("hem", "home\tabode\nhouse")]);
            expect(tsv).toBe("hem\thome abode house");
        });

        it("should return an empty string for no items", () => {
            expect(toTsv([])).toBe("");
        });
    });

    it("toAnki should match the TSV shape", () => {
        // Anki's plain-text import reads the same two tab-separated columns. It is a
        // separate menu entry only so a reader looking for "Anki" finds it.
        const items = [item("hem", "home")];
        expect(toAnki(items)).toBe(toTsv(items));
    });

    describe("toCsv", () => {
        it("should write a header and one row per item", () => {
            const csv = toCsv([item("hem", "home", at("2026-08-01T10:00:00Z"))]);
            expect(csv).toBe("Word,Translation,Date\nhem,home,2026-08-01");
        });

        it("should quote a field containing a comma", () => {
            // Dictionary translations are comma-separated synonym lists often enough
            // that skipping this would break most exports.
            const csv = toCsv([item("hem", "home, abode, house")]);
            expect(csv).toContain("hem,\"home, abode, house\",");
        });

        it("should double the quotes inside a quoted field", () => {
            const csv = toCsv([item("hem", "a \"home\"")]);
            expect(csv).toContain("\"a \"\"home\"\"\"");
        });

        it("should quote a field containing a newline", () => {
            const csv = toCsv([item("hem", "home\nabode")]);
            expect(csv).toContain("\"home\nabode\"");
        });

        it("should leave an ordinary field unquoted", () => {
            expect(toCsv([item("hem", "home")])).toContain("hem,home,");
        });
    });

    describe("format", () => {
        it("should dispatch on the requested format", () => {
            const items = [item("hem", "home")];
            expect(format(items, "csv")).toBe(toCsv(items));
            expect(format(items, "anki")).toBe(toAnki(items));
            expect(format(items, "tsv")).toBe(toTsv(items));
            // The clipboard carries the same text the flashcard tools want.
            expect(format(items, "clipboard")).toBe(toTsv(items));
        });
    });

    describe("fileNameFor", () => {
        it("should use .csv only for CSV", () => {
            expect(fileNameFor("csv")).toMatch(/^lexin-history-\d{4}-\d{2}-\d{2}\.csv$/);
            expect(fileNameFor("tsv")).toMatch(/\.txt$/);
            expect(fileNameFor("anki")).toMatch(/\.txt$/);
        });
    });
});
