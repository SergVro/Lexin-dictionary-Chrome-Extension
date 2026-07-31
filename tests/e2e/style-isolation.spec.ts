import { test, expect } from './fixtures';

/**
 * Guards the Translation Card against host page CSS.
 *
 * The card used to be a plain div in the page's DOM, defended only by class-scoped
 * stylesheets, and on aggressively styled sites it rendered with the page's
 * typography, colours and spacing instead of its own. It now renders inside an open
 * shadow root whose host element is neutralised with an inline
 * `all: initial !important`. See docs/adr/0001-shadow-dom-for-translation-card.md.
 *
 * Each assertion below names one leak vector, so a failure says which defence broke
 * rather than just "it looks wrong". The fixture page's CSS is annotated to match.
 *
 * Reading computed styles requires explicit .shadowRoot traversal: Playwright
 * *locators* pierce open shadow roots, but document.querySelector inside
 * page.evaluate does not.
 */

const HOSTILE_PAGE = 'http://localhost:3456/hostile-styles.html';

/** Lexin's swe_swe definition of "bil", the fixture's test word. */
const EXPECTED_TRANSLATION = 'ett fordon för ett litet antal personer';

/**
 * Alt+Double click the fixture's test word and wait for a real translation.
 *
 * Waiting only for the card to become visible would settle on the "Searching for..."
 * placeholder - a single string of our own text. Every assertion in this file needs
 * the dictionary's own h1/p/div/span/a/ul in the DOM, because those are the elements
 * the host page's CSS was reaching.
 */
async function summonCard(page: import('@playwright/test').Page) {
    const testWord = page.locator('#test-word');
    await expect(testWord).toBeVisible();
    const box = await testWord.boundingBox();

    await page.keyboard.down('Alt');
    await page.mouse.dblclick(box!.x + box!.width / 2, box!.y + box!.height / 2);
    await page.keyboard.up('Alt');

    // Locators pierce the open shadow root, so this finds the card's content area.
    const content = page.locator('.lexinTranslationContent');
    await expect(content).toBeVisible({ timeout: 15000 });
    await expect(content).toContainText(EXPECTED_TRANSLATION, { timeout: 15000 });
}

test.describe('Translation Card style isolation', () => {

    test.beforeEach(async ({ context, extensionId }) => {
        // swe_swe keeps the assertions independent of which language is stored.
        const popup = await context.newPage();
        await popup.goto(`chrome-extension://${extensionId}/html/popup.html`);
        await popup.waitForLoadState('domcontentloaded');
        await popup.waitForFunction(() => {
            const select = document.querySelector('#language') as HTMLSelectElement;
            return select && select.options.length > 0;
        });
        await popup.selectOption('#language', 'swe_swe');
        await popup.close();
    });

    test('card renders in an open shadow root, not the page DOM', async ({ context }) => {
        const page = await context.newPage();
        await page.goto(HOSTILE_PAGE);
        await page.waitForLoadState('domcontentloaded');
        await summonCard(page);

        const shape = await page.evaluate(() => {
            const host = document.querySelector('.lexinExtensionMainContainer') as HTMLElement;
            return {
                hasShadowRoot: !!host.shadowRoot,
                mode: host.shadowRoot ? 'open' : 'closed',
                // The card must NOT be reachable in the light DOM.
                cardInLightDom: !!document.querySelector('.lexinTranslationContainer'),
                hostAll: host.style.getPropertyValue('all'),
                hostAllPriority: host.style.getPropertyPriority('all')
            };
        });

        expect(shape.hasShadowRoot).toBe(true);
        expect(shape.mode).toBe('open');
        expect(shape.cardInLightDom).toBe(false);
        // Inline + important is the only thing a hostile page cannot outrank.
        expect(shape.hostAll).toBe('initial');
        expect(shape.hostAllPriority).toBe('important');

        await page.close();
    });

    test('page typography does not reach the card', async ({ context }) => {
        const page = await context.newPage();
        await page.goto(HOSTILE_PAGE);
        await page.waitForLoadState('domcontentloaded');
        await summonCard(page);

        const styles = await page.evaluate(() => {
            const host = document.querySelector('.lexinExtensionMainContainer') as HTMLElement;
            const root = host.shadowRoot!;
            const card = root.querySelector('.lexinTranslationContainer') as HTMLElement;
            const content = root.querySelector('.lexinTranslationContent') as HTMLElement;
            const card_ = getComputedStyle(card);
            const content_ = getComputedStyle(content);
            return {
                cardFontFamily: card_.fontFamily,
                cardColor: card_.color,
                cardBackground: card_.backgroundColor,
                cardLetterSpacing: card_.letterSpacing,
                cardTextTransform: card_.textTransform,
                cardWordSpacing: card_.wordSpacing,
                contentLetterSpacing: content_.letterSpacing,
                contentTextTransform: content_.textTransform
            };
        });

        // Leak 1 (specificity): the page sets these with * and !important.
        expect(styles.cardFontFamily).not.toContain('Comic Sans');
        expect(styles.cardColor).toBe('rgb(17, 24, 39)');       // not lime
        expect(styles.cardLetterSpacing).toBe('normal');        // not 6px

        // Leak 2 (inheritance): these come down from <body> with no !important at all,
        // which the old YUI reset did nothing about.
        expect(styles.cardBackground).toBe('rgb(255, 255, 255)'); // not magenta
        expect(styles.cardTextTransform).toBe('none');            // not uppercase
        // Chrome serialises initial word-spacing as 0px, though initial letter-spacing
        // is 'normal' - so assert the page's value was blocked rather than the spelling.
        expect(styles.cardWordSpacing).not.toBe('12px');
        expect(styles.contentTextTransform).toBe('none');
        expect(styles.contentLetterSpacing).toBe('normal');

        await page.close();
    });

    test('translation markup keeps the card styling, not the page styling', async ({ context }) => {
        const page = await context.newPage();
        await page.goto(HOSTILE_PAGE);
        await page.waitForLoadState('domcontentloaded');
        await summonCard(page);

        const styles = await page.evaluate(() => {
            const host = document.querySelector('.lexinExtensionMainContainer') as HTMLElement;
            const content = host.shadowRoot!.querySelector('.lexinTranslationContent') as HTMLElement;
            const read = (sel: string) => {
                const el = content.querySelector(sel) as HTMLElement | null;
                if (!el) { return null; }
                const s = getComputedStyle(el);
                return {
                    fontSize: s.fontSize,
                    color: s.color,
                    fontFamily: s.fontFamily,
                    fontWeight: s.fontWeight,
                    letterSpacing: s.letterSpacing,
                    textTransform: s.textTransform,
                    backgroundColor: s.backgroundColor,
                    borderStyle: s.borderStyle,
                    listStyleType: s.listStyleType,
                    width: el.getBoundingClientRect().width,
                    height: el.getBoundingClientRect().height
                };
            };
            return {
                elements: {
                    p: read('p'),
                    div: read('div'),
                    span: read('span'),
                    b: read('b'),
                    a: read('a'),
                    small: read('small'),
                    img: read('img'),
                    li: read('li')
                },
                cardWidth: (host.shadowRoot!.querySelector('.lexinTranslationContainer') as HTMLElement)
                    .getBoundingClientRect().width
            };
        });

        const el = styles.elements;

        // Fail loudly if the dictionary stops sending an element, rather than
        // quietly skipping its assertions and reporting a pass.
        for (const [name, value] of Object.entries(el)) {
            expect(value, `expected Translation Markup to contain <${name}>`).not.toBeNull();
        }

        // p, div and span carry most of the Translation Markup. span was styled by
        // nothing at all before this change, so it leaked completely.
        for (const node of [el.p!, el.div!, el.span!]) {
            expect(node.fontSize).not.toBe('30px');       // * !important
            expect(node.fontSize).not.toBe('34px');       // span !important
            expect(node.color).not.toBe('rgb(0, 255, 0)');
            expect(node.fontFamily).not.toContain('Comic Sans');
            expect(node.letterSpacing).toBe('normal');    // page forces 6px
            expect(node.textTransform).toBe('none');      // page forces uppercase
        }

        // The page paints every span magenta with a dashed red border.
        expect(el.span!.backgroundColor).toBe('rgba(0, 0, 0, 0)');
        expect(el.span!.borderStyle).toBe('none');

        expect(el.b!.fontWeight).toBe('600');            // page forces 900
        expect(el.a!.color).toBe('rgb(37, 99, 235)');    // not the page's red
        expect(el.a!.fontSize).toBe('14px');             // not 32px
        expect(el.small!.fontSize).toBe('12px');         // not 30px
        expect(el.li!.listStyleType).toBe('disc');       // page forces none

        // The page forces img to 900x900. Note this checks the boundary, not
        // card.css's `img { max-width: 100% }` - that rule is defensive against the
        // dictionary itself serving an oversized image, which this response does not,
        // so removing it does not make this assertion fail.
        expect(el.img!.width).toBeLessThan(900);
        expect(el.img!.height).toBeLessThan(900);
        expect(el.img!.width).toBeLessThanOrEqual(styles.cardWidth);

        await page.close();
    });

    test('card stays in the viewport despite a transformed host element', async ({ context }) => {
        const page = await context.newPage();
        await page.goto(HOSTILE_PAGE);
        await page.waitForLoadState('domcontentloaded');
        await summonCard(page);

        // Leak 3 (containing block). The fixture applies transform/filter/will-change
        // to every div, which includes the card's host. Any of them would make the host
        // the containing block for the card's position:fixed box, resolving its
        // coordinates against a host that sits below a 2400px spacer - putting the card
        // far below the fold. The inline all:initial!important on the host clears them.
        const geometry = await page.evaluate(() => {
            const host = document.querySelector('.lexinExtensionMainContainer') as HTMLElement;
            const card = host.shadowRoot!.querySelector('.lexinTranslationContainer') as HTMLElement;
            const rect = card.getBoundingClientRect();
            const hostStyle = getComputedStyle(host);
            return {
                top: rect.top,
                left: rect.left,
                width: rect.width,
                height: rect.height,
                viewportHeight: window.innerHeight,
                viewportWidth: window.innerWidth,
                hostTransform: hostStyle.transform,
                hostFilter: hostStyle.filter,
                cardPosition: getComputedStyle(card).position
            };
        });

        expect(geometry.cardPosition).toBe('fixed');
        // The host must carry none of the containing-block triggers the page set.
        expect(geometry.hostTransform).toBe('none');
        expect(geometry.hostFilter).toBe('none');

        // And so the card must be on screen, not pushed down past the spacer.
        expect(geometry.top).toBeGreaterThanOrEqual(0);
        expect(geometry.top).toBeLessThan(geometry.viewportHeight);
        expect(geometry.left).toBeGreaterThanOrEqual(0);
        expect(geometry.left).toBeLessThan(geometry.viewportWidth);
        expect(geometry.width).toBeGreaterThan(0);
        expect(geometry.height).toBeGreaterThan(0);

        await page.close();
    });

    test('extension injects no stylesheet into the page', async ({ context }) => {
        const page = await context.newPage();
        await page.goto(HOSTILE_PAGE);
        await page.waitForLoadState('domcontentloaded');
        await summonCard(page);

        // content_scripts declares no css, and the host element is styled inline, so
        // the page's own stylesheet list should be untouched by the extension.
        const pageSheets = await page.evaluate(() =>
            Array.from(document.styleSheets)
                .map((sheet) => sheet.href)
                .filter((href): href is string => !!href)
        );

        expect(pageSheets.filter((href) => href.startsWith('chrome-extension://'))).toEqual([]);

        await page.close();
    });
});
