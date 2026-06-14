---
name: design-brief
description: Transform product vision, PRDs, planning docs, user stories, meeting transcripts, or competitive notes into a structured design brief that Claude Design (or any designer) can act on. Asks the user which platforms to target (web, iOS, Android) and surfaces any ambiguities or follow-up questions from the source material BEFORE producing the brief, so the final output reflects the user's actual intent rather than guesses. Includes an explicit workflows-and-views breakdown so each user journey is mapped to its constituent screens with required states and connections — not just a flat scope list. Produces one brief file per platform — for web, a single file covers both desktop (primary) and mobile web (adaptations); iOS and Android each get their own file with native conventions baked in (SwiftUI/HIG/WWDC for iOS, Material 3 for Android), with strong guidance to use native components by default rather than redesigning system UI. Grounds every brief in WCAG 2.2 accessibility conformance (defaults to Level AA) via a dedicated accessibility reference. Use this skill whenever the user has product or planning material and wants to hand off to design — even if they don't say "design brief" explicitly. Trigger on phrases like "hand this off to Claude Design", "turn this PRD into a design spec", "prepare this for design", "I have a vision doc, design something for it", or any time a user shares planning material with intent to produce visuals or UI. Do NOT use for design-to-developer handoffs (that's a different direction — use a developer handoff skill like Owl-Listener's /handoff for that).
---

# Design Brief Generator

Turn product intent into a brief a designer can act on. The brief is the input to Claude Design or to a human designer — not the output of design.

## What this skill is for

You receive: PRDs, vision docs, user stories, meeting transcripts, competitive analyses, brand guidelines, founder voice memos, Notion exports — any planning material.

You produce: a structured design brief, formatted as the opening prompt for a Claude Design session, that defines what to design, for whom, under what constraints, in what aesthetic direction, with success criteria.

This is a **transformation**, not a summary. PRDs talk about features and requirements; design briefs talk about moments, users, decisions, and committed aesthetic direction. The job of this skill is to do that conversion well.

## When to use this skill

- User shares planning docs and mentions design, mockups, UI, screens, or Claude Design
- User asks to "prepare X for design" or "hand off to design"
- User pastes a PRD or vision and asks what design should look like
- User has a folder of product docs and wants to start a design session

## When NOT to use this skill

- The user wants a design-to-developer handoff (use a developer handoff skill instead — the direction and content are different)
- The user wants you to actually do the design (use frontend-design instead)
- The user wants product strategy advice (this skill assumes the product decisions are made; it just translates them)
- The input is already a design brief (don't redo it — review it)

## Required inputs and gap-flagging

**Before writing anything, audit the inputs.** A vague PRD produces a confidently-worded vague brief, which is worse than no brief. The skill's most important behavior is refusing to paper over gaps.

Required signal (must be present or inferable from inputs):

1. **Who is the user?** Specific enough to make design decisions for — not "users" or "customers"
2. **What job are they trying to do?** Stated as a user goal, not a feature list
3. **What does success look like for them?** The moment they feel the product worked
4. **What platform(s)?** Web, iOS, Android — one or more. See "Platform confirmation" below; this is a separate explicit step, not just a required input.
5. **What's the scope of this design round?** Which screens, flows, or components

Strongly recommended (flag if missing, but proceed):

6. **Brand voice / aesthetic anchors** — references, existing design system, tone words
7. **Technical constraints** — must use X component library, must work offline, etc.
8. **Accessibility target** — WCAG conformance level. Default to **WCAG 2.2 Level AA** if not specified, documented as an assumption. See `references/accessibility.md` for what each level means in practice.
9. **Out of scope** — what this round is explicitly NOT doing
10. **Success criteria for the design itself** — how will the reviewer know it's good

**If any required signal is missing**, do not produce a brief. Instead, output a short "gaps blocking brief generation" document that lists exactly what's missing and where it would normally come from. Offer to proceed with stated assumptions if the user wants to move forward anyway, but make the assumptions explicit at the top of the brief.

## Platform confirmation (mandatory step before writing)

Before writing any brief, confirm the target platform(s) with the user. Do not infer this from context alone — even if the inputs strongly imply a platform, explicitly confirm. The brief structure, output files, and platform-specific guidance all depend on this answer.

Ask: **"Which platforms is this for? Web, iOS, Android — pick one or more."**

The answer drives the output:

- **Web only** → produce ONE brief file covering both desktop and mobile web. Desktop is the primary section; mobile is a "Mobile web adaptations" section underneath it. Always desktop first, mobile second.
- **iOS selected** → produce a SEPARATE file `design-brief-ios.md` with iOS-specific guidance (HIG conventions, native patterns, SF Symbols, Dynamic Type, safe areas).
- **Android selected** → produce a SEPARATE file `design-brief-android.md` with Android-specific guidance (Material 3, FAB patterns, system back, ripple states, adaptive layouts).
- **Multiple platforms** → produce multiple files. The shared sections (user, job, moments, aesthetic) are duplicated across files so each brief stands alone — designers should not need to flip between files to do their work. Only the platform-specific sections differ.

If the user picks more than one platform, confirm: "I'll write one brief per platform. The user/job/aesthetic sections will be identical across them; the constraints, interaction patterns, and platform conventions will differ. Good?"

## Clarifying questions (mandatory step before writing)

Distinct from the gap audit. Gaps are **missing required signal** — they block the brief. Clarifying questions are **ambiguities in present signal** — places where the source material could be read multiple ways, and the choice changes what the brief says.

After reading inputs, confirming platform, and extracting intent, surface clarifying questions to the user in **one batched round** — not drip-fed across multiple messages. Cap at 5 questions; if you have more, you're either over-asking or the inputs have gaps that should be flagged instead.

### How to identify a good question

Ask if **the answer would change the brief's content**. Skip if the answer would just live in the brief's "Open questions" section anyway (designers can answer that through design).

Good questions (worth asking):
- "The PRD mentions both 'power users' and 'casual users' — which is the primary audience for this design round?"
- "Vision doc says 'reduce friction in onboarding' — is the friction you most want fixed length, complexity, or required-field count?"
- "You describe the brand as 'professional but approachable' — can you name one product whose tone feels right, and one that's too far in either direction?"
- "Scope mentions 'settings' — does that include account/billing, or just app preferences?"
- "Inputs imply real-time collaboration but don't say it — is multi-user editing in scope or a later round?"
- "Accessibility target: I'll default to WCAG 2.2 Level AA unless you have a reason to go higher (AAA — typical for healthcare, government, accessibility-focused products). Confirm or override?"

**Aesthetic-anchor questions worth asking when inputs are vague on direction.** The Aesthetic direction section of the brief requires five committed anchors (color, type, density, surface, motion). If inputs don't supply them, these are good clarifying questions:
- "Color anchor: can you point to one product whose color palette you'd want to be in the neighborhood of, even loosely?"
- "Display type preference — serif, sans, mono, script, or no opinion? Body type for iOS/Android can default to system; web is open."
- "Light-first, dark-first, both required, or system-following?"
- "Density: generous (lots of whitespace, single-focus screens), comfortable, or dense (information-rich)?"
- "Motion personality in one word — quiet, snappy, playful, weighty?"

Don't ask all five — pick the 2-3 anchors least clear from inputs and ask about those. The other anchors can be assumed with defaults documented in the brief's Assumptions section.

Bad questions (don't ask):
- "What color should the primary button be?" → design decision, not brief decision
- "Should we use a sidebar or top nav?" → designer's call given the brief
- "What font size for body text?" → too granular
- "How many users do you have today?" → doesn't change the brief
- "Should the design be accessible?" → assume yes; ask about the target level (AA/AAA) only if relevant

### How to phrase the batch

Frame as a short, numbered list with brief context per question. State at the top whether any answers are **blocking** (you can't write the brief without them) versus **strongly recommended** (you'll proceed with stated assumptions if not answered). Example opening:

> "Before I write the brief, a few things I want to clarify from the inputs. Items 1–2 are blocking; items 3–5 I'll assume defaults on if you don't have a preference."

If the user says "just proceed" or "use your judgment," do so — but explicitly list the assumptions made in the brief's "Assumptions" section. This is the contract: ask once, proceed cleanly, document what was assumed.

### When to skip this step

If the inputs are unambiguous and the gap audit passed cleanly, you may skip the clarifying-questions step. This is rare — most real PRDs have at least 2-3 places where intent could go multiple ways. Default to asking unless you've genuinely got nothing worth asking about.

## Workflow

1. **Read all inputs end to end before writing.** Don't start drafting from the first doc.
2. **Confirm platform(s).** Run the Platform confirmation step above. Do not skip this even if the inputs seem clear.
3. **Extract structured product intent.** Pull out: user (specific), job-to-be-done, key moments, constraints, what's in scope, what's not, success signals. Write this as scratch notes first.
4. **Run the gap audit.** Check against the required signal list above. If gaps exist, stop and surface them.
5. **Surface clarifying questions in one batched round.** Use the Clarifying questions guidance above. Wait for the user's response before proceeding. Skip only if there's genuinely nothing ambiguous to ask about.
6. **Identify the key moments.** Not "build a settings page" — "the moment a user realizes they need to change a default and goes looking." Moments are what designers design for.
7. **Map workflows to views.** For each workflow in scope, list the views that make it up, with each view's purpose, required states, and connections to other views. See "Workflows and views" guidance below. This is where most of the brief's value lives — do not shortcut it.
8. **Commit to an aesthetic direction.** Pick one, based on input cues and clarifying answers. Vague "modern and clean" briefs produce vague designs. If the input doesn't give you enough to commit, name 2-3 directions with tradeoffs and ask the user to pick — but pick before writing the final brief.
9. **Resolve accessibility target and load reference.** Confirm the WCAG conformance level (default: 2.2 Level AA). Read `references/accessibility.md` for what that level requires in practice and how it translates to the chosen platform(s). Accessibility constraints and success criteria are mandatory in every brief — never leave them as "WCAG AA" with no further detail.
10. **Write the brief(s) using the template below.** One file per platform selected, following the file-naming and ordering rules in Platform confirmation.
11. **Format for Claude Design handoff.** Each brief should read as an opening prompt for a Claude Design session: imperative, structured, with the ask at the top.

## Workflows and views

This is the section that turns a brief from "directional" into "actionable." A workflow is a user journey with a goal (e.g., "onboard a new user," "create a habit," "review weekly progress"). A view is a screen or distinct UI state within a workflow.

Three abstraction levels work together in the brief — they're complementary, not redundant:

- **Moments** — emotional/decision beats (why a view matters)
- **Workflows** — the user-journey spine (what sequence of views accomplishes a goal)
- **Views** — the concrete deliverables (what screens the designer produces)

### What to specify per workflow

For each in-scope workflow:

- **Name** — short and descriptive ("Onboarding," "Create habit," not "Flow 1")
- **Goal** — what the user is trying to accomplish
- **Trigger** — what starts the workflow (first launch, button tap, push notification)
- **Success state** — how the workflow ends successfully
- **Views** — ordered list of views in the workflow

### What to specify per view

For each view inside a workflow:

- **Purpose** — what the user is doing on this view, in one sentence
- **Entry from** — which views lead here, or external entry point
- **Exit to** — which view(s) come next, including back/cancel paths
- **Required states** — explicitly list every state the designer must produce. At minimum consider: default, empty, loading, error, success. Add any view-specific states (e.g., "permission denied," "offline," "first-time vs. returning")
- **Key elements** — what must be present on the view, framed as content/function (not visual decisions). "A way to dismiss," not "an X button in the top-right." "Surface of the user's progress," not "a circular progress ring."

### Where workflows and views live in the brief

Workflows are typically **shared across platforms** (the same user does the same journey on iOS and web). Views may differ — a desktop layout might combine two iOS sheets into one multi-pane screen, or an Android workflow might use the system back button where iOS uses an in-screen back affordance.

In the brief structure: workflow names and goals go in the shared section. The per-view breakdown goes in the platform-specific section, because the view list and states can differ per platform.

### How granular to get

The rule of thumb: a view's spec should be specific enough that two designers, working independently from it, would produce designs that solve the same problem — but not so prescriptive that they'd produce visually identical designs. If you find yourself specifying layout, color, or component choice, back off. If you find yourself writing "user does stuff here," push deeper.

A 3-view workflow is fine. A 15-view workflow is a warning sign that the scope is too big for this round, or the workflow should be split.

## Output template

The brief follows this exact structure. Section order matters — Claude Design (and human designers) read top-down and the early sections frame how later ones are interpreted.

Sections above the dividing line (`---`) are **shared** across platforms — when producing multiple briefs, these sections are duplicated identically. Sections below the line are **platform-specific** and change per file.

```markdown
# Design Brief: [Project Name] — [Platform]

## The ask
[1-2 sentences. What you want designed, for whom, at what fidelity (concepts, hi-fi mockups, prototypes). Name the platform explicitly here.]

## Context
[2-4 sentences. What the product is, where this fits in the product, why it matters now. No feature lists — just the why.]

## Who this is for
[The specific user. Role, situation, what they care about. If multiple users, pick the primary and note secondaries.]

## The job they're doing
[The user's goal in their own words, stripped of feature framing. What are they trying to accomplish, and what does "done" feel like to them.]

## Key moments to design
[The 3-7 moments in the flow that need design attention. Each one is a sentence or two describing what's happening for the user at that moment. These are NOT screens — they're decision points, transitions, or emotional beats.]

## Workflows (shared)
[Named list of workflows in scope this round. For each: name, goal, trigger, success state. Just the spine here — per-view detail goes in the platform-specific Views section below.]

- **[Workflow name]** — Goal: [...]. Trigger: [...]. Success: [...].
- **[Workflow name]** — Goal: [...]. Trigger: [...]. Success: [...].

## Aesthetic direction

Commit to a direction and to the five anchor decisions below. Vague aesthetic guidance produces inconsistent designs — these anchors give the designer enough structure to make every downstream decision coherently without dictating the design itself.

**Direction (one sentence):** [Pick a tone: brutally minimal / maximalist / editorial / playful / luxury / technical / quiet & restrained / etc. Name 2-3 reference points — real products, sites, or visual moods. State 2-3 things to actively avoid.]

**Color anchor:** [Either a specific primary color (with hex or named reference) OR a committed color family ("warm desaturated earth tones, primary in the rust-to-terracotta range"). Plus light/dark mode stance: light-first, dark-first, system-following, or both required.]

**Type anchor:** [Either specific fonts (display + body) OR a committed category ("humanist serif for display, neutral grotesk for body"). For iOS/Android, this often resolves to "system font for body, optional brand display font for brand moments only" — which is itself a real commitment.]

**Density and rhythm:** [Generous (lots of whitespace, single-focus screens) / Comfortable (balanced) / Dense (information-rich, multi-element). This single decision drives spacing scale and information architecture more than people realize.]

**Surface treatment:** [Flat / Layered with subtle elevation / Glassy or materials-heavy / Textured / Etc. On iOS, this interacts with Liquid Glass — see iOS reference. On Android, this interacts with Material elevation — see Android conventions.]

**Motion personality:** [Quiet / Snappy / Playful / Weighty / Smooth & cinematic / Etc. One sentence is enough — this anchors transition timing, easing curves, and interaction feel.]

This section is **identical across platform briefs** — aesthetic intent doesn't change per device. Platform-specific styling (iOS tint propagation, Android Material seeding) implements this intent differently on each platform but doesn't change it.

---

## Scope of this round
**In scope (workflows):**
- [Workflow names from above that are part of this round]

**Out of scope:**
- [Workflows, screens, or behaviors NOT being designed this round — equally important]

## Constraints
- **Platform:** [web (desktop + mobile) / iOS / Android]
- **Accessibility:** [WCAG 2.2 Level AA is the default; specify higher (AAA) or document why lower. See `references/accessibility.md` for what each level requires in practice and per-platform implementation.]
- **Existing system:** [design system to use, or "greenfield"]
- **Technical:** [component library, framework, performance targets]
- **Brand:** [voice, anchors, anti-patterns]

## Platform conventions and interaction patterns
[Platform-specific guidance — see "Platform-specific guidance" section of the skill below. This is the section that differs most between files.]

## Views (per workflow, this platform)

### Workflow: [Name]

#### View: [View name]
- **Purpose:** [one sentence — what the user is doing on this view]
- **Entry from:** [previous view(s) or external entry]
- **Exit to:** [next view(s), including back/cancel paths]
- **Required states:** [default, empty, loading, error, success, plus any view-specific states]
- **Key elements:** [content/function that must be present — not visual decisions]

#### View: [Next view name]
[...same structure...]

### Workflow: [Next workflow name]
[...same structure...]

## Success criteria
[How a reviewer will know this design is good. 3-5 specific things to check, not platitudes. E.g. "A first-time user can complete onboarding without reading any explainer text" — not "the design should be intuitive."]

## Open questions
[Things the brief couldn't resolve. Frame as questions for the designer to answer through design, not gaps in the brief.]

## Assumptions
[Only if gaps existed in inputs OR clarifying questions were skipped. Explicit list of what was assumed to make the brief possible.]
```

### Web brief structure (desktop + mobile in one file)

For web, the `Views` and `Platform conventions` sections expand into two subsections — **desktop first, then mobile**. The shared sections above the `---` (including the Workflows spine) appear once and apply to both.

```markdown
## Views (per workflow, web)

### Desktop (primary)

#### Workflow: [Name]

##### View: [View name]
- **Purpose:** [...]
- **Entry from:** [...]
- **Exit to:** [...]
- **Required states:** default, empty, loading, error, success, hover, focus
- **Key elements:** [...]

[...continue for each view in each workflow...]

### Mobile web (adaptations)

For each desktop view above, specify how it adapts at ≤768px. Only list views that change meaningfully — if a view simply reflows, note "reflows; no structural change." Where the mobile version diverges, document the divergence as its own view spec.

#### Workflow: [Name]

##### View: [View name] — mobile adaptation
- **Adaptation:** [what changes from desktop — layout, interactions, removed elements]
- **Required states:** default, empty, loading, error, success, active/pressed (replacing hover)
- **Key elements:** [any mobile-specific additions or removals]
```

If a mobile view is structurally different enough that it's effectively a new view (e.g., a bottom sheet replacing a side panel), give it a new name and spec it fully rather than as an adaptation.

## Platform-specific guidance

Each platform brief's "Platform conventions and interaction patterns" section should reflect that platform's native expectations. Use the guidance below.

### Web (desktop)
- Multi-column layouts and information density appropriate to the surface
- Hover, focus, and active states explicitly called out
- Keyboard navigation and shortcuts where relevant
- Responsive breakpoints stated (typically desktop ≥1024px, tablet 768–1023px, mobile ≤767px — adjust to the project's system if defined)
- Cursor affordances for interactive elements
- Anti-patterns to avoid: mobile-first patterns scaled up, single-column desktop layouts without reason, hamburger menus on desktop

### Web (mobile adaptations)
- Touch targets ≥44×44pt
- Hover states replaced with active/pressed states
- Vertical stacking, single-column priority
- Bottom-sheet patterns acceptable; full-screen modals over inline modals
- Anti-patterns to avoid: hover-only interactions, dense tables without horizontal scroll affordance, fixed elements that block content

### iOS

**Native components by default — this is the most important rule.** Modern iOS design uses SwiftUI native components for buttons, text fields, pickers, toggles, sliders, segmented controls, navigation bars, tab bars, sheets, alerts, action sheets, and form rows. **Do not redesign these.** Native components handle accessibility, Dynamic Type, dark mode, haptics, state changes, and platform-conventional behavior automatically. A custom version forfeits all of that and reads as "this isn't really an iOS app." Custom design is reserved for: brand surfaces (launch screen, logo placement), content presentation (cards, illustrations, hero moments, data visualizations), and motion/interaction that genuinely differentiates the experience.

**Before writing an iOS brief, READ `references/ios-conventions.md` in this skill folder.** That file contains the current iOS 26 / Liquid Glass conventions, SwiftUI primitive list, TabView specifics, typography scale, tint propagation rules, and the anti-patterns checklist. Do not write iOS guidance from memory — iOS conventions evolve yearly and the reference file is kept current.

**Quick-reference summary (full details in `references/ios-conventions.md`):**
- Follow the three current iOS HIG principles: **Hierarchy, Harmony, Consistency**
- **Liquid Glass material is for the navigation layer only** (tab bars, nav bars, floating controls, sheet chrome). NOT for lists, content surfaces, or text backgrounds.
- `TabView` for primary navigation (max 5 tabs, inset 21pt from edges, glass background, brand-tinted selection, per-tab state)
- SwiftUI primitives by name: `TabView`, `NavigationStack`, `.sheet`, `.presentationDetents`, `.fullScreenCover`, `Form`, `List`, `.alert`, `.confirmationDialog`
- Typography: system text styles (`.body`, `.headline`, `.title`, etc.) with Dynamic Type. SF Pro for body. Custom display fonts for brand moments only.
- Color: one `.tint()` color propagates through tabs/buttons/links/toggles automatically. Use semantic system colors for backgrounds; custom hex only for brand surfaces with both light/dark values.
- SF Symbols for iconography; custom icons only where SF Symbols doesn't cover
- Haptics noted where they reinforce interaction meaning, not on every button
- App icons designed in Icon Composer with default / dark / clear variants

**Top anti-patterns** (full checklist in reference file):
- Glass material on content layers (lists, body text, cards)
- Restyling native buttons, text fields, toggles, pickers
- Material Design influences (FAB, ripple, elevation shadows)
- Hamburger menus where TabView fits
- Web-style label-above-input forms instead of native `Form`
- Hard-coded type sizes that bypass Dynamic Type
- Old HIG language (Clarity / Deference / Depth) — use Hierarchy / Harmony / Consistency
- References to `NavigationView` — use `NavigationStack`

### Android

**Native components by default — this is the most important rule.** Modern Android design uses Material 3 (Material You) components for buttons, text fields, pickers, switches, sliders, chips, navigation bars, bottom sheets, dialogs, and snackbars. **Do not redesign these.** Material components handle motion, theming, accessibility, ripple feedback, and state changes automatically. A custom version forfeits all of it and reads as alien on the platform. Custom design is reserved for: brand surfaces, content presentation, and interaction moments that differentiate the experience.

**Follow the latest Material guidance.** Material 3 / Material You is the current standard. If implementation is Jetpack Compose, spec to Compose's Material 3 components rather than patterns that require manual View-system work.

**Specifics:**
- FAB for primary action where appropriate; bottom navigation, navigation rail, or navigation drawer for top-level destinations
- System back button behavior defined (what does back do at each screen?)
- Material typography scale (displayLarge, headlineMedium, titleLarge, bodyLarge, labelSmall, etc.) — do not define a custom type ramp for body content
- Material icons or platform-appropriate icon set
- **One seed color** generates the full Material color scheme (primary, secondary, tertiary, surface, etc.) — spec the seed, let Material derive the ramp
- Dynamic color (Material You) support where brand allows; otherwise theme tokens
- Ripple state on touch; elevation and tonal elevation for hierarchy
- Adaptive layouts for phones, foldables, and tablets where relevant
- Edge-to-edge content respecting system bars
- Dark theme via Material theme tokens, not hard-coded values

**Anti-patterns to avoid:**
- Restyling Material components to look "iOS-like" or generically "branded" — let them look like Material
- iOS patterns (iOS-style segmented controls, iOS tab bar chrome, iOS-style modal presentations)
- Ignoring system back
- Blocking edge gestures
- Custom dialog presentations when a Material bottom sheet or dialog would do the job
- Hard-coded type sizes that bypass the Material type scale

### A note on how this affects the views section

For iOS and Android briefs, when specifying **key elements** for each view, reference native components by name rather than describing custom UI. Examples:

- ✅ "iOS-native `Form` with `Section` headers for account, notifications, and privacy"
- ❌ "Custom settings list with rounded card-style rows"

- ✅ "`TabView` with 4 tabs: Home, Search, Library, Profile. Liquid Glass background, brand tint on selected."
- ❌ "Custom bottom navigation bar with 4 tinted icons"

- ✅ "Material `OutlinedTextField` with leading icon and trailing clear button"
- ❌ "Custom search input with rounded corners and a magnifying glass icon"

When the key element is a native component, you generally **do not need to spec all states** — the system handles them. Only call out states when there's something view-specific to design (e.g., custom error copy, a unique empty state illustration).

## File output rules

When producing the final output, save to the workspace as separate files:

- **Web only:** `design-brief-web.md` (one file, desktop + mobile sections inside)
- **iOS only:** `design-brief-ios.md`
- **Android only:** `design-brief-android.md`
- **Multiple platforms:** one file per platform, listed above. Shared sections are duplicated across files; each brief stands alone.

If `present_files` is available, present all generated brief files to the user after writing.

## Worked example (compressed)

Input: a 2-page PRD for a "habit tracker for people recovering from burnout."

Bad brief (don't produce this):
> "Design a habit-tracking app. It should be clean and modern with a focus on user experience. Include features for tracking habits, viewing progress, and getting reminders. Make it accessible and mobile-friendly."

Good brief (produce this):
> **The ask:** Hi-fi mockups for the core 4 screens of a habit-tracker mobile app aimed at burnout recovery. Web is out of scope this round.
>
> **Who this is for:** Someone 3-12 months into burnout recovery who has been told by a therapist or doctor to "build small daily routines." They're skeptical of productivity apps (which feel like the thing that burned them out) and easily overwhelmed by interfaces with too many options.
>
> **The job they're doing:** Proving to themselves, gently, that they can do small things consistently. The goal isn't optimization. It's evidence of capacity.
>
> **Key moments:**
> - Opening the app on a bad day and not feeling judged
> - Marking a habit done and feeling something other than "completion satisfaction" (which reads as performative to this user)
> - Missing a day and not being pushed into a guilt loop
> - Reviewing the past week and seeing something honest, not gamified
>
> **Aesthetic direction:** Quiet, generous whitespace, warm neutrals, no streaks-as-fire-emoji, no green checkmarks. Reference points: Oak meditation app's restraint, the cover of a Mary Oliver poetry book, hospital wayfinding signs. Avoid: productivity-app conventions, dark patterns, anything that gamifies consistency.
>
> [...continues with scope, constraints, success criteria, open questions]

The difference: the bad brief lets the designer make every decision; the good brief commits to enough that the designer can do their actual job (resolving the remaining decisions through craft).

## Anti-patterns to avoid

- **Summarizing instead of transforming.** If the brief reads like a condensed PRD, you've failed. Designers don't need a shorter PRD.
- **Hedging on aesthetic direction.** "Modern and clean" is not a direction. Pick one.
- **Feature lists as scope.** Scope is screens/states/flows, not features.
- **Generic success criteria.** "Should be intuitive" is not a success criterion. "User completes signup in under 90 seconds without help text" is.
- **Burying constraints.** Constraints that affect every decision (accessibility target, design system) go in the constraints section, not scattered through the doc.
- **Inventing user details.** If the inputs don't say who the user is, do not make them up. Flag the gap.

## Reusing Owl-Listener's `/handoff` patterns

The Owl-Listener developer handoff skill is the wrong direction (design→dev, not vision→design), but its discipline is worth borrowing:

- **Explicit checklist sections.** That skill forces measurements, edge cases, QA — concrete, not vibes. This skill mirrors that with explicit scope (in/out), success criteria, open questions.
- **Refusing to ship incomplete handoffs.** Owl's handoff fails loudly when measurements are missing; this one fails loudly when user/job/scope are missing.
- **Treating the handoff as the contract.** The brief is what the designer is held accountable to. Write it like a contract, not like marketing copy.

Do not import Owl's template directly — its sections (component measurements, interaction specs, QA checklist) are for the wrong consumer.

## Output format

Each brief file is markdown. At the top of every file, prepend a one-line instruction tailored to that platform:

> "Use this brief to produce [fidelity level] designs for [platform]. The screens listed in scope are mandatory; states (empty/loading/error/success) are mandatory. Commit to the aesthetic direction. Follow the platform conventions section — if you deviate, surface it explicitly. Ask before deviating from constraints."

When multiple platform briefs are produced, also write a short `README.md` alongside them that lists the files, notes that shared sections are intentionally duplicated so each brief stands alone, and recommends running them as separate Claude Design sessions rather than asking one session to design for multiple platforms at once.
