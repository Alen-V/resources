# Stadia Maps — ToS, Caching, and Offline Behavior (Android)

Source: `https://stadiamaps.com/terms-of-service/`. Always consult the live document before relying on these rules — terms can change. The summary below was current as of 2026-04-14.

## Caching is permitted, with limits

- **Client-side only.** Server-side caching is explicitly prohibited.
- **TTL.** Cache obeys HTTP `Cache-Control` headers; in their absence, **7 days max**.
- **Bulk download for offline use.** Permitted "for the purpose of caching small amounts of data for offline use in a mobile application, **not to exceed 100 MB cached at a time per device**."

These limits apply **globally** — same numbers as iOS, same rules, no Android exception.

## What is prohibited

- "Bulk downloading of data" beyond the 100 MB / per-device exception above.
- Building "derivative databases by systematically extracting, reutilizing, or compiling substantial portions of data."
- Server-side caching of any kind.
- Pre-rendering or stockpiling tiles for resale or redistribution.
- Shipping pre-populated tile caches inside the APK / AAB.

## Satellite imagery has extra restrictions

For `alidade_satellite` (and any imagery-based style):

- "Process or bulk download Imagery" is prohibited.
- "Use Imagery to improve the geographical location of any imagery products" is prohibited.
- The standard 100 MB / 7-day rules still apply on top of these.

## Per-account limits

Stadia reserves the right to "charge or invoice, suspend, or terminate a Member who exceeds their usage limits." Per-tile counts aren't specified — limits are enforced at the account/usage level rather than as hard counts.

## Implications for Numanac Android

When the offline tile system is designed (not yet codified — see "What this skill deliberately does NOT cover" below), the design must ensure:

1. **Hard 100 MB device cap** on tile storage. LRU eviction (or similar) must keep totals under that bound. MapLibre Native Android's `OfflineManager` uses a single SQLite file at the ambient cache location; an explicit size budget must be enforced by the app, not assumed from the framework.
2. **Tiles refresh at least every 7 days.** Stale entries past 7 days must be re-fetched, not served from cache.
3. **No tile bundling.** Cache must be populated by the device at runtime — no pre-cached tiles shipped in the APK / AAB or downloaded from a Numanac-owned CDN.
4. **Field boundaries cache separately.** Convex-sourced field/farm/tract data is not Stadia tiles, so it doesn't count against the 100 MB cap and isn't subject to the 7-day rule. Persist it independently (DataStore, Room, or file-backed JSON snapshot).
5. **Cellular download requires user opt-in.** Not a Stadia rule, but a UX choice consistent with the bandwidth-conscious tone of the ToS — and sensible given the 100 MB cap. Android's `ConnectivityManager.NetworkCapabilities.NET_CAPABILITY_NOT_METERED` is the canonical check.

## HTTP cache headers

Stadia tile responses include `Cache-Control` headers. The MapLibre Native Android HTTP stack (OkHttp under the hood) honors these by default via its ambient disk cache. For legitimate ambient caching you generally do not need to override caching at the app level — only when implementing explicit offline behavior on top of the default cache.

## `OfflineManager` / `OfflineRegion` — exists but not yet designed

MapLibre Native Android ships an offline API (`org.maplibre.android.offline.OfflineManager`, `OfflineRegion`, `OfflineRegionDefinition`) that downloads tile packs for a bounded region. This skill **deliberately does not prescribe how to use it** because the Numanac Android offline strategy hasn't been designed yet. When the design lands it must satisfy the 5 constraints above.

Until then: do not introduce `OfflineManager` usage without a separate design pass.

## What this skill deliberately does NOT cover

- **`OfflineManager` API specifics and region download orchestration.** Mirrors the iOS `MLNOfflineStorage` omission — the Numanac offline strategy is still pending. Once the design lands, extend this file (or create a sibling `offline.md`) to describe the chosen approach against the constraints above.
- **Ambient cache tuning.** The default OkHttp-backed cache is fine for short-session browsing within the ToS limits. Overriding it requires the same offline design pass.
- **Background pre-fetch.** Not permitted under "no bulk pre-download"; even user-initiated region downloads must fit the 100 MB cap.
