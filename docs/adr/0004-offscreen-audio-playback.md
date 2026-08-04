# Play pronunciation clips in an Offscreen Document

The LYSSNA button worked in the Action Popup and on plain pages, and did nothing on
svt.se. The console on svt.se said why:

```
Loading media from 'https://lexin.nada.kth.se/sound/v2/390998_2.mp3' violates the
following Content Security Policy directive: "default-src blob: data: ... 'self'
'unsafe-eval' 'unsafe-inline'". Note that 'media-src' was not explicitly set, so
'default-src' is used as a fallback. The action has been blocked.
```

`LinkAdapter` played the clip with `new Audio(url)`. A content script runs in an
isolated world but shares the page's *document*, so the media element it creates is
the page's element and the clip is the page's subresource - checked against the
page's Content Security Policy, not the extension's. Any site whose `default-src`
(or `media-src`) omits `lexin.nada.kth.se` blocks it, which is every site that sets
a policy at all. 8sidor.se sets none, so the button worked there; svt.se sets a
strict one, so it did not. The mixed-content fix in ADR 0003 was a different
blocker on the same line of code and did not touch this one.

The clip now plays in an Offscreen Document: `LinkAdapter` sends `playAudio` to the
service worker, which opens `html/offscreen.html` on demand and forwards the URL to
it. An Offscreen Document is an extension page, so `script-src 'self'; object-src
'self'` - the extension's own policy, which restricts no media at all - is what
governs the load. No web page has a say.

## Why not the alternatives

- **Fetch the bytes and play them through the Web Audio API in the page.** CSP does
  not govern an `AudioBuffer`, so this works, and it keeps the sound attached to the
  reader's tab where the tab's mute control can reach it. It costs a base64 round
  trip of every clip through the message bus, and it makes playback depend on
  `Access-Control-Allow-Origin` on the sound host, which is the dependency ADR 0003
  already flags as the live risk for lookups. A media element in an extension page
  needs no CORS at all.
- **Load the clip in an iframe pointing at an extension page.** The frame would need
  `web_accessible_resources`, which `ManifestTests` forbids, and the page's
  `frame-src` would get a vote anyway.
- **Play it in the Action Popup.** The popup is not open when the card is.

## What it costs

- **A permission.** `permissions` is now `["storage", "offscreen"]`. Chrome shows no
  install warning for either, and the all-sites content script already produces the
  broadest warning there is, so no existing user is asked to re-consent. The store
  submission form may still ask what it is for; the answer is in
  `docs/store-listing.md`.
- **A seventh surface to build.** `offscreen/offscreen-main` in `build.js`, and
  `src/html/offscreen.html`, which is markup-free: the script creates the `<audio>`
  element.
- **The sound is no longer the tab's.** The reader's tab does not show the speaker
  icon while a clip plays, tab mute does not silence it, and a clip started from the
  Action Popup now finishes after the popup closes rather than being cut off. The
  last one is an improvement; the first two are a genuine, if small, loss.
- **One code path for both surfaces that render a translation.** The Action Popup
  goes through the worker too, though its own document could have played the clip
  itself. Two paths would mean the popup quietly covering for a card that is broken -
  which is exactly how this bug survived: it was only ever reproducible in the card.

## The document's lifetime is Chrome's, not ours

Nothing in this extension closes the Offscreen Document. Chrome closes a document
created with `AUDIO_PLAYBACK` after 30 seconds of silence, which is exactly the
policy we would have written, and a reader working through several words pays the
creation cost once.

The consequence is that "is a document open?" has a different answer on every click,
and `OffscreenAudioPlayer` is built around that:

- `chrome.runtime.getContexts` decides whether to create one, because
  `createDocument` rejects when a document already exists.
- Creation is serialised through a single in-flight promise, so two clicks in quick
  succession queue behind one creation instead of racing into a rejection.
- The document can close *between* that check and the message, and the message then
  lands nowhere. The clip is sent again, exactly once, against a document known to
  have just been created. This is why `AudioPlayback.play` answers `true`: without a
  response there is no way to tell a document that took the clip from one that was
  no longer there.

## Consequences

- `LinkAdapter` constructs no media element. If a future change reintroduces one in
  code that runs in a content script, it will work on every page the developer
  happens to test on and fail on the sites readers use.
- `OffscreenAudioPlayerTests` covers the lifetime rules with a `chrome` double;
  `tests/e2e/audio-playback.spec.ts` clicks LYSSNA on a fixture page carrying
  svt.se's policy and asserts the document opens and no violation is raised. That
  test does not assert a sound is produced: Playwright's Chromium ships without the
  proprietary decoders, so the clip reaches the document and fails to decode there.
  Nothing in the suite proves audio is audible - that check stays manual.
- Images in the dictionary's markup are still the page's subresources, and a strict
  policy blocks them the same way. Today that is one 11x11 download icon in Lexin's
  entries, and Folkets' inflection images for words that have them. This ADR does
  not address that; the fix would be a different mechanism again, since an `<img>`
  cannot be moved into an Offscreen Document.
