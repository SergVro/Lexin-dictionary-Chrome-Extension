var playerTemplate = '<audio><source src="MP3_FILE_URL" type="audio/mp3" /></audio>';

function adaptLinks(tanslationContainer) {

    $('a', tanslationContainer).attr('target', '_blank');

    $.each($('a', tanslationContainer), function (i, anchor) {
        var url = $(anchor).attr('href');
        if (url.match(/mp3$/)) { // if url is a MP3 file reference - cahnge link to play audio tag
            var playerHtml = playerTemplate.replace('MP3_FILE_URL', url);
            $(anchor).after(playerHtml);
            $(anchor).attr('href', '#').click(function (e) {
                $(this).next()[0].play();
                e.preventDefault();
                return false;
            });
        }
    });
}
