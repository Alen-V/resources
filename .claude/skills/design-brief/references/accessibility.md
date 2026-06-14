# Accessibility reference

Load this file whenever a brief touches accessibility — which is every brief. The main `SKILL.md` requires every brief to specify a WCAG conformance level in its Constraints section; this file explains what those levels mean in practice and how they translate per platform, so the brief gives a designer enough to actually meet the target rather than just naming it.

Always cross-reference the current W3C guidance:
- <https://www.w3.org/WAI/WCAG2AAA-Conformance> — the conformance levels page
- <https://www.w3.org/WAI/standards-guidelines/wcag/> — the WCAG overview
- <https://www.w3.org/WAI/fundamentals/accessibility-intro/> — introduction
- WCAG 2.2 is the current version (logos exist for 2.0, 2.1, and 2.2 at each conformance level)

If the brief is for a context where WCAG isn't the right standard (e.g., a legally required EN 301 549 or Section 508 conformance for government/EU), note that and adapt — the WCAG criteria are still the substance, the conformance framing changes.

## The three conformance levels

WCAG defines three levels. Higher levels include everything from lower levels:

- **Level A — Minimum.** Removes the most severe barriers. A brief targeting only Level A is almost always too low; treat it as the floor, not the goal.
- **Level AA — The working standard.** Most organizations, most public products, most legal requirements (ADA, EU EAA, AODA) align with AA. **This is the default for design briefs unless there's a specific reason to go higher or lower.**
- **Level AAA — Specialized.** AAA is appropriate for products serving audiences with disabilities directly (healthcare for visually impaired users, government services, education for diverse learners), or where regulation requires it. WCAG itself notes that AAA is not achievable for all content; expect to have to make case-by-case judgments.

**How to pick the level for a brief:**
- Public product, broad audience, no specific accessibility positioning → AA
- Government, healthcare, education, or audiences with known disability prevalence → AAA where feasible, AA elsewhere
- Internal tool, narrow user base, no regulatory pressure → AA (still the right default — internal users have disabilities too)
- "We don't care about accessibility" → push back; brief authors should default to AA regardless of stated preference. Accessibility is rarely a real cost saving and almost always a quality improvement.

If the brief authors don't know which level to target, default to **WCAG 2.2 Level AA** and document it as an assumption.

## The four WCAG principles (POUR)

WCAG is organized around four principles. Useful for briefs because they map to concrete design decisions:

- **Perceivable** — Users must be able to perceive the content. Drives: color contrast, text alternatives for images, captions, resizable text, content that doesn't rely on color alone.
- **Operable** — Users must be able to operate the interface. Drives: keyboard accessibility, sufficient time, no seizure-inducing motion, navigable structure, target sizes.
- **Understandable** — Content must be understandable. Drives: predictable behavior, error identification, clear instructions, plain language.
- **Robust** — Content must be robust enough to work with current and future assistive tech. Drives: valid markup, semantic HTML, proper ARIA, native components.

When writing a brief's accessibility section, structure thinking around POUR — it catches gaps that a flat checklist misses.

## The accessibility criteria that show up in design briefs most often

Out of WCAG's 87 success criteria, these are the ones that affect design decisions directly. A brief should address each.

### Color contrast
- **AA:** Text contrast ratio ≥ 4.5:1 for normal text, ≥ 3:1 for large text (≥18pt or ≥14pt bold)
- **AAA:** ≥ 7:1 for normal text, ≥ 4.5:1 for large text
- **Non-text contrast (both AA and AAA):** UI components and graphical objects ≥ 3:1 against adjacent colors
- Brief should specify: contrast targets, and that the designer must verify primary text/background pairs

### Text and typography
- **AA:** Text resizable to 200% without loss of content/function
- **AAA:** Line spacing ≥ 1.5× within paragraphs, paragraph spacing ≥ 2× line spacing; users can override font/spacing
- On iOS/Android, this maps to Dynamic Type / Material font scale — the brief just needs to require system text styles
- On web, the brief needs to specify text in `rem`/`em` units, not fixed `px`, so user font-size preferences propagate

### Target sizes
- **WCAG 2.2 AA:** Pointer target size ≥ 24×24 CSS pixels (with exceptions for inline targets and equivalents)
- **AAA:** ≥ 44×44 CSS pixels
- iOS guidance is ≥ 44×44 points (matches AAA already); Android Material recommends ≥ 48×48 dp
- Brief should state minimum target size for the platform

### Focus and keyboard
- **AA:** All interactive elements keyboard-accessible; focus visible; no keyboard trap; focus order makes sense
- **AAA:** Focus has clear visual style not solely color-dependent; focus appearance has minimum size and contrast
- Brief should require: visible focus styles spec'd as part of every interactive element, logical tab order, no mouse-only interactions
- On native iOS/Android, focus is system-handled if native components are used — another reason "native components by default" matters

### Motion and animation
- **AA:** Users can pause/stop/hide any auto-updating content >5 seconds; no flashing >3 times per second
- **AAA:** Animation from interactions can be disabled (unless essential)
- Brief should require: respect for `prefers-reduced-motion` (web) / Reduce Motion (iOS) / Remove Animations (Android); no auto-playing animations that block interaction

### Text alternatives
- **A:** Non-text content has text alternative (alt text)
- Brief should specify: every image, icon, illustration, data viz, and decorative element has an explicit alt-text decision (real description or marked decorative)

### Labels and instructions
- **A:** Form inputs have programmatic labels (not placeholder-only)
- **AA:** Labels visible, not just programmatic
- **AAA:** Visible labels positioned consistently
- Brief should require: every input has a persistent visible label; placeholders supplement but do not replace labels

### Error handling
- **AA:** Errors identified in text; suggestions provided; error prevention for legal/financial submissions
- Brief should require: error states designed inline with the field; error messages in addition to color signal

### Page/screen structure
- **A:** Headings, landmarks, and structural semantics used appropriately
- **AA:** Multiple ways to find content; descriptive page titles
- Brief should consider: navigation patterns, search/menu/breadcrumbs as alternative routes to content

### Touch targets and gestures (WCAG 2.2)
- **A:** Any gesture-only interaction has a simple alternative (e.g., swipe-to-delete also accessible via tap on a delete button)
- Brief should call out: every swipe, pinch, drag, or multi-touch interaction needs a single-pointer alternative

## Platform-specific accessibility translation

The brief's accessibility constraints land differently on each platform. Each platform brief should reflect this.

### Web

- Semantic HTML by default (`<button>`, `<nav>`, `<main>`, `<header>`, `<footer>`, headings in order)
- ARIA only when semantic HTML is insufficient — never as a first resort
- Focus indicators visible and styled (don't `outline: none` without replacement)
- Color contrast verified against final palette
- Skip-to-content link in the header
- `prefers-reduced-motion` respected for all transitions
- Form inputs always have associated `<label>` elements
- Heading hierarchy starts at `<h1>` and doesn't skip levels
- Forms grouped with `<fieldset>` / `<legend>` where appropriate
- Live regions (`aria-live`) for dynamic content updates

Web brief constraints section should explicitly require these. Web success criteria should include: "Keyboard-only user can complete every workflow without a mouse," "Screen reader user receives meaningful labels and structure for every interactive element."

### iOS

iOS accessibility is largely automatic if native components are used. The brief should call out:

- **VoiceOver labels** — every interactive element needs `.accessibilityLabel()`. Spec the labels where they're not obvious from visible text (e.g., icon-only buttons).
- **Dynamic Type** — system text styles required for all body content; brief must not spec fixed point sizes
- **Reduce Motion** — animations must respect Reduce Motion (use `.accessibilityReduceMotion()` or check `accessibilityReduceMotionEnabled`); spec which animations have reduced-motion alternatives
- **Increase Contrast / Differentiate Without Color** — never use color alone to convey information; pair with shape, icon, or text
- **Semantic colors** — use `.primary`, `.secondary`, `.systemBackground`, etc., so dark mode and increased contrast modes work
- **VoiceOver rotor** — for complex screens, group content so the rotor navigation makes sense (`.accessibilityElement(children: .combine)` or `.contain`)
- **Custom controls** — if a custom control is necessary, it must have `.accessibilityTraits` set correctly (`.button`, `.header`, `.adjustable`, etc.)
- **Audio descriptions** — for any media content

iOS brief success criteria should include: "VoiceOver user can navigate every screen and operate every control with meaningful announcements," "All content remains usable with largest Dynamic Type setting (`accessibility5`)."

### Android

- **TalkBack labels** — `contentDescription` on every actionable view without visible text; `null` (explicitly) for purely decorative
- **Material typography scale** — used throughout so font scale settings apply correctly
- **Material color tokens** — used for theming so dark mode and high-contrast variants work
- **Touch targets** — minimum 48×48 dp per Material; larger for primary actions
- **State descriptions** — for stateful controls (toggles, checkboxes), TalkBack reads state automatically when native components are used
- **Live regions** — `android:accessibilityLiveRegion` for dynamically updating content
- **Reduce animations** — respect the system setting; spec alternatives
- **Color contrast** — verified against Material theme tokens for both light and dark themes
- **Focus order** — `android:nextFocusDown`, etc., where the default order isn't right
- **Custom controls** — implement `AccessibilityNodeInfo` correctly (Compose: use `semantics { }` blocks)

Android brief success criteria should include: "TalkBack user can complete every workflow with meaningful announcements," "All content usable at maximum font scale and display zoom."

## What the brief's accessibility-related sections should look like

### Constraints section

```markdown
- **Accessibility:** WCAG 2.2 Level AA. [If AAA in any area: "Color contrast: AAA (7:1). Other criteria: AA."]
- Platform implementation: [VoiceOver / TalkBack / web AT support] required end-to-end.
- All interactive elements must have visible focus / touch feedback states.
- All animation must respect [Reduce Motion / prefers-reduced-motion].
- No information conveyed by color alone.
```

### Success criteria section (always include these)

```markdown
- All primary text/background contrast ≥ [4.5:1 for AA / 7:1 for AAA].
- Every workflow completable using [keyboard only (web) / VoiceOver (iOS) / TalkBack (Android)] without mouse/touch.
- Every interactive element has a meaningful accessible name.
- Layout remains usable at 200% zoom (web) or maximum text size (iOS/Android).
- No information conveyed by color alone — every color-coded state has a non-color signal (icon, label, shape).
```

### Open questions section

Common accessibility questions to surface here:
- Are there known audience characteristics (e.g., older users, users with motor impairments) that warrant AAA-level criteria in specific areas?
- Are there specific assistive technologies the design must be verified against beyond defaults?

## Anti-patterns checklist

Before delivering a brief, verify it doesn't include:

- [ ] Accessibility listed only as "WCAG AA" with no further detail
- [ ] Color contrast left to the designer with no target specified
- [ ] Focus styles unspecified (treated as automatic when they're not)
- [ ] Animation specs that don't mention reduced-motion alternatives
- [ ] Icon-only buttons without accessible-name guidance
- [ ] Color used as the sole signal for state, error, or status
- [ ] Placeholder text in place of visible labels
- [ ] Custom controls spec'd without accessibility-trait requirements
- [ ] Touch targets below the platform minimum (44pt iOS / 48dp Android / 24px WCAG 2.2 AA web)
- [ ] Auto-play media without pause/stop control
- [ ] Gesture-only interactions without single-pointer alternative
- [ ] Color contrast verified only in light mode (dark mode often fails)

## Sources

- <https://www.w3.org/WAI/WCAG2AAA-Conformance> — conformance levels
- <https://www.w3.org/WAI/standards-guidelines/wcag/> — WCAG 2.2 standard
- <https://www.w3.org/WAI/WCAG22/quickref/> — searchable success criteria reference
- <https://developer.apple.com/accessibility/> — Apple accessibility
- <https://m3.material.io/foundations/accessible-design/overview> — Material 3 accessibility
- <https://www.w3.org/WAI/WCAG22/Understanding/> — Understanding WCAG (rationale + examples per criterion)

If anything in this reference conflicts with current W3C, Apple, or Material guidance, follow the source.
