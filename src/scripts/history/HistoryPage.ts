import HistoryModel, { IHistoryRow, ALL_DIRECTIONS } from "./HistoryModel.js";
import LanguageLabel from "../common/LanguageLabel.js";
import * as DomUtils from "../util/DomUtils.js";
import * as Icons from "../util/Icons.js";
import * as States from "../util/States.js";
import * as HistoryExport from "./HistoryExport.js";
import { confirmDialog } from "../util/Dialog.js";
import { showToast } from "../util/Toast.js";
import { fold } from "../util/Combobox.js";
import { DEFAULT_TRIGGER, gestureLabel, TriggerModifier } from "../common/LookupTrigger.js";

/** Identifies a row across a re-render, so selection survives searching. */
function rowKey(row: IHistoryRow): string {
    return `${row.langDirection}|${row.added}|${row.word}`;
}

/**
 * "Aug 1", or "Aug 1, 2025" once the year is no longer the current one.
 *
 * Not toDateString(): "Sat Aug 01 2026" is four times the width for one more fact,
 * in a column that repeats down a list of hundreds.
 */
function formatDate(added: number): string {
    const date = new Date(added);
    const thisYear = date.getFullYear() === new Date().getFullYear();
    return date.toLocaleDateString(undefined, thisYear
        ? { month: "short", day: "numeric" }
        : { year: "numeric", month: "short", day: "numeric" });
}

class HistoryPage {

    private model: HistoryModel;
    private languageLabel: LanguageLabel;

    private directions: string[] = [];
    private readerLanguage: string = "";
    private currentDirection: string = ALL_DIRECTIONS;
    private rows: IHistoryRow[] = [];
    private visible: IHistoryRow[] = [];
    private selected = new Set<string>();
    private query = "";
    private recording = true;

    /** Cached so renderTable, which is synchronous, can name the gesture. */
    private trigger: TriggerModifier = DEFAULT_TRIGGER;

    constructor(model: HistoryModel, languageLabel: LanguageLabel) {
        this.model = model;
        this.languageLabel = languageLabel;
        this.initialize();
    }

    private async initialize(): Promise<void> {
        DomUtils.append(DomUtils.$("#searchIcon"), Icons.search());

        this.readerLanguage = await this.model.getLanguage();
        this.recording = await this.model.getRecordHistory();
        this.trigger = await this.model.getTriggerModifier();
        this.directions = this.sortDirections(await this.model.loadDirections());

        // Open on the reader's own language when it has history; otherwise All, which
        // is also what a reader with a single direction sees.
        this.currentDirection = this.directions.indexOf(this.readerLanguage) >= 0
            ? this.readerLanguage
            : ALL_DIRECTIONS;

        this.renderTabs();
        this.subscribeOnEvents();
        await this.reload();
    }

    // ── Data ─────────────────────────────────────────────────────────────────────

    private async reload(): Promise<void> {
        this.rows = await this.model.loadHistory(this.currentDirection, this.directions);
        // A row that is gone can no longer be exported or deleted.
        const present = new Set(this.rows.map(rowKey));
        this.selected.forEach((key) => {
            if (!present.has(key)) {
                this.selected.delete(key);
            }
        });
        this.applyFilter();
    }

    private applyFilter(): void {
        const needle = fold(this.query.trim());
        this.visible = needle
            ? this.rows.filter((row) =>
                fold(row.word).indexOf(needle) >= 0 || fold(row.translation).indexOf(needle) >= 0)
            : this.rows.slice();
        this.renderTable();
        this.renderCount();
    }

    /** Checked rows, or - when nothing is checked - everything currently in view. */
    private exportSet(): IHistoryRow[] {
        const checked = this.visible.filter((row) => this.selected.has(rowKey(row)));
        return checked.length > 0 ? checked : this.visible;
    }

    // ── Rendering ────────────────────────────────────────────────────────────────

    /**
     * The reader's own Language Direction first, then the rest alphabetically.
     *
     * Storage hands them back in whatever order the keys happen to sit in, which
     * changes as directions come and go - a tab strip that reshuffles between visits
     * is one the eye cannot learn.
     */
    private sortDirections(directions: string[]): string[] {
        return directions.slice().sort((first, second) => {
            if (first === this.readerLanguage) { return -1; }
            if (second === this.readerLanguage) { return 1; }
            return this.languageLabel.describe(first).code
                .localeCompare(this.languageLabel.describe(second).code);
        });
    }

    private renderTabs(): void {
        const tabs = DomUtils.$("#directionTabs") as HTMLElement;
        DomUtils.empty(tabs);

        // A single direction needs no tabs at all - "All" and "sv→eng" would be the
        // same list under two names.
        if (this.directions.length < 2) {
            DomUtils.setAttr(tabs, "hidden", "hidden");
            return;
        }
        tabs.removeAttribute("hidden");

        const add = (direction: string, label: string, title: string) => {
            const tab = DomUtils.createElement("button", {
                type: "button",
                role: "tab",
                title: title,
                "aria-selected": direction === this.currentDirection ? "true" : "false"
            }, label);
            DomUtils.addClass(tab, "lxTab");
            tab.addEventListener("click", () => this.selectDirection(direction));
            DomUtils.append(tabs, tab);
        };

        add(ALL_DIRECTIONS, "All", "Every language direction");
        for (const direction of this.directions) {
            const label = this.languageLabel.describe(direction);
            add(direction, label.code, label.name);
        }
    }

    private async selectDirection(direction: string): Promise<void> {
        if (direction === this.currentDirection) {
            return;
        }
        this.currentDirection = direction;
        this.selected.clear();
        this.renderTabs();
        await this.reload();
    }

    private renderCount(): void {
        const count = DomUtils.$("#historyCount") as HTMLElement;
        const selectedInView = this.visible.filter((row) => this.selected.has(rowKey(row))).length;
        const words = `${this.visible.length} ${this.visible.length === 1 ? "word" : "words"}`;
        DomUtils.setText(count, selectedInView > 0 ? `${words} · ${selectedInView} selected` : words);
    }

    /**
     * What the third column is called: "Definition" once everything in the tab came
     * from the monolingual Swedish dictionary, which explains a word rather than
     * translating it.
     *
     * Read off the rows rather than the selected tab because a reader whose only
     * direction is swe_swe never sees a tab strip - their list arrives under All. Off
     * this.rows rather than this.visible so that searching cannot rename a column
     * mid-keystroke.
     */
    private translationHeading(): string {
        return this.rows.every((row) => this.languageLabel.isMonolingual(row.langDirection))
            ? "Definition"
            : "Translation";
    }

    private renderTable(): void {
        const container = DomUtils.$("#history") as HTMLElement;
        DomUtils.empty(container);

        if (this.rows.length === 0) {
            // An empty list has two quite different causes, and only one of them is
            // answered by "go and look a word up".
            DomUtils.append(container, this.recording
                ? States.emptyState(
                    "No translations yet",
                    `${gestureLabel(this.trigger, "double-click")} a word on any Swedish page ` +
                    "to start building your list.")
                : States.emptyState(
                    "Recording is off",
                    "Lookups are not being saved, so this list stays empty.",
                    this.recordingButton("Turn recording on", "lxButtonPrimary")));
            this.setToolbarEnabled(false);
            return;
        }
        this.setToolbarEnabled(true);

        // The list is here but frozen. Said once, above it, rather than leaving a
        // reader to work out for themselves why today's words never arrived.
        if (!this.recording) {
            DomUtils.append(container, this.recordingNotice());
        }

        if (this.visible.length === 0) {
            DomUtils.append(container, States.emptyState(
                "No matches",
                `Nothing in this list matches “${this.query.trim()}”.`));
            return;
        }

        const showLanguage = this.currentDirection === ALL_DIRECTIONS;

        const table = DomUtils.createElement("table");
        DomUtils.addClass(table, "lxTable");

        const thead = DomUtils.createElement("thead");
        const headRow = DomUtils.createElement("tr");

        const selectAllCell = DomUtils.createElement("th");
        DomUtils.addClass(selectAllCell, "lxColSelect");
        const selectAll = DomUtils.createElement("input", {
            type: "checkbox",
            "aria-label": "Select all rows in view"
        }) as HTMLInputElement;
        const allChecked = this.visible.every((row) => this.selected.has(rowKey(row)));
        selectAll.checked = allChecked;
        selectAll.addEventListener("change", () => {
            for (const row of this.visible) {
                if (selectAll.checked) {
                    this.selected.add(rowKey(row));
                } else {
                    this.selected.delete(rowKey(row));
                }
            }
            this.renderTable();
            this.renderCount();
        });
        DomUtils.append(selectAllCell, selectAll);
        DomUtils.append(headRow, selectAllCell);

        const head = (text: string, className?: string) => {
            const cell = DomUtils.createElement("th", undefined, text);
            if (className) {
                DomUtils.addClass(cell, className);
            }
            DomUtils.append(headRow, cell);
        };
        head("Date", "lxColDate");
        head("Word");
        head(this.translationHeading());
        if (showLanguage) {
            head("Language", "lxColLanguage");
        }
        head("", "lxColActions");

        DomUtils.append(thead, headRow);
        DomUtils.append(table, thead);

        const tbody = DomUtils.createElement("tbody");
        // One fragment, one reflow - the list runs to a thousand rows per direction.
        const fragment = document.createDocumentFragment();

        let previousDate = "";
        for (const row of this.visible) {
            const key = rowKey(row);
            const tr = DomUtils.createElement("tr");

            // Grouped on the full date, shown in the short one - two August 1sts a
            // year apart are different days.
            const dayKey = new Date(row.added).toDateString();
            const repeatsDay = dayKey === previousDate;
            previousDate = dayKey;

            const selectCell = DomUtils.createElement("td");
            DomUtils.addClass(selectCell, "lxColSelect");
            const checkbox = DomUtils.createElement("input", {
                type: "checkbox",
                "aria-label": `Select ${row.word}`
            }) as HTMLInputElement;
            checkbox.checked = this.selected.has(key);
            checkbox.addEventListener("change", () => {
                if (checkbox.checked) {
                    this.selected.add(key);
                } else {
                    this.selected.delete(key);
                }
                selectAll.checked = this.visible.every((each) => this.selected.has(rowKey(each)));
                this.renderCount();
            });
            DomUtils.append(selectCell, checkbox);
            DomUtils.append(tr, selectCell);

            // Blanked on a repeat so a day reads as one group.
            const dateCell = DomUtils.createElement("td", undefined,
                repeatsDay ? "" : formatDate(row.added));
            DomUtils.addClass(dateCell, "lxColDate");
            DomUtils.append(tr, dateCell);

            const wordCell = DomUtils.createElement("td", undefined, row.word);
            DomUtils.addClass(wordCell, "lxWord");
            DomUtils.append(tr, wordCell);

            DomUtils.append(tr, DomUtils.createElement("td", undefined, row.translation));

            if (showLanguage) {
                const label = this.languageLabel.describe(row.langDirection);
                const languageCell = DomUtils.createElement("td", { title: label.name }, label.code);
                DomUtils.addClass(languageCell, "lxColLanguage");
                DomUtils.append(tr, languageCell);
            }

            const actionsCell = DomUtils.createElement("td");
            DomUtils.addClass(actionsCell, "lxColActions");
            const remove = DomUtils.createElement("button", {
                type: "button",
                title: `Remove ${row.word}`,
                "aria-label": `Remove ${row.word}`
            });
            DomUtils.addClass(remove, "lxRowDelete");
            DomUtils.append(remove, Icons.trash());
            remove.addEventListener("click", async () => {
                await this.model.removeItem(row);
                this.selected.delete(key);
                await this.reload();
            });
            DomUtils.append(actionsCell, remove);
            DomUtils.append(tr, actionsCell);

            fragment.appendChild(tr);
        }

        tbody.appendChild(fragment);
        DomUtils.append(table, tbody);
        DomUtils.append(container, table);
    }

    /** A one-line reminder above a list that has stopped growing. */
    private recordingNotice(): HTMLElement {
        const notice = DomUtils.createElement("div", { role: "status" });
        DomUtils.addClass(notice, "lxNotice");

        const icon = Icons.info();
        icon.setAttribute("class", "lxNoticeIcon");
        DomUtils.append(notice, icon);

        DomUtils.append(notice, DomUtils.createElement("span", undefined,
            "Recording is off — new lookups are not being added to this list."));
        DomUtils.append(notice, this.recordingButton("Turn on", "lxButtonSecondary"));
        return notice;
    }

    private recordingButton(label: string, variant: string): HTMLElement {
        const button = DomUtils.createElement("button", { type: "button" }, label);
        DomUtils.addClass(button, "lxButton");
        DomUtils.addClass(button, variant);
        button.addEventListener("click", () => this.enableRecording());
        return button;
    }

    /**
     * Turned on from here rather than by sending the reader to Options.
     *
     * The service worker reads the setting per lookup out of the same chrome.storage,
     * so the next word is recorded without either page reloading.
     */
    private async enableRecording(): Promise<void> {
        await this.model.setRecordHistory(true);
        this.recording = true;
        showToast("Recording is on");
        this.renderTable();
    }

    private setToolbarEnabled(enabled: boolean): void {
        for (const id of ["#exportButton", "#clearHistory"]) {
            const button = DomUtils.$(id) as HTMLButtonElement;
            if (button) {
                button.disabled = !enabled;
            }
        }
    }

    // ── Events ───────────────────────────────────────────────────────────────────

    private subscribeOnEvents(): void {
        const search = DomUtils.$("#historySearch") as HTMLInputElement;
        search?.addEventListener("input", () => {
            this.query = search.value;
            this.applyFilter();
        });

        this.subscribeOnExportMenu();

        DomUtils.$("#clearHistory")?.addEventListener("click", () => this.clear());
    }

    private subscribeOnExportMenu(): void {
        const button = DomUtils.$("#exportButton") as HTMLButtonElement;
        const menu = DomUtils.$("#exportMenu") as HTMLElement;
        if (!button || !menu) {
            return;
        }

        const setOpen = (open: boolean) => {
            DomUtils.setAttr(button, "aria-expanded", open ? "true" : "false");
            if (open) {
                menu.removeAttribute("hidden");
                (menu.children[0] as HTMLElement).focus();
            } else {
                DomUtils.setAttr(menu, "hidden", "hidden");
            }
        };

        button.addEventListener("click", () => {
            setOpen(button.getAttribute("aria-expanded") !== "true");
        });

        DomUtils.each(menu.children, (_index, child) => {
            const item = child as HTMLElement;
            const run = () => {
                setOpen(false);
                button.focus();
                this.exportAs(DomUtils.getAttr(item, "data-format") as HistoryExport.ExportFormat);
            };
            item.addEventListener("click", run);
            item.addEventListener("keydown", (e: KeyboardEvent) => {
                if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    run();
                }
            });
        });

        menu.addEventListener("keydown", (e: KeyboardEvent) => {
            const items = Array.from(menu.children) as HTMLElement[];
            const index = items.indexOf(document.activeElement as HTMLElement);
            if (e.key === "ArrowDown") {
                e.preventDefault();
                items[Math.min(items.length - 1, index + 1)].focus();
            } else if (e.key === "ArrowUp") {
                e.preventDefault();
                items[Math.max(0, index - 1)].focus();
            } else if (e.key === "Escape") {
                e.preventDefault();
                setOpen(false);
                button.focus();
            }
        });

        document.addEventListener("click", (e: MouseEvent) => {
            if (!menu.hasAttribute("hidden") && !(e.target as Node).parentElement?.closest(".lxMenu")) {
                setOpen(false);
            }
        });
    }

    private async exportAs(exportFormat: HistoryExport.ExportFormat): Promise<void> {
        const items = this.exportSet();
        if (items.length === 0) {
            return;
        }
        const text = HistoryExport.format(items, exportFormat);

        if (exportFormat === "clipboard") {
            const copied = await HistoryExport.copyToClipboard(text);
            showToast(copied
                ? `${items.length} copied to clipboard`
                : "Could not copy to the clipboard");
            return;
        }
        HistoryExport.download(text, HistoryExport.fileNameFor(exportFormat));
    }

    private async clear(): Promise<void> {
        const clearingAll = this.currentDirection === ALL_DIRECTIONS;
        const what = clearingAll
            ? "every language direction"
            : this.languageLabel.describe(this.currentDirection).name;

        const confirmed = await confirmDialog({
            title: "Clear history?",
            body: `This removes every stored translation for ${what}. It cannot be undone — export first if you want to keep them.`,
            confirmLabel: "Clear history"
        });
        if (!confirmed) {
            return;
        }

        if (clearingAll) {
            await this.model.clearAll(this.directions);
        } else {
            await this.model.clearHistory(this.currentDirection);
        }

        this.selected.clear();
        this.directions = this.sortDirections(await this.model.loadDirections());
        if (this.directions.indexOf(this.currentDirection) < 0) {
            this.currentDirection = ALL_DIRECTIONS;
        }
        this.renderTabs();
        await this.reload();
    }
}

export default HistoryPage;
