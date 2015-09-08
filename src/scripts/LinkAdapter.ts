/// <reference path="..\lib\jquery\jquery.d.ts" />
/// <reference path="..\lib\jquery.flash.d.ts" />

class LinkAdapter {

    static playerTemplate: string = "<audio><source src='MP3_FILE_URL' type='audio/mp3' /></audio>";

    static AdaptLinks(translationContainer: JQuery, adaptFlash?: boolean): void {
        $("a", translationContainer).attr("target", "_blank");

        $.each($("a", translationContainer), function (i, anchor) {
            var url = $(anchor).attr("href");
            if (url.match(/mp3$/)) { // if url is a MP3 file reference - change link to play audio tag
                var playerHtml = LinkAdapter.playerTemplate.replace("MP3_FILE_URL", url);
                $(anchor).after(playerHtml);
                $(anchor).attr("href", "#").click(function (e) {
                    (<HTMLAudioElement>$(this).next()[0]).play();
                    e.preventDefault();
                    return false;
                });
            }

            // TODO: This is not working because of content security policy that allows
            // referencing swf only with https
            if (adaptFlash && url.match(/swf$/)) { // embedding Folkets lexikon swf pronunciation files with jquery flash plugin
                var img = $("img", anchor);
                if (img.length > 0) {
                    $(img).remove();
                    $(anchor).flash({src: url, width: 21, height: 21});
                }
            }
        });

        $.each($("img", translationContainer), function (i, img) {
            var url = $(img).attr("src");
            if (!url.match(/^http/)) {
                $(img).attr("src", "http://folkets-lexikon.csc.kth.se/folkets/" + url); // relative image links for Folkets lexikon fix
            }
        });
    }
}

export = LinkAdapter;
