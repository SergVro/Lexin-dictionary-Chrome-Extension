import * as DomUtils from "./util/DomUtils.js";

class LinkAdapter {

    static playerTemplate: string = "<audio><source src='MP3_FILE_URL' type='audio/mp3' /></audio>";

    static AdaptLinks(translationContainer: HTMLElement | DocumentFragment, _adaptFlash?: boolean): void {
        const links = translationContainer.querySelectorAll("a");
        links.forEach((anchor) => {
            anchor.setAttribute("target", "_blank");
        });

        links.forEach((anchor) => {
            const url = anchor.getAttribute("href");
            if (url && url.match(/mp3$/)) { // if url is a MP3 file reference - change link to play audio tag
                const playerHtml = LinkAdapter.playerTemplate.replace("MP3_FILE_URL", url);
                const tempDiv = document.createElement("div");
                tempDiv.innerHTML = playerHtml;
                const audioElement = tempDiv.firstElementChild as HTMLElement;
                if (audioElement && anchor.parentNode) {
                    anchor.parentNode.insertBefore(audioElement, anchor.nextSibling);
                }
                anchor.setAttribute("href", "#");
                anchor.addEventListener("click", function (e) {
                    const nextSibling = anchor.nextElementSibling;
                    if (nextSibling) {
                        const audio = nextSibling.querySelector("audio") as HTMLAudioElement;
                        if (audio) {
                            audio.play();
                        }
                    }
                    e.preventDefault();
                });
            }

            // TODO: Flash is deprecated and no longer supported
            // Keeping this code commented out for historical reference
            // if (adaptFlash && url.match(/swf$/)) {
            //     var img = anchor.querySelector("img");
            //     if (img) {
            //         img.remove();
            //         // Flash functionality removed
            //     }
            // }
        });

        const images = translationContainer.querySelectorAll("img");
        images.forEach((img) => {
            const url = img.getAttribute("src");
            if (url && !url.match(/^http/)) {
                img.setAttribute("src", "http://folkets-lexikon.csc.kth.se/folkets/" + url); // relative image links for Folkets lexikon fix
            }
        });
    }
}

export default LinkAdapter;
