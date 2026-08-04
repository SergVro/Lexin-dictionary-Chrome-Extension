# Ship no host permissions, and reach both dictionaries over HTTPS

The manifest declared `host_permissions` for `http://lexin.nada.kth.se/*` and
`http://folkets-lexikon.csc.kth.se/*` from the Manifest V2 days, when a cross-origin
request from the background page needed one. Under Manifest V3 the field buys this
extension nothing: both services answer with `Access-Control-Allow-Origin: *`, so the
lookups succeed as ordinary CORS requests. The field is gone, and the query URLs moved
from `http://` to `https://` in the same change — commit `94937c1`, *"update API URLs to
use HTTPS and remove unnecessary host permissions"* (#55). This ADR records the reasoning
behind that commit, written after it landed.

## Why the permission was never load-bearing

`host_permissions` grants an extension a CORS bypass, cookie access on the host,
and the right to script or read tabs on it. Four facts, each checked, rule out all of
them here:

1. **Both services send `Access-Control-Allow-Origin: *`**, over `http://` and
   `https://` alike. That header is what makes the bypass redundant — the fetch
   succeeds on its own merits.
2. **Every fetch runs from an extension origin.** The only `fetch()` in the codebase is
   `FetchLoader.get`, constructed in the service worker (`worker/background.ts`) and,
   by the default branch of `DictionaryFactory`, on the extension pages. No request is
   ever issued from a content script, so none inherits a web page's origin.
3. **Content scripts are injected by `content_scripts.matches`**, which is a separate
   manifest field. Dropping host permissions does not narrow, delay or otherwise affect
   injection.
4. **No Chrome API in use requires host access.** `ChromeMessageBus` calls
   `tabs.query`, `tabs.sendMessage` and `tabs.create`; none needs it, and nothing in
   the codebase reads `tab.url`, `title` or `favIconUrl` — the fields that would.
   This is the same reasoning that removed the `tabs` permission after a store
   rejection; see the doc comment in `tests/unit/ManifestTests.ts`.

Verification was end-to-end, not on paper. The Playwright suite mocks no network: tests
such as *translation should work in popup with Russian language* drive a real Chrome
instance carrying this manifest through live lookups against KTH and assert the real
answer (`bil` → `автомобиль`). All 53 passed with the field removed.

## What it costs, and what it does not buy

In favour:

- **The manifest stops claiming access it does not use.** The smallest surface that
  works is the one to ship, and a reviewer reading the manifest now sees a truthful
  account of what the extension reaches for.
- **One less thing to keep in sync.** The two host patterns were still spelled
  `http://` after the services gained TLS. A field that is not load-bearing rots
  quietly, because nothing fails when it goes stale.
- **Nothing to re-justify at submission.** Host permissions invite a reviewer question;
  an absent field does not.

Against — and this is the honest weakness of the decision:

- **Users see no difference at install.** `content_scripts` still matches
  `http://*/*` and `https://*/*`, which produces *"Read and change all your data on
  all websites"* — a warning that already subsumed the two hosts entirely. The
  permission surface is genuinely smaller; the store listing reads exactly the same.
  If shrinking what users are asked to consent to is the goal, the content script
  matches are the lever, and this change is not that lever.
- **It trades insurance for tidiness.** The field cost nothing to keep and insulated
  the extension from a server-side header change. Removing it makes correct operation
  depend on a header maintained by someone else, in exchange for a manifest that is
  merely more accurate. That is a defensible trade, but it is a trade.

## Risks

- **KTH drops or narrows `Access-Control-Allow-Origin`.** This is the live risk. Every
  lookup for both dictionaries would begin failing at once, with a CORS error in the
  service worker console and no other symptom — the UI would show only a failed
  lookup. Simultaneous failure of *both* dictionaries with a CORS message in the worker
  console is the signature; treat it as this cause until proven otherwise, and check
  the response headers before looking anywhere else.
- **A redirect to a host that sends no such header.** The bypass would have covered a
  redirect chain within the granted hosts. Nothing observed today relies on one.
- **Future code that needs host access.** Reading `tab.url`, injecting via
  `chrome.scripting`, reading cookies, or rewriting requests with
  `declarativeNetRequest` all require the host permission back. The `ManifestTests`
  guard will fail loudly if the field returns, which is the intended prompt to
  re-read this ADR rather than a reason to widen the expectation.
- **A fetch added to a content script.** It would carry the page's origin instead of
  the extension's. `ACAO: *` happens to cover that case too, so it would work — but it
  would work for a different reason than everything documented here, and would stop
  working if credentials were ever required.

## Restoring it

Restoring is a manifest-and-test change; no source file needs to move. Note the
patterns come back as `https://`, matching the URLs the dictionaries now build:

```json
"host_permissions": [
  "https://lexin.nada.kth.se/*",
  "https://folkets-lexikon.csc.kth.se/*"
],
```

Then flip the `should not request any host permission` case in
`tests/unit/ManifestTests.ts` back to an equality assertion against those two patterns,
and rebuild — `npm run build:copy` is what copies `src/manifest.json` into `dist/`.

Because the all-sites content script already warrants the broadest warning Chrome
shows, re-adding two narrower host patterns should introduce no new warning and so
should not force existing users through re-consent. That is an inference from the
warning hierarchy rather than something observed; confirm it on the submission preview
before shipping a restore to existing installs.

## Consequences

- `src/manifest.json` declares `permissions: ["storage"]` and no host field at all.
  A `ManifestTests` case asserts the absence, so a future addition is a deliberate act
  with a failing test to answer for it.
- Correct operation now depends on a response header the extension does not control.
  The diagnostic is written down under Risks precisely because the failure would
  otherwise look like a network outage or a parser bug.
- Both dictionaries are reached over TLS. This was independent of the permission
  change, but it is what makes the restored patterns `https://`, and it fixed a real
  defect alongside: the `http://` audio and image URLs the services write into their
  own markup were blocked as mixed content when the Translation Card rendered on an
  `https://` page. `LinkAdapter.toSecureUrl` now upgrades them. That fix is not covered
  by the e2e suite, whose test pages are served from `http://localhost:3456` — an
  insecure origin, where mixed-content blocking never triggers.
