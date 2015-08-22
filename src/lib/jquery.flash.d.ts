/// <reference path="jquery\jquery.d.ts"/>

declare module JQueryFlash {
    interface htmlOptions {
        height: number;
        flashvars?: Object;
        pluginspage?: string;
        src: string
        type?: string
        width: number
    }
}
interface JQuery {
    flash(htmlOptions:JQueryFlash.htmlOptions)
    flash(htmlOptions:JQueryFlash.htmlOptions, pluginOptions, replace, update)
}