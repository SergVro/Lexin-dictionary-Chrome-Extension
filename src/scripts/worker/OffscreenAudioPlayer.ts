import { IAudioPlayer } from "../common/Interfaces.js";
import MessageBus from "../messaging/MessageBus.js";
import MessageType from "../messaging/MessageType.js";

/**
 * Plays a pronunciation clip through an Offscreen Document, creating one on demand.
 *
 * A service worker has no <audio> element and every other context this extension
 * runs in is a web page - either literally, for the Translation Card, or an
 * extension page. The card's context is the problem: a media element it creates
 * belongs to the host page's document, so the clip loads under *that page's* CSP,
 * and a site with a strict default-src blocks it outright. An Offscreen Document is
 * an extension page, so the clip loads under the extension's own policy no matter
 * which site the reader is on. See docs/adr/0004-offscreen-audio-playback.md.
 */
class OffscreenAudioPlayer implements IAudioPlayer {

    private static readonly PAGE = "html/offscreen.html";

    /**
     * In-flight createDocument, if any. Chrome allows one Offscreen Document per
     * extension and rejects a second createDocument, so two clicks in quick
     * succession have to queue behind one creation rather than race into it.
     */
    private creating: Promise<void> | null = null;

    async play(url: string): Promise<void> {
        if (await this.request(url)) {
            return;
        }
        // Nobody answered. Chrome closes an AUDIO_PLAYBACK document after 30 seconds
        // of silence, and it can do so between the check below and the message going
        // out - so the one thing worth doing is asking again against a document we
        // know was just created. Exactly one retry: a second silence is a real
        // failure, not a race.
        if (!await this.request(url)) {
            console.error("playAudio: the Offscreen Document did not answer", url);
        }
    }

    /** Sends the clip to the Offscreen Document. False when nothing answered. */
    private async request(url: string): Promise<boolean> {
        try {
            await this.ensureDocument();
        } catch (error) {
            console.error("playAudio: could not open the Offscreen Document", error);
            return false;
        }
        const played = await MessageBus.Instance.sendMessage(
            MessageType.playAudioInOffscreenDocument, {url: url});
        return played === true;
    }

    /**
     * Serialised through `creating` whether or not it ends up creating anything, so
     * that a caller arriving mid-creation waits for the same promise instead of
     * seeing "no document" and asking for a second one.
     */
    private ensureDocument(): Promise<void> {
        if (!this.creating) {
            this.creating = this.createDocument().finally(() => {
                this.creating = null;
            });
        }
        return this.creating;
    }

    private async createDocument(): Promise<void> {
        if (await this.hasDocument()) {
            return;
        }
        try {
            await chrome.offscreen.createDocument({
                url: OffscreenAudioPlayer.PAGE,
                reasons: [chrome.offscreen.Reason.AUDIO_PLAYBACK],
                justification: "Play the pronunciation clip behind the dictionary's LYSSNA button."
            });
        } catch (error) {
            // A document that appeared between the check and the call - another
            // service worker instance got there first - is the state we wanted.
            if (!await this.hasDocument()) {
                throw error;
            }
        }
    }

    private async hasDocument(): Promise<boolean> {
        const contexts = await chrome.runtime.getContexts({
            contextTypes: ["OFFSCREEN_DOCUMENT" as chrome.runtime.ContextType],
            documentUrls: [chrome.runtime.getURL(OffscreenAudioPlayer.PAGE)]
        });
        return contexts.length > 0;
    }
}

export default OffscreenAudioPlayer;
