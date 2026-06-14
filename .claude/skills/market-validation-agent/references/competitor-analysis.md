# Competitor Analysis

Map who else is solving this problem, how, for whom, at what price, and how well it's working for them. A market with zero competitors is usually a sign there's no market — not that you've found a hidden gem.

## Three layers of competition

1. **Direct competitors** — solving the same problem the same way for the same customer
2. **Indirect competitors** — solving the same problem a different way (e.g. a Notion template competing with a SaaS app)
3. **Substitutes & status quo** — what people are doing today, including "nothing" or "Excel"

Always cover all three. The status quo is the hardest competitor to displace.

## Discovery queries

- `best [category] tools [current year]`
- `[category] alternatives`
- `[idea description] competitors`
- `[competitor name] alternatives` — these landing pages list rivals
- `top [category] startups [current year]`
- `[category] G2 grid` / `[category] Gartner magic quadrant`
- `[category] crunchbase`

Aim for 8–15 candidate competitors before narrowing to a final list. Direct competitors deep-dive: 3–6. Indirect: 3–5. Substitutes: 2–4.

## For each direct competitor, capture

| Field | How to find it |
|---|---|
| Name & URL | Search results, G2 / Capterra |
| Positioning (one-line) | Their homepage hero |
| Pricing model & tiers | Their pricing page (`web_fetch` it) |
| Target segment | Their case studies and homepage testimonials |
| Funding stage & total raised | Crunchbase, PitchBook News, TechCrunch coverage |
| Headcount estimate | LinkedIn company page |
| Founded year | Crunchbase, About page |
| Traction signals | Customer counts in press releases, public revenue if disclosed, hiring volume |
| Strengths | What reviewers praise on G2, what investors highlighted |
| Weaknesses | 2–3 star reviews, churn complaints, gaps in features |

Use `web_fetch` on pricing pages — pricing changes often and snippets miss the structure.

## Pricing benchmark table

Always produce a small pricing table across the top 3–5 direct competitors. Note:
- Entry-level price (often the most-paid tier)
- Mid-tier price
- Enterprise / custom (note if "contact sales")
- Pricing axis — per seat, per usage, flat, freemium

This feeds directly into the pricing & WTP step. Do not skip it.

## Funding & traction signals

Recent fundraises tell you what investors believe about the market right now. Search:
- `[competitor] series A funding`
- `[competitor] raised`
- `[category] funding [current year]`

If multiple competitors have raised in the last 18 months, the category is "hot" — competitive pressure will be high but the market is validated. If no one has raised in 3+ years, either the market is mature and consolidated or it's stagnant.

## Failed-startup search

Run an explicit pass for failed competitors. This is one of the most undervalued research steps.
- `[category] startups that failed`
- `[category] shut down`
- `[competitor name] acquired` (acqui-hire often signals failure to scale)
- Search Hacker News for "Ask HN" and "Show HN" posts in the category 3–7 years old; check what happened to them

For each failed startup found, hypothesize *why* it failed: too early, distribution problem, wrong segment, unit economics, regulatory hit, founder issue. These hypotheses become risk factors in Step 8.

## Red flags to surface

- Three or more well-funded competitors with overlapping positioning and no clear winner — suggests a hard market to differentiate in
- A dominant incumbent with >60% market share and high switching costs
- A category where multiple recent startups have shut down or pivoted out
- An adjacent giant (Microsoft, Google, Salesforce, Adobe) building toward this space — check their recent product announcements
- All competitors converging on the same pricing tier — pricing power is weak

## Output for this step

A competitive landscape section (400–700 words) plus a pricing benchmark table, with verdict on competitive intensity (Low / Moderate / High / Saturated) and a paragraph on defensibility — what moat the new idea could build that incumbents lack. Every competitor mention carries a source URL.
