# Stay on Lexin's HTML service, and what its JSON output would buy

Lexin's service endpoint accepts `&output=JSON` parameter, mentioned in
passing on the *About* tab at `https://lexin.nada.kth.se/lexin/#about=1;main=3;`. It
returns a structured entry model rather than the display markup this extension has
scraped since it was written. The obvious question is whether Lexin's two parsing
regexes and the hand-rolled entity decoder can be deleted in favour of it.

They cannot, yet. **Sixty-five percent of live queries return JSON that `JSON.parse`
rejects**, because of a defect in the service's own serialiser. This ADR records the
measurement, its exact cause, and what the format would be worth if it were fixed — so
that the evaluation does not have to be done a second time.

## The endpoint

The URL is the one `LexinDictionary.createQueryUrl` already builds
(`src/scripts/dictionary/LexinDictionary.ts:89-94`), with one parameter appended:

```
https://lexin.nada.kth.se/lexin/service?searchinfo=to,swe_rus,bil&output=JSON
```

The value is case-sensitive in an unhelpful way. `JSON` and `json` both work; `Json`,
`jSoN`, and every other value tried — `XML`, `text`, `csv` — fall back silently to the
HTML document, with a `200` and no indication that the parameter was ignored. There is
no format negotiation by `Accept` header, and no version parameter.

Both directions work, so `from` lookups are covered. `Access-Control-Allow-Origin: *`
is present on the JSON response exactly as it is on the HTML one, so
[ADR 0003](0003-no-host-permissions.md)'s reasoning about needing no `host_permissions`
would carry over unchanged.

One oddity worth knowing: the response is served as
`Content-Type: application/json;charset=ISO-8859-1`. The charset is as untrue as it is
on the HTML endpoint, but here it does no harm — see below.

## Why it is not adopted: most responses are not valid JSON

When an entry's text contains a literal double quote, the serialiser emits `\u005c"`
where JSON requires `\"`. The escape `\u005c` denotes a backslash only *after* parsing;
it does not act as a structural escape during it. So the parser reads the string as
closed at the bare `"` that follows, and fails on the next character:

```json
"Comment": "om ålder \u005c"vuxen\u005c""
```

This is not an edge case. Lexin's lexicographers use double quotes to gloss idioms and
to qualify senses, so the pattern is dense in `Comment`, `Explanation`, and `Idiom`
content. A single `swe_rus/bil` response contains 52 occurrences and not one correctly
escaped quote.

Measured across the twenty Language Directions in `LexinDictionary.supportedLanguages`
by twelve common words — 240 queries — **156 failed `JSON.parse` outright**, a 65%
failure rate. The failures are not spread evenly: `swe_ara`, `swe_per`, `swe_som` and
`swe_swe` came back clean, and the other sixteen languages failed on most words. That
distribution is a property of which lexicons happen to use quoted glosses, not of the
languages themselves, so it should not be relied on.

A one-line repair applied before parsing:

```js
text.replace(/\\u005c"/g, '\\"')
```

took the same matrix, widened to 280 queries, to **280 passes**. That it fixes every
failure is also the evidence that this is the only malformation mode present — no
unescaped control characters, no truncation, no duplicate keys.

Which leaves the real objection. The repair works, but it is a string patch applied to
a third-party bug on an undocumented endpoint with no published contract. If KTH fixes
the serialiser, the patch is harmless. If KTH changes it some other way, the extension
breaks in a manner that looks like corrupt data rather than a failed request.

## What the JSON would buy

Enough that this is worth revisiting rather than closing. The bilingual shape carries,
under `BaseLang`: `Phonetic{File,Content}`, `Inflection[]`, `Meaning`, `Illustration[]`,
`Example[]`, `Compound[]`, `Idiom[]`, `Antonym[]`, `Graminfo`, `Usage`, `Reference`,
`Derivation`, `Explanation`, `Comment` and `Alternate`; and under `TargetLang`:
`Translation`, `Example[]`, `Compound[]`, `Synonym`, `Idiom[]` and `Derivation`.

The `Example`, `Compound` and `Idiom` entries carry matching `ID` values on both sides,
so a Swedish example can be paired with its translation:

```json
"BaseLang":   { "Example": [ { "Content": "åka bil", "ID": "1208" } ] },
"TargetLang": { "Example": [ { "Content": "ездить на машине", "ID": "1208" } ] }
```

Nothing in the HTML expresses that pairing except document order, which is why the
current parser does not attempt it.

Concretely, adopting it would:

- Retire both regexes in `src/scripts/dictionary/LexinDictionary.ts:58-86`, and with
  them the three-server-template catalogue documented above `parsingRegExp` that exists
  only because Lexin's markup differs per language.
- Retire `stripHtmlTags` and `decodeHtmlEntities`
  (`src/scripts/util/HtmlEntities.ts:54-103`) for Lexin. The JSON is pure ASCII with
  `\uXXXX` escapes throughout — 5003 of them in one document, and zero raw high bytes —
  so the numeric character references those functions were written to decode arrive
  already handled by `JSON.parse`.
- Make the charset lie inert. `FetchLoader.decode`
  (`src/scripts/dictionary/FetchLoader.ts:60-66`) exists because Lexin serves Latin-1
  bytes under `charset=utf-8`; an ASCII-only payload decodes identically either way, so
  the `fatal: true` fallback would stop mattering for this dictionary.
- Replace prose-scraping with a status field. `LexinDictionary.isWordFound`
  (`src/scripts/dictionary/LexinDictionary.ts:96-100`) currently looks for the Swedish
  strings `"Ingen unik träff"` and `"Ingen träff"` in the body, and the lowercase retry
  in `DictionaryBase` (`src/scripts/dictionary/DictionaryBase.ts:35-50`) depends on that
  working. The JSON answers `{"Status": "no matching"}`.
- Remove third-party markup from the DOM. `processTranslationHtml`
  (`src/scripts/util/TranslationUtils.ts:17-53`) assigns a whole remote document to
  `innerHTML` after neutralising `onclick` with a regex; the `swe_rus/bil` response
  carries 53 `onclick=` attributes, 53 `<img>` and 25 `<a href>`. Rendering from a
  parsed object would put none of it in the DOM, and would make the defensive styling
  that CONTEXT.md describes under *Translation Markup* unnecessary.

## What it would not solve

- **There are two schemas, not one.** `swe_swe` does not use `BaseLang`/`TargetLang` at
  all. It returns `Lexeme[]` with `Definition`, `Reference`, `Example` and `Cycle`, and
  its `Phonetic` is an *array* where the bilingual shape makes it an *object*. The split
  that `getParsingRegExp` (`src/scripts/dictionary/LexinDictionary.ts:84-86`) exists to
  handle moves into the type layer rather than disappearing, and the type inconsistency
  is a trap worth writing down.
- **Folkets has no JSON.** `folkets-lexikon.csc.kth.se` ignores `output=JSON` and
  returns HTML. So `HtmlEntities`, `LinkAdapter` and the `innerHTML` rendering path all
  stay regardless, and the extension would carry two response pipelines instead of one.
  No subsystem is removed outright; only Lexin's use of it.
- **The display layer would have to be written.** `getTranslation` returns a string that
  goes straight to `innerHTML` in both the Action Popup
  (`src/scripts/popup/PopupPage.ts:156-186`) and the Translation Card
  (`src/scripts/content/ContentScript.ts:324-334`). Rendering entries means building
  that markup here, for both surfaces, and changing the `ITranslation` shape that
  crosses the message bus (`src/scripts/common/Interfaces.ts:15-18`). This is the bulk
  of the work, and it is also where the benefit is — the two cannot be separated.
- **There is no payload saving.** Measured: +3% for `swe_rus/bil`, +48% for
  `swe_swe/under`, −17% for `swe_rus/katt`. A wash.

It is also worth recording why no partial adoption was chosen. Deriving history from
JSON while still displaying HTML would be a small, contained change — except that both
are fed by the *same* fetch in `TranslationManager.getTranslation`
(`src/scripts/dictionary/TranslationManager.ts:22-43`). Splitting them means two
requests per lookup against a service that is already the slowest part of a lookup. The
realistic choice is JSON as the single source, or the status quo.

## Re-measuring

The decision turns on one fact, and that fact is cheap to re-check:

```
curl -s "https://lexin.nada.kth.se/lexin/service?searchinfo=to,swe_rus,bil&output=JSON" \
  | node -e "let s='';process.stdin.on('data',d=>s+=d).on('end',()=>{try{JSON.parse(s);console.log('OK')}catch(e){console.log('FAIL:',e.message)}})"
```

Today this prints `FAIL`. If it ever prints `OK`, the serialiser has been fixed, the
main objection is gone, and the trade-off above is worth reading again.

## Consequences

- The extension continues to request and render Lexin's HTML. Nothing in `src/` changed
  for this ADR.
- The two Lexin regexes, the Folkets regex, and `HtmlEntities.ts` remain load-bearing,
  and keep the coverage they have in `tests/unit/LexinDictionaryTests.ts` and
  `tests/unit/HtmlEntitiesTests.ts`.
- `FetchLoader`'s encoding fallback stays necessary, since it is the HTML endpoint that
  mislabels its charset.
- The `output=JSON` parameter is now known to exist, which matters for a reader who
  finds it later and assumes it was simply overlooked. It was evaluated, at the 20
  languages × 12 words scale described above, and declined on the measured failure rate
  rather than on principle.
