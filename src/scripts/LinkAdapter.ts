import $ from "jquery";

class LinkAdapter {

    static playerTemplate: string = "<audio><source src='MP3_FILE_URL' type='audio/mp3' /></audio>";

    static AdaptLinks(translationContainer: JQuery, _adaptFlash?: boolean): void {
        $("a", translationContainer).attr("target", "_blank");

        $.each($("a", translationContainer), function (i, anchor) {
            const url = $(anchor).attr("href");
            if (url.match(/mp3$/)) { // if url is a MP3 file reference - change link to play audio tag
                const playerHtml = LinkAdapter.playerTemplate.replace("MP3_FILE_URL", url);
                $(anchor).after(playerHtml);
                $(anchor).attr("href", "#").click(function (e) {
                    (<HTMLAudioElement>$(this).next()[0]).play();
                    e.preventDefault();
                    return false;
                });
            }

            // TODO: Flash is deprecated and no longer supported
            // Keeping this code commented out for historical reference
            // if (adaptFlash && url.match(/swf$/)) {
            //     var img = $("img", anchor);
            //     if (img.length > 0) {
            //         $(img).remove();
            //         ($(anchor) as any).flash({src: url, width: 21, height: 21});
            //     }
            // }
        });

        $.each($("img", translationContainer), function (i, img) {
            const url = $(img).attr("src");
            if (!url.match(/^http/)) {
                $(img).attr("src", "http://folkets-lexikon.csc.kth.se/folkets/" + url); // relative image links for Folkets lexikon fix
            }
        });
    }
}

export default LinkAdapter;
