import * as DomUtils from "./util/DomUtils.js";
import * as Icons from "./util/Icons.js";
import ThemeManager, { applyTheme } from "./common/ThemeManager.js";
import { createChromeStorage } from "./common/ChromeStorageAdapter.js";

/**
 * The Help page has no state and no behaviour, so unlike the other four surfaces it
 * has no page class - there would be nothing for one to hold. This resolves the theme
 * and draws the icons, which have to be inline SVG rather than image files (see
 * util/Icons).
 */

const STEP_ICONS: { [name: string]: () => SVGElement } = {
    keyboard: Icons.keyboard,
    pointer: Icons.pointer,
    frame: Icons.frame
};

document.addEventListener("DOMContentLoaded", async () => {
    const { settingsStorage } = createChromeStorage();

    // Resolve the theme before anything renders, so the page does not flash light on
    // a dark desktop.
    const themeManager = new ThemeManager(settingsStorage);
    applyTheme(document.documentElement, await themeManager.getTheme());

    DomUtils.each(DomUtils.$$(".lxStepIcon"), (_index, element) => {
        const icon = STEP_ICONS[DomUtils.getAttr(element, "data-icon")];
        if (icon) {
            DomUtils.append(element, icon());
        }
    });

    // Every link in the list leaves the extension. Mark them so that is visible
    // before the click rather than after it.
    DomUtils.each(DomUtils.$$("a.lxLink[target='_blank']"), (_index, element) => {
        DomUtils.append(element, Icons.externalLink());
    });
});
