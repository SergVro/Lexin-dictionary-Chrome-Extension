class LinkAdapter {

    static playerTemplate: string = "<audio src='MP3_FILE_URL' ></audio>";

    static AdaptLinks(translationContainer: HTMLElement | DocumentFragment, _adaptFlash?: boolean): void {
        const links = translationContainer.querySelectorAll("a");
        links.forEach((anchor) => {
            anchor.setAttribute("target", "_blank");
        });

        links.forEach((anchor) => {
            const onclick = anchor.getAttribute("onclick");
            if (onclick) {
                anchor.remove();
                return;
            }
            const url = anchor.getAttribute("href");

            if (url && url.match(/\.mp3$/)) {
                const playerHtml = LinkAdapter.playerTemplate.replace("MP3_FILE_URL", url);
                const tempDiv = document.createElement("div");
                tempDiv.innerHTML = playerHtml;
                const audioElement = tempDiv.firstElementChild as HTMLAudioElement;

                const playButton = document.createElement("a");
                playButton.href = "#";
                playButton.innerHTML = " &#9654;";
                playButton.addEventListener("click", (e) => {
                    e.preventDefault();
                    audioElement.play();
                });

                if (anchor.parentNode && audioElement) {
                    anchor.parentNode.insertBefore(
                        playButton,
                        anchor.nextSibling
                    );
                }
                anchor.remove();
            }
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
