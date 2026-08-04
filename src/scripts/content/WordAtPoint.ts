/**
 * Naming the word under a coordinate.
 *
 * This used to be a fallback, reached only when a double-click left no selection
 * behind. It is now what the double-click gesture asks first, so the gesture means
 * "the word I am pointing at" rather than "whatever happens to be selected". That is
 * what a reader performing it thinks it means, and it is why Shift can be a trigger
 * at all: Shift+click's own meaning is "extend the selection", so reading the
 * selection would grow the lookup a word at a time.
 *
 * The caret APIs answer for points inside the viewport only, which is no limit on a
 * reader - they cannot click a word they cannot see - but does mean the selection
 * fallback in the dblclick handler has to stay.
 */

/** How far either side of the caret to look. A word longer than this is not a word. */
const SCAN = 100;

/**
 * Letters, marks, digits and the joiners that appear inside words.
 *
 * Deliberately not `\w`, which is ASCII-only: in a Swedish dictionary it turns `björn`
 * into `bjrn`, and it is the accented words a reader is most likely to look up.
 */
const WORD_BEFORE = /[\p{L}\p{M}\p{N}_-]+$/u;
const WORD_AFTER = /^[\p{L}\p{M}\p{N}_-]+/u;

/** The word straddling `offset` in `text`, or "" if there is none. */
export function wordAtOffset(text: string, offset: number): string {
    if (!text) {
        return "";
    }
    const clamped = Math.max(0, Math.min(text.length, offset));
    const before = text.substring(Math.max(0, clamped - SCAN), clamped);
    const after = text.substring(clamped, Math.min(text.length, clamped + SCAN));

    const beforeMatch = before.match(WORD_BEFORE);
    const afterMatch = after.match(WORD_AFTER);

    return (beforeMatch ? beforeMatch[0] : "") + (afterMatch ? afterMatch[0] : "");
}

/** What the two caret APIs agree on, once their different shapes are set aside. */
interface ICaret {
    node: Node;
    offset: number;
}

interface ICaretPosition {
    offsetNode: Node;
    offset: number;
}

type CaretDocument = Document & {
    caretPositionFromPoint?(x: number, y: number): ICaretPosition | null;
};

/**
 * The caret nearest a viewport coordinate.
 *
 * Two APIs do this and they do not share a shape: caretRangeFromPoint returns a Range
 * (startContainer/startOffset), caretPositionFromPoint the standard CaretPosition
 * (offsetNode/offset). Chrome answers the first today, so reading the second one's
 * result as a Range - as this code used to - was quietly dead rather than wrong. It
 * would have become wrong the day Chrome dropped the non-standard one.
 */
function caretFromPoint(x: number, y: number): ICaret | null {
    const doc = document as CaretDocument;

    const range = doc.caretRangeFromPoint?.(x, y);
    if (range && range.startContainer) {
        return { node: range.startContainer, offset: range.startOffset };
    }

    const caretPosition = doc.caretPositionFromPoint?.(x, y);
    if (caretPosition && caretPosition.offsetNode) {
        return { node: caretPosition.offsetNode, offset: caretPosition.offset };
    }

    return null;
}

/** What the element is laid out as. */
function displayOf(element: Element): string {
    return window.getComputedStyle(element).display;
}

/**
 * Whether an element's text runs on with the text either side of it.
 *
 * Only `display: inline` and `display: contents` do. An inline-block is laid out
 * inline but is atomic - its text does not join a word across its edges - and
 * anything block-level plainly starts afresh.
 */
function flowsInlineDisplay(display: string): boolean {
    return display === "inline" || display === "contents";
}

function flowsInline(element: Element): boolean {
    return flowsInlineDisplay(displayOf(element));
}

/**
 * Whether an inline element pushes the text either side of it apart while
 * contributing no text of its own.
 *
 * An `<img>` between two words does: `bil<img>hund` is two words to the reader, and
 * collecting it as `bilhund` would look up a word that is not on the page. An empty
 * `<span>` does not - it renders nothing, and `h<span></span>und` is still one word.
 *
 * Asked as "does it take up room", rather than against a list of tag names, because
 * that is the question the reader's eye is answering. It gets `<img>`, `<svg>`,
 * form controls and custom elements right without naming any of them; it leaves
 * `<wbr>` and zero-width wrappers alone; and it catches an icon drawn by a
 * `::before` rule, whose glyph never appears in `textContent` at all.
 */
function separatesVisually(element: Element): boolean {
    if (element.textContent) {
        // It has text of its own; that text is what separates, or does not.
        return false;
    }
    return element.getBoundingClientRect().width > 0;
}

/** The nearest ancestor that starts a fresh run of text. */
function textContainer(node: Node): Element | null {
    let element = node.parentElement;
    while (element && element.parentElement && flowsInline(element)) {
        element = element.parentElement;
    }
    return element;
}

/**
 * A block's text as the reader sees it - one string across the inline elements
 * inside it - and where `caret` lands in that string.
 *
 * This is what makes `h<em>u</em>nd` one word rather than three. A page splits a word
 * whenever it emphasises, links or highlights part of it, which search results do to
 * almost every word they show, so scanning only the text node under the pointer
 * returns a fragment surprisingly often.
 */
function flowedTextAround(caret: ICaret): { text: string; offset: number } | null {
    const container = textContainer(caret.node);
    if (!container) {
        return null;
    }

    const collected = { text: "", offset: -1 };
    collectFlowedText(container, caret, collected);

    return collected.offset === -1 ? null : collected;
}

/**
 * Appends `element`'s text to `collected`, in the order a reader reads it.
 *
 * Anything that ends the run of text contributes a newline rather than nothing.
 * Eliding it would join the words either side: `bil<br>hund` would read as one word
 * `bilhund`, and a double-click on either half would look that up. A newline is not a
 * word character, so it separates them exactly as the reader sees them separated.
 */
function collectFlowedText(element: Element, caret: ICaret,
                           collected: { text: string; offset: number }): void {
    for (let i = 0; i < element.childNodes.length; i++) {
        const child = element.childNodes[i];

        if (child.nodeType === Node.TEXT_NODE) {
            if (child === caret.node) {
                collected.offset = collected.text.length + caret.offset;
            }
            collected.text += child.textContent || "";
            continue;
        }
        if (child.nodeType !== Node.ELEMENT_NODE) {
            continue;
        }

        const childElement = child as Element;
        const display = displayOf(childElement);

        // Nothing rendered means nothing to separate. `display: none` fails every
        // test for flowing inline, so without this a hidden element - `hidden`,
        // `display: none`, or a <script> the page left mid-sentence - would be taken
        // for a block and would cut the visible word in half.
        if (display === "none") {
            continue;
        }
        // A line break carries no text of its own, and a block starts a run of its
        // own - both end this one. Neither is descended into: a nested block's text
        // is not part of the text around the caret.
        if (childElement.tagName === "BR" || !flowsInlineDisplay(display)) {
            collected.text += "\n";
            continue;
        }
        if (separatesVisually(childElement)) {
            collected.text += "\n";
            continue;
        }
        collectFlowedText(childElement, caret, collected);
    }
}

/** The word under a viewport coordinate, or "" if that is not text. */
export function wordAtPoint(x: number, y: number): string {
    const caret = caretFromPoint(x, y);
    if (!caret || caret.node.nodeType !== Node.TEXT_NODE) {
        return "";
    }
    // The single node is the fallback: a detached node has no container to flow in,
    // and a caret the walker never reaches cannot be placed in the flowed text.
    const flowed = flowedTextAround(caret);
    return flowed
        ? wordAtOffset(flowed.text, flowed.offset)
        : wordAtOffset(caret.node.textContent || "", caret.offset);
}
