# Regulatory & Legal Landscape

Identify rules that gate, constrain, or materially shape the business. Regulatory surprises are one of the most common causes of late-stage startup failure — and one of the cheapest things to investigate up front.

## Categories to scan

**Privacy & data protection**
- GDPR (EU, UK) — applies to any business processing EU/UK resident data
- CCPA / CPRA (California) — applies broadly to companies serving California consumers
- LGPD (Brazil), PIPL (China), DPDP (India), POPIA (South Africa), PIPEDA (Canada)
- Sector-specific: HIPAA (US healthcare), FERPA (US education), COPPA (US under-13)

**Financial services**
- Money transmission licenses (US: state-by-state), e-money licenses (EU)
- AML / KYC / BSA compliance
- Securities regulations if any token, share, or interest is involved
- PCI-DSS for card data
- Lending licenses for credit products

**Healthcare**
- HIPAA / HITECH (US)
- FDA approval pathway if any medical claim or device function
- State medical board rules for telehealth
- EU MDR for medical devices

**AI-specific (rapidly evolving)**
- EU AI Act (risk-tiered obligations)
- US state laws (Colorado AI Act, NYC bias audit, California disclosure)
- Sectoral overlays (FDA for medical AI, EEOC for employment AI)

**Marketplace / platform**
- DSA / DMA (EU)
- Platform liability rules per jurisdiction
- Worker classification (gig economy)

**Industry-specific**
- Cannabis, alcohol, tobacco, firearms — heavily regulated, often state/province-specific
- Crypto — varying jurisdictional posture; SEC / CFTC / state regulators in US; MiCA in EU
- Real estate — broker licensing
- Insurance — state-by-state in US, country-by-country in EU
- Energy — utility regulation

**Cross-cutting**
- Tax registration and collection (sales tax / VAT — Wayfair decision in US)
- Consumer protection (FTC in US, equivalent agencies globally)
- Accessibility (ADA, WCAG)
- Export controls (especially for AI, semiconductors, dual-use tech)
- Employment law if hiring across borders

## Research approach

Run jurisdiction-by-jurisdiction for the target SAM. Useful queries:

- `[industry] regulations [country/region] [current year]`
- `[product type] license requirements [country]`
- `[category] FTC enforcement action [current year]`
- `[category] GDPR compliance`
- `[category] startup legal requirements`
- `[industry] recent legal action`
- Government / regulator websites directly (FTC, SEC, FDA, ICO, CNIL, EDPB)

Look explicitly for **recent enforcement actions** in the category — these tell you what regulators are actively pursuing right now, which is more informative than the static rule text.

## Severity scoring

For each identified regulation, classify:

- **Gating** — cannot launch without compliance (license, certification, approval). Quantify time and cost.
- **Constraining** — can launch but must comply ongoing (privacy, accessibility, disclosure). Quantify ongoing cost.
- **Background** — applies generally but does not specifically shape the product (sales tax, employment).

Surface anything Gating loudly — it changes the timeline and capital requirements.

## Cross-border friction

If the SAM crosses jurisdictions, note where compliance fragments the product:
- Different consent flows per region
- Data residency requirements (Russia, China, India, EU under specific cases)
- Different age-of-consent thresholds for minors
- Translation and localization legal requirements

## Red flags to surface

- A license that takes 12+ months and material capital to obtain (money transmission, banking, FDA Class II/III)
- Active enforcement against companies doing exactly what the idea proposes
- Regulatory ambiguity that competitors are exploiting — could close at any time
- Recent legislation pending that materially changes the calculus
- Operating model that requires regulatory arbitrage to be economic

## Output for this step

A regulatory section (200–500 words) listing each material regulation with jurisdiction, severity (Gating / Constraining / Background), cost-to-comply estimate where known, and source URL. Conclude with a one-line regulatory risk rating (Low / Moderate / High / Blocking) that feeds into the risk register.

If the idea has near-zero regulatory exposure (rare), say so explicitly rather than padding the section.
