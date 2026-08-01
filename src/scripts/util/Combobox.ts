import * as DomUtils from "./DomUtils.js";
import * as Icons from "./Icons.js";

export interface IComboboxOption {
    value: string;
    text: string;
}

/**
 * Folds case and diacritics so "osterrike" finds "Österrike" and "SERBIAN" finds
 * "Serbian (Latin)". NFD splits a letter from its accent; the range strips the
 * accents that are left behind.
 */
function fold(value: string): string {
    return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
}

/**
 * Which options a query matches. Pure, and exported for that reason: the unit suite
 * runs under `environment: 'node'` with no DOM, so the matching rules are tested here
 * and the interaction around them in the e2e suite.
 *
 * Substring rather than prefix: the twenty languages include "Serbian (Cyrillic)" and
 * "Northern Kurdish", where the word a reader reaches for is not the first one.
 */
export function filterOptions(options: IComboboxOption[], query: string): IComboboxOption[] {
    const folded = fold(query.trim());
    if (!folded) {
        return options.slice();
    }
    return options.filter((option) => fold(option.text).indexOf(folded) >= 0);
}

let comboboxCount = 0;

/**
 * A filterable single-select, replacing the native <select> for the twenty languages.
 *
 * Follows the WAI-ARIA combobox pattern with list autocomplete: the input owns
 * `role="combobox"` and points at a `role="listbox"` through `aria-controls`, with the
 * highlighted option named by `aria-activedescendant` rather than focused - focus
 * stays in the input so typing keeps filtering.
 *
 * Built here rather than inside the Action Popup because the History page needs the
 * same control.
 */
class Combobox {

    private root: HTMLElement;
    private input: HTMLInputElement;
    private list: HTMLElement;
    private options: IComboboxOption[] = [];
    private visible: IComboboxOption[] = [];
    private activeIndex = -1;
    private selected: IComboboxOption | null = null;
    private open = false;
    private id: string;

    /** Called when the reader commits a different option. */
    onChange: (value: string) => void;

    constructor(root: HTMLElement, labelId?: string, placeholder?: string) {
        this.root = root;
        this.id = "lxCombo" + (++comboboxCount);

        DomUtils.addClass(this.root, "lxCombo");

        this.input = DomUtils.createElement("input", {
            type: "text",
            id: this.id + "Input",
            role: "combobox",
            autocomplete: "off",
            spellcheck: "false",
            "aria-expanded": "false",
            "aria-controls": this.id + "List",
            "aria-autocomplete": "list"
        }) as HTMLInputElement;
        DomUtils.addClass(this.input, "lxInput");
        if (placeholder) {
            DomUtils.setAttr(this.input, "placeholder", placeholder);
        }
        if (labelId) {
            DomUtils.setAttr(this.input, "aria-labelledby", labelId);
        }
        DomUtils.append(this.root, this.input);

        const chevron = Icons.chevronDown();
        chevron.setAttribute("class", "lxComboChevron");
        DomUtils.append(this.root, chevron);

        this.list = DomUtils.createElement("ul", {
            id: this.id + "List",
            role: "listbox",
            hidden: "hidden"
        });
        DomUtils.addClass(this.list, "lxComboList");
        DomUtils.append(this.root, this.list);

        this.subscribe();
    }

    setOptions(options: IComboboxOption[]): void {
        this.options = options.slice();
        if (this.selected && !this.options.some((option) => option.value === this.selected.value)) {
            this.selected = null;
        }
        this.renderInput();
    }

    get value(): string {
        return this.selected ? this.selected.value : "";
    }

    set value(next: string) {
        const match = this.options.filter((option) => option.value === next)[0];
        if (match) {
            this.selected = match;
            this.renderInput();
        }
    }

    private renderInput(): void {
        this.input.value = this.selected ? this.selected.text : "";
    }

    private subscribe(): void {
        this.input.addEventListener("focus", () => this.openList(""));
        this.input.addEventListener("click", () => this.openList(""));
        this.input.addEventListener("input", () => this.openList(this.input.value));
        this.input.addEventListener("keydown", (e: KeyboardEvent) => this.onKeyDown(e));

        // Committing on blur would fight the click handler on the option itself, so
        // the list closes and reverts instead - the click has already committed.
        this.input.addEventListener("blur", () => {
            // A click on an option blurs the input before the option's own click
            // handler runs; the timeout lets that land first.
            setTimeout(() => this.closeList(), 120);
        });
    }

    private openList(query: string): void {
        this.visible = filterOptions(this.options, query);
        this.activeIndex = this.visible.findIndex((option) =>
            this.selected && option.value === this.selected.value);
        this.open = true;
        this.renderList();
    }

    private closeList(): void {
        if (!this.open) {
            return;
        }
        this.open = false;
        this.activeIndex = -1;
        DomUtils.setAttr(this.list, "hidden", "hidden");
        DomUtils.setAttr(this.input, "aria-expanded", "false");
        this.input.removeAttribute("aria-activedescendant");
        // Whatever the reader typed while browsing is not a value; show what is.
        this.renderInput();
    }

    private renderList(): void {
        DomUtils.empty(this.list);

        this.visible.forEach((option, index) => {
            const item = DomUtils.createElement("li", {
                id: `${this.id}Option${index}`,
                role: "option",
                "aria-selected": (this.selected && this.selected.value === option.value) ? "true" : "false"
            }, option.text);
            DomUtils.addClass(item, "lxComboOption");
            if (index === this.activeIndex) {
                DomUtils.addClass(item, "lxComboOptionActive");
            }
            item.addEventListener("click", () => this.commit(option));
            DomUtils.append(this.list, item);
        });

        if (this.visible.length === 0) {
            const empty = DomUtils.createElement("li", { role: "presentation" }, "No language matches");
            DomUtils.addClass(empty, "lxComboEmpty");
            DomUtils.append(this.list, empty);
        }

        this.list.removeAttribute("hidden");
        DomUtils.setAttr(this.input, "aria-expanded", "true");
        this.setActiveDescendant();
    }

    private setActiveDescendant(): void {
        if (this.activeIndex >= 0 && this.activeIndex < this.visible.length) {
            DomUtils.setAttr(this.input, "aria-activedescendant", `${this.id}Option${this.activeIndex}`);
            const active = this.list.children[this.activeIndex] as HTMLElement;
            if (active && active.scrollIntoView) {
                active.scrollIntoView({ block: "nearest" });
            }
        } else {
            this.input.removeAttribute("aria-activedescendant");
        }
    }

    private moveActive(delta: number): void {
        if (!this.open) {
            this.openList("");
            return;
        }
        if (this.visible.length === 0) {
            return;
        }
        const next = this.activeIndex + delta;
        // Clamped, not wrapped: with twenty languages, wrapping past the end reads as
        // the list having jumped rather than as having reached the bottom.
        this.activeIndex = Math.max(0, Math.min(this.visible.length - 1, next));
        this.renderActiveState();
    }

    private renderActiveState(): void {
        DomUtils.each(this.list.children, (index, child) => {
            const item = child as HTMLElement;
            if (index === this.activeIndex) {
                DomUtils.addClass(item, "lxComboOptionActive");
            } else {
                DomUtils.removeClass(item, "lxComboOptionActive");
            }
        });
        this.setActiveDescendant();
    }

    private commit(option: IComboboxOption): void {
        const changed = !this.selected || this.selected.value !== option.value;
        this.selected = option;
        this.closeList();
        this.input.blur();
        if (changed && this.onChange) {
            this.onChange(option.value);
        }
    }

    private onKeyDown(e: KeyboardEvent): void {
        switch (e.key) {
            case "ArrowDown":
                e.preventDefault();
                this.moveActive(1);
                break;
            case "ArrowUp":
                e.preventDefault();
                this.moveActive(-1);
                break;
            case "Home":
                if (this.open) {
                    e.preventDefault();
                    this.activeIndex = 0;
                    this.renderActiveState();
                }
                break;
            case "End":
                if (this.open) {
                    e.preventDefault();
                    this.activeIndex = this.visible.length - 1;
                    this.renderActiveState();
                }
                break;
            case "Enter":
                if (this.open && this.activeIndex >= 0) {
                    e.preventDefault();
                    this.commit(this.visible[this.activeIndex]);
                }
                break;
            case "Escape":
                if (this.open) {
                    // Stop here: in the Action Popup an unhandled Escape closes the
                    // whole window, which is not what dismissing a list should do.
                    e.preventDefault();
                    e.stopPropagation();
                    this.closeList();
                }
                break;
            case "Tab":
                this.closeList();
                break;
        }
    }
}

export default Combobox;
