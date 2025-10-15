declare const _gaq: any[];

class Tracker {
    static track(eventTarget: string, eventType: string, eventLabel?: string, eventValue?: number): void {
        const trackData: any[] = ["_trackEvent", eventTarget, eventType];
        if (eventLabel) {
            trackData.push(eventLabel);
        }
        if (eventValue) {
            trackData.push(eventValue);
        }
        if (typeof _gaq !== "undefined") {
            _gaq.push(trackData);
        }
    }

    static translation(langDirection: string): void {
        this.track("translation", "ok", langDirection);
    }

    static translationError(langDirection: string): void {
        this.track("translation", "error", langDirection);
    }
}

export default Tracker;
