# Market Sizing (TAM / SAM / SOM)

Estimate the size of the opportunity at three levels of specificity. A good market-sizing section shows the methodology, cites multiple sources, and reconciles top-down with bottom-up estimates.

## The three numbers

- **TAM (Total Addressable Market)** — total worldwide revenue if every possible buyer bought your product. Useful as an upper bound; rarely actionable on its own.
- **SAM (Serviceable Available Market)** — the slice of TAM you could realistically serve given geography, segment focus, language, regulatory constraints, and channel reach.
- **SOM (Serviceable Obtainable Market)** — the slice of SAM you could realistically capture in 3–5 years given your team, capital, and competitive position. This is the number investors and operators actually care about.

## Use two methods, then reconcile

**Top-down** — start from a published industry total and narrow down.
- Find the headline industry size from at least 2 independent sources (Statista, Grand View Research, MarketsandMarkets, IBISWorld, Gartner, Forrester, McKinsey reports, government statistics, World Bank).
- Apply realistic narrowing percentages with justification (e.g. "of the $X global X market, ~30% is in our target geography, ~40% of that is in our target segment, so SAM = $X × 0.3 × 0.4").
- Cite each narrowing assumption.

**Bottom-up** — start from the unit economics and build up.
- Number of target customers × annual revenue per customer = market size.
- Use government population statistics, Census Bureau / Eurostat / national statistics offices for B2C, public company filings or industry directories for B2B counts.
- Apply realistic price per customer based on the competitor pricing benchmark from Step 3.

A bottom-up estimate within 2–3x of the top-down number is a healthy sign. Larger gaps mean one of your assumptions is wrong — investigate before reporting.

## Useful query patterns

- `global [category] market size [current year]`
- `[category] market report [current year]`
- `[category] CAGR forecast`
- `number of [target customer type] in [country]`
- `[industry] revenue [current year]`
- Government statistics offices: `census [demographic]`, `eurostat [industry]`, `bls.gov [occupation]`

After the search, `web_fetch` the most credible reports. Be aware that paid analyst reports usually only show summary stats in their public pages — that's still usable, but verify the number appears in 2+ sources before quoting.

## Growth rate

Always capture CAGR if available. A small-but-fast-growing market is often better than a large-but-flat market. Note the time horizon ("$X by 2030 at 12% CAGR from $Y in 2025"). If only one source gives a growth rate, mark it as a single-source estimate.

## Methodology disclosure

In the report, always show your work for SAM and SOM. Investors discount unsupported numbers heavily, and operators need to know which assumption to revisit if reality diverges. Something like:

> SAM calculation: global TAM of $42B [source 1, source 2] × 35% (North America + EU share, per source 3) × 25% (mid-market segment, per source 4) = **$3.7B**.

## Red flags to surface

- TAM numbers vary by more than 3x across sources — pick the most recent and credible, but note the range
- Industry reports are 4+ years old — extrapolate with caution and say so
- All sources are downstream of the same primary report (common with market-research aggregators)
- SAM equals TAM ("everyone in the world is our customer") — narrow it
- SOM is more than 10% of SAM in year 3 — usually unrealistic; tighten the assumption

## Output for this step

A market sizing section (300–500 words) with the three numbers stated clearly, methodology shown for SAM and SOM, growth rate, and at least 2 cited sources for TAM. Include a one-line judgment: is this market big enough to support a venture-scale outcome, a sustainable small business, or neither?
