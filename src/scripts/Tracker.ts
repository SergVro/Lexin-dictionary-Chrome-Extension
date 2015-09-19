/// <reference path="..\lib\google.analytics\ga.d.ts" />

declare var _gaq;

class Tracker {

    static doNotTrack: boolean = false; // should be true while running functional tests

    static track(eventTarget: string,  eventType: string, eventLabel?: string, eventValue?: number) {

        if (this.doNotTrack) {
            return;
        }

        //"hitType": "event",             // Required.
        //"eventCategory": eventTarget,   // Required.
        //"eventAction": eventType,       // Required.
        //"eventLabel": eventLabel,
        //"eventValue": eventValue

        var trackData: any[] = ["_trackEvent", eventTarget, eventType];
        if (eventLabel) {
            trackData.push(eventLabel);
        }
        if (eventValue) {
            trackData.push(eventValue);
        }
        _gaq.push(trackData);
    }

    static translation(langDirection: string): void {
        this.track( "translation", "ok", langDirection);
    }

    static translationError(langDirection: string): void {
        this.track( "translation", "error", langDirection);
    }

}

export = Tracker;
