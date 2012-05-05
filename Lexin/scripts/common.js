var LexinExtensionCommon = function() {
    var playerTemplate = '<audio><source src="MP3_FILE_URL" type="audio/mp3" /></audio>';

    return {
        adaptLinks: function(tanslationContainer) {

            $('a', tanslationContainer).attr('target', '_blank');

            $.each($('a', tanslationContainer), function(i, anchor) {
                var url = $(anchor).attr('href');
                if (url.match( /mp3$/ )) { // if url is a MP3 file reference - change link to play audio tag
                    var playerHtml = playerTemplate.replace('MP3_FILE_URL', url);
                    $(anchor).after(playerHtml);
                    $(anchor).attr('href', '#').click(function(e) {
                        $(this).next()[0].play();
                        e.preventDefault();
                        return false;
                    });
                }
                if (url.match( /swf$/ )) { // embedding folkets lexikon swf pronunciation files with jquery flash plugin
                    var img = $('img', anchor);
                    if (img.length > 0) {
                        $(img).remove();
                        $(anchor).flash({ src: url, width: 21, height: 21 });
                    }
                }
            });

            $.each($('img', tanslationContainer), function(i, img) {
                var url = $(img).attr('src');
                if (!url.match( /^html/ )) {
                    $(img).attr('src', 'http://folkets-lexikon.csc.kth.se/folkets/' + url); // realative image links for folkets lexikon fix
                }
            });
        }
    };

}();