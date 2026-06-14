# Synthesis & Scorecard

Apply a consistent weighted scoring rubric to the evidence collected. Produce a clear verdict with reasoning anchored to the findings. No new research — just synthesis.

## The scorecard

Score each of the seven dimensions on 1–5, where 1 is unfavorable and 5 is excellent. The dimensions are weighted by their typical predictive power for new-venture outcomes.

| Dimension | Weight | What 5 looks like | What 1 looks like |
|---|---|---|---|
| Market opportunity | 25% | Large, growing, reachable market with strong demand signals | Small, declining, or weak-signal market |
| Competitive position | 15% | Clear gap, defensible angle, room for differentiation | Saturated, dominant incumbents, no moat path |
| Customer pull | 20% | Vivid pain, paying for workarounds, eager waitlist behavior | Lukewarm interest, "nice to have" |
| Business model | 15% | Healthy unit economics, clear path to profitability | Negative or marginal unit economics, fuzzy model |
| Regulatory clarity | 10% | Low or background regulatory load | Gating regulation, active enforcement |
| Execution feasibility | 10% | Buildable with realistic team and capital | Requires breakthroughs, scarce expertise, or huge capital |
| Timing | 5% | Tailwinds clearly aligned, infrastructure ready | Too early or too late, market has moved on |

Weights are guidelines — adjust if the user's context warrants (e.g. regulatory weight should rise for fintech / health / crypto).

## Mapping evidence to scores

Build the score for each dimension from the prior steps' outputs:

- **Market opportunity** ← market sizing (size + growth) + demand signals (intensity)
- **Competitive position** ← competitor analysis (intensity) + business model (moat)
- **Customer pull** ← demand signals (depth) + customer segmentation (pain intensity) + pricing & WTP signals
- **Business model** ← business model section (unit economics quality)
- **Regulatory clarity** ← regulatory section verdict
- **Execution feasibility** ← cross-step judgment + risk register execution dimension
- **Timing** ← demand-signal trends + competitor failure analysis

For each score, write one sentence stating the score, the weighted contribution, and the dominant supporting evidence.

## Composite score

Composite = Σ (dimension score × weight × 20) → a number from 20 to 100.

| Composite | Verdict | Meaning |
|---|---|---|
| 80–100 | **GO** | Strong evidence the idea is worth pursuing now. Move to execution. |
| 65–79 | **CONDITIONAL GO** | Promising but specific conditions must be tested or met first. List them. |
| 45–64 | **PIVOT RECOMMENDED** | The idea has some signal but the current shape doesn't work. Suggest an adjacent shape that addresses the weak dimensions. |
| 20–44 | **NO-GO** | Strong evidence against pursuing this idea in its current form. Save the team's time. |

## Override conditions

Composite score is a guide, not a verdict generator. Override toward more cautious verdicts when any of these apply:
- A single risk-register score of 5 — regardless of composite, downgrade by one level (GO → CONDITIONAL GO, etc.)
- Active regulatory enforcement in the exact business model
- Multiple comparable startups shut down in the last 24 months without a clear reason the new idea is different
- Required capital meaningfully exceeds what the user has access to

State any override explicitly in the verdict reasoning.

## The verdict paragraph

Write 4–8 sentences that:
1. State the verdict and composite score
2. Identify the 2–3 dimensions that most drove the verdict
3. Name the single biggest open risk
4. Recommend the immediate next step (specific experiment or decision)

The verdict paragraph is what most readers will actually read. Make it self-contained.

## Conditional GO — list the conditions

If the verdict is Conditional GO, list 3–6 specific, testable conditions, each with:
- The condition itself ("validate 10 paying design partners at $X/mo")
- The metric or threshold that satisfies it
- The realistic time and cost to test

These map directly to the "recommended next experiments" section of the final report.

## Pivot — recommend a direction

If the verdict is Pivot, sketch one or two adjacent shapes the team could explore. Anchor the pivot in evidence: which dimension was weak, what alternative could fix it. Don't generate generic "what about AI?" pivots — be specific to the findings.

## Output for this step

The complete scorecard table with all seven dimensions scored, the composite number, the verdict label, the verdict paragraph, and (if applicable) the conditions list or pivot direction. These drop directly into the final report.
