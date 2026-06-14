# Stadia Maps — ToS, Caching, and Offline Behavior

Source: `https://stadiamaps.com/terms-of-service/`. Always consult the live document before relying on these rules — terms can change. The summary below was current as of 2026-04-12.

## Caching is permitted, with limits

- **Client-side only.** Server-side caching is explicitly prohibited.
- **TTL.** Cache obeys HTTP `Cache-Control` headers; in their absence, **7 days max**.
- **Bulk download for offline use.** Permitted "for the purpose of caching small amounts of data for offline use in a mobile application, **not to exceed 100 MB cached at a time per device**."

## What is prohibited

- "Bulk downloading of data" beyond the 100 MB / per-device exception above.
- Building "derivative databases by systematically extracting, reutilizing, or compiling substantial portions of data."
- Server-side caching of any kind.
- Pre-rendering or stockpiling tiles for resale or redistribution.

## Satellite imagery has extra restrictions

For `alidade_satellite` (and any imagery-based style):

- "Process or bulk download Imagery" is prohibited.
- "Use Imagery to improve the geographical location of any imagery products" is prohibited.
- The standard 100 MB / 7-day rules still apply on top of these.

## Per-account limits

Stadia reserves the right to "charge or invoice, suspend, or terminate a Member who exceeds their usage limits." Per-tile counts aren't specified — limits are enforced at the account/usage level rather than as hard counts.

## Implications for Numanac

When the offline tile system is rebuilt, the design must ensure:

1. **Hard 100 MB device cap** on tile storage. LRU eviction (or similar) must keep totals under that bound.
2. **Tiles refresh at least every 7 days.** Stale entries past 7 days must be re-fetched, not served from cache.
3. **No tile bundling.** Cache must be populated by the device at runtime — no pre-cached tiles shipped in the app binary.
4. **Field boundaries cache separately.** Convex-sourced field/farm/tract data is not Stadia tiles, so it doesn't count against the 100 MB cap and isn't subject to the 7-day rule. Persist it independently.
5. **Cellular download requires user opt-in.** Not a Stadia rule, but a UX choice consistent with the bandwidth-conscious tone of the ToS — and sensible given the 100 MB cap.

## HTTP cache headers

Stadia tile responses include `Cache-Control` headers. The MapLibre Native HTTP stack honors these by default. For legitimate ambient caching you generally do not need to override caching at the app level — only when implementing explicit offline behavior on top of the default cache.

## What this skill deliberately does NOT cover

- **`MLNOfflineStorage` API specifics.** The previous offline implementation used this and is being rewritten as of 2026-04-12. Documenting the old approach here would produce stale guidance. Once the new design lands, this file should be extended (or a sibling `offline.md` created) to describe the chosen approach against the constraints above.
