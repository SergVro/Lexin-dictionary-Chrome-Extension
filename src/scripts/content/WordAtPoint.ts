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

/**
 * Whether an element's text runs on with the text either side of it.
 *
 * Only `display: inline` and `display: contents` do. An inline-block is laid out
 * inline but is atomic - its text does not join a word across its edges - and
 * anything block-level plainly starts afresh.
 */
function flowsInline(element: Element): boolean {
    const display = window.getComputedStyle(element).display;
    return display === "inline" || display === "contents";
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

    const walker = document.createTreeWalker(container, NodeFilter.SHOW_TEXT | NodeFilter.SHOW_ELEMENT, {
        acceptNode: (node: Node) => {
            if (node.nodeType === Node.TEXT_NODE) {
                return NodeFilter.FILTER_ACCEPT;
            }
            // Descend into what runs on with its surroundings, and skip the rest
            // whole - a nested block's text belongs to a different run.
            return node === container || flowsInline(node as Element)
                ? NodeFilter.FILTER_SKIP
                : NodeFilter.FILTER_REJECT;
        }
    });

    let text = "";
    let offset = -1;
    let current = walker.nextNode();
    while (current) {
        if (current === caret.node) {
            offset = text.length + caret.offset;
        }
        text += current.textContent || "";
        current = walker.nextNode();
    }

    return offset === -1 ? null : { text, offset };
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
