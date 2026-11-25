# Official episode playback review

Reviewed on November 25, 2026 from the production VPS.

The four South Park listings use official provider page links. The inspected pages do not provide a supported third-party embed. Movies & TV displays an explicit notice that embedded playback is unavailable.

| Episode              | Season | Episode number | Provider identifier | Result     |
| -------------------- | ------ | -------------- | ------------------- | ---------- |
| The Big Fix          | 25     | 2              | m339tu              | SAMEORIGIN |
| The Pandemic Special | 24     | 1              | yy0vjs              | SAMEORIGIN |
| #REHASH              | 18     | 9              | 2bf9a5              | SAMEORIGIN |
| Broadway Bro Down    | 15     | 11             | 1nq9xv              | SAMEORIGIN |

Every configured southpark.cc.com URL redirected through the provider's regional routing to www.southpark.de. Each final HTML response sent HTTP 200 and the response header `X-Frame-Options: SAMEORIGIN`. Browsers enforce this header and reject framing by play.pageflare.net. None of the four responses advertised an oEmbed discovery link. A search of official provider information did not establish a currently supported third-party full-episode embed endpoint for these listings.

These observations establish the limitation for the pages inspected from this location. They do not establish a universal provider licensing policy. Historical player documentation does not establish current full-episode embed support.

The existing official links and TV-MA labels remain. The provider controls age eligibility, region, advertisements and authentication. Embedded fullscreen, loading and playback controls for these listings depend on a supported provider embed becoming available.

Actual embedded playback could not be verified because a supported embed was unavailable. HTTP 200 confirms page availability only. The fallback was checked on desktop and phone layouts, including all four link destinations and search filtering.

To revisit this limitation, first obtain current provider documentation or provider-issued embed markup authorizing the intended use. Validate actual playback and mobile fullscreen within the provider's restrictions before publishing an embedded player.

## Sources

- [Official episode guide](https://southpark.cc.com/episodes)
- The four configured episode URLs in [official-episodes.ts](../src/lib/media/official-episodes.ts).
