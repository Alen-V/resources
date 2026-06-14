# Risk Assessment

Consolidate the risks surfaced across the earlier steps into a structured register. This is not new research — it's synthesis of what you already found, scored consistently so the verdict step has clean inputs.

## Risk taxonomy

Score each dimension on a 1–5 scale where:
- **1** = Low risk, well understood, manageable
- **2** = Some risk, mitigations known
- **3** = Material risk, requires active management
- **4** = High risk, could materially impair the business
- **5** = Critical risk, could kill the business outright

### 1. Market risk
Will the target market be large enough, grow enough, and be reachable enough?
- Pulls from: market sizing, demand signals, customer segmentation
- Red flags: small or declining market, weak demand signals, hard-to-reach buyer

### 2. Competitive risk
Will competitors prevent the business from winning enough share?
- Pulls from: competitor analysis, business model defensibility
- Red flags: dominant incumbent, well-funded peers, big-tech adjacent threat, no clear moat

### 3. Execution risk
Can a team realistically build and ship this with the resources available?
- Pulls from: idea complexity, channel difficulty, unit economics requirements
- Red flags: requires breakthroughs not yet achieved, requires cold-start liquidity (marketplaces, networks), requires expertise the team lacks

### 4. Regulatory risk
Will regulation gate, constrain, or destabilize the business?
- Pulls from: regulatory landscape
- Red flags: any Gating regulation, active enforcement in the space, pending legislation

### 5. Technology risk
Does the solution depend on tech that may not work or may shift under the business?
- Red flags: depends on third-party API/platform with policy risk (e.g. building on top of a platform that competes), depends on unproven AI capability, depends on hardware not yet at price-point

### 6. Financing risk
Can the business raise / earn enough capital to reach the next milestone?
- Pulls from: unit economics, market sentiment, fundraising activity in the category
- Red flags: long payback period + capital-intensive build, hostile fundraising environment for the category, requires multiple large rounds before revenue

### 7. Timing risk
Is the idea too early or too late?
- Too early: market not ready, infrastructure missing, behavior change required
- Too late: incumbents entrenched, category mature, growth has flattened
- Often the most underrated risk. Look for: failed predecessors (too early), late-mover dynamics (too late)

## Risk register format

A table with these columns: dimension, score (1–5), top driver (one sentence), mitigation if any, residual concern. Example row:

| Dimension | Score | Top driver | Mitigation | Residual |
|---|---|---|---|---|
| Regulatory | 4 | Requires state-by-state money transmission license | Phase rollout starting with money-transmission-friendly states | Total compliance cost ~$2M before national coverage |

## Composite risk score

Sum the seven scores. Map total to a label:
- **7–14** — Low risk
- **15–21** — Moderate risk
- **22–28** — High risk
- **29–35** — Critical risk

A single 5 in any dimension warrants explicit highlighting regardless of total. Critical risks in one dimension often outweigh low risks across others.

## Falsifying tests

For each Material+ risk (score 3 or higher), propose one concrete experiment that could falsify the risk cheaply. These get surfaced in the report's "recommended next experiments" section.

Examples:
- Market risk → run 20 customer-discovery calls with target ICP
- Competitive risk → launch landing page A/B against competitor positioning, measure CTR
- Regulatory risk → consultation call with a domain-specialist lawyer ($1–3k)
- Technology risk → build the riskiest technical component as a 2-week spike

## Output for this step

A risk register table covering all seven dimensions, with the composite risk label, callouts for any single-dimension 4s or 5s, and the falsifying experiments list. Keep total length 300–500 words plus the table. This is one of the highest-value sections — investors and decision-makers will read this first.
