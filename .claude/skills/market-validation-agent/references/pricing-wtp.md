# Pricing & Willingness-to-Pay

Determine what the market will likely pay for the solution. This is downstream of competitor analysis (which gave you the pricing table) and demand signals (which gave you complaint patterns about existing pricing).

## Two questions to answer

1. **What's the realistic price range?** Anchored by competitor pricing, value delivered, and substitute costs.
2. **How sensitive is the target buyer to that price?** Anchored by complaints, churn signals, and budget context.

## Methods to combine

**Comparable pricing.** Already collected in the competitor step. Identify the modal pricing tier and any outliers. If competitors range $20–$200/month with most at $50–$80, that's the pricing corridor.

**Value-based estimate.** Translate the user's pain into money or time saved.
- B2B: hours saved × loaded hourly cost, revenue uplift, cost avoidance, risk reduction
- B2C: time saved valued at minimum wage as a floor, or willingness substitute (what would they have paid otherwise)
A common rule of thumb: customers will pay 10–25% of the value you deliver. Don't price the full value — leave clear upside for the buyer.

**Cost-plus floor.** Whatever the value delivered, the price must cover unit costs plus a reasonable gross margin. For SaaS, target 70%+ gross margin; for marketplaces, 30%+; for hardware, varies wildly by category.

**Substitute cost.** What does it cost to *not* solve the problem? Or to solve it with the current janky workaround? This sets a ceiling — if the workaround costs $5/month worth of pain, you cannot charge $50.

## WTP signals to surface

- Reviews complaining a competitor is *too expensive* → there's room at a lower price
- Reviews complaining a competitor is *too cheap and feature-light* → there's room at a higher price with more value
- "I'd pay [$X] for ___" forum posts — capture verbatim
- High churn at certain price tiers (usually surfaced in earnings calls or analyst write-ups)
- Free-tier ratios — if the dominant competitor's free-tier conversion is 2%, that's the WTP signal for the base of the market

Useful queries:
- `[competitor] too expensive reddit`
- `[competitor] pricing review`
- `would you pay for [category] reddit`
- `[category] pricing benchmark`

## Pricing model choice

Note which pricing models are common in the category and which seem to fit the use case:
- Per seat — works when value scales with users
- Usage-based — works when value scales with consumption (API calls, storage, transactions)
- Flat / tiered — works for predictable usage and simple buyer decision
- Freemium — works only with strong viral / self-serve dynamics and low marginal cost
- Marketplace take-rate — works for two-sided transactional markets
- Outcome-based — emerging in AI; works when outcome is measurable and attributable

Misaligned pricing models are a common failure mode — note any obvious mismatch with the buyer's mental model.

## Output for this step

A pricing & WTP section (200–400 words) with:
- Recommended pricing range and tier structure
- Recommended pricing model with justification
- Direct WTP evidence (2–4 quotes or signals with sources)
- Sensitivity flag (price-elastic vs price-inelastic segment) with reasoning

If the data is too thin to confidently recommend a price, say so and recommend running a small pricing experiment (Van Westendorp or Gabor-Granger) as a next step.
