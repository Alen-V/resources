# iOS conventions reference

Load this file when producing an iOS design brief. The main `SKILL.md` has summary guidance; this file has the details that keep the brief grounded in current iOS conventions rather than stale ones.

Always cross-reference the current Apple HIG at <https://developer.apple.com/design/human-interface-guidelines> and the latest WWDC sessions — Apple's design language evolves yearly. The content below reflects iOS 26 (Liquid Glass) conventions as of 2026; if a newer iOS version is current when this skill runs, prioritize the newer guidance.

## The three current HIG principles

Apple's iOS 26 HIG centers on three principles. Briefs should reflect all three:

- **Hierarchy** — Controls float above content using glass layers instead of solid blocks. Content always leads; navigation defers.
- **Harmony** — UI elements align with Apple hardware geometry (rounded corners, HDR displays, edge-to-edge screens). Shapes follow the hardware.
- **Consistency** — One design system across iPhone, iPad, Mac, Watch, TV, and Vision. Elements adapt fluidly across contexts without forcing uniformity.

These replace the older Clarity / Deference / Depth framing. If a brief references the old principles, update it.

## Liquid Glass — what it is and where it goes

Liquid Glass is the iOS 26 material: a translucent, dynamic layer that refracts and reflects surrounding content, responds to device motion with specular highlights, and adapts to background content and lighting.

**The most-violated rule:** Liquid Glass is **for the navigation layer only**. Apply it to:
- Tab bars
- Navigation bars
- Toolbars
- Floating action buttons / pill-shaped controls
- Sheets and modals (the chrome, not the content)
- Control Center, Lock Screen elements

**Do NOT apply Liquid Glass to:**
- Lists, table content, form rows — these stay on solid layers as they always have
- Body text — text always sits on solid backgrounds for legibility
- Large content surfaces (article bodies, photo views, primary canvases)
- Custom cards or content tiles unless they're genuinely floating navigation

Briefs should specify Liquid Glass usage **per element**, not as a blanket "use Liquid Glass throughout."

## SwiftUI primitives to spec against

Brief should reference these directly so the implementation path is clear. If the brief specs a pattern that requires manual UIKit gymnastics when a SwiftUI primitive exists, the brief is out of date.

### Navigation
- **`TabView`** — primary navigation for apps with 2–5 top-level destinations. Each tab maintains its own state.
- **`NavigationStack`** — push/pop navigation within a tab. Replaces older `NavigationView`.
- **`NavigationSplitView`** — for iPad and Mac multi-pane layouts.

### Presentation
- **`.sheet`** — bottom-up sheet, the default modal presentation
- **`.fullScreenCover`** — full-screen modal for focused tasks (camera, video, immersive flows)
- **`.presentationDetents([.medium, .large])`** — partial-height sheets that can be dragged between sizes; spec these explicitly when a half-sheet is wanted
- **`.alert`** — native alerts only; do not design custom alert dialogs
- **`.confirmationDialog`** — action sheets for destructive or multi-option choices
- **`.popover`** — iPad/Mac contextual popovers

### Content
- **`List`** — for any scrollable list of rows. Style modifiers: `.listStyle(.insetGrouped)`, `.listStyle(.plain)`, `.listStyle(.sidebar)`
- **`Form`** — for settings, preferences, data entry. Automatically applies grouped styling.
- **`ScrollView`** with `LazyVStack` / `LazyHStack` — for non-list scrolling content
- **`Section`** — group rows within Lists and Forms with optional headers/footers

### Controls — use as-is, do not redesign
- **`Button`** with styles: `.borderedProminent`, `.bordered`, `.borderless`, `.plain`. The `.glassEffect()` modifier is available for glass-treated buttons in the navigation layer.
- **`TextField`** — with `.textFieldStyle(.roundedBorder)` for standard input
- **`Toggle`** — the native iOS switch
- **`Picker`** — with styles `.menu`, `.segmented`, `.wheel`, `.navigationLink`
- **`Stepper`**, **`Slider`** — native counter and slider
- **`DatePicker`**, **`ColorPicker`** — native date and color selection
- **`SearchBar`** via `.searchable(text:)` modifier on a navigation stack

## TabView specifics (iOS 26)

When a brief includes a TabView, specify:

- **Number of tabs:** 2–5 (5 is the hard ceiling; 4 is more comfortable)
- **Selected tint:** the app's brand/accent color (propagates automatically via `.tint()`)
- **Background:** Liquid Glass (translucent, inset from screen edges by 21pt left, right, and bottom)
- **Content fade:** content below the tab bar fades progressively as it approaches the bottom — do not design content that needs to be sharp at the very bottom edge
- **Per-tab state:** each tab remembers its navigation state. Switching tabs and returning preserves where the user was.
- **Icons:** SF Symbols paired with optional short labels. Use `.tabItem { Label("Home", systemImage: "house") }` semantics.
- **Badge support:** number badges on tabs are native — spec which tabs may carry badges (e.g., notifications, inbox count)

If the design needs floating action buttons or page-level actions in addition to the tab bar, those also use Liquid Glass and sit above the content layer, often inset from the tab bar.

## Typography

iOS body text is **17pt regular** by default. Secondary text is 15pt or 12pt regular depending on emphasis.

Use **system text styles** in briefs rather than hard-coded sizes — this enables Dynamic Type automatically:
- `.largeTitle` — screen titles when used as the first element
- `.title`, `.title2`, `.title3` — section and subsection titles
- `.headline` — emphasized labels, list row primary text
- `.body` — default reading text (17pt regular)
- `.callout`, `.subheadline` — supporting text
- `.footnote`, `.caption`, `.caption2` — small annotations

**System font is San Francisco (SF Pro).** A custom display font is acceptable for brand moments (splash, hero headlines, brand surfaces) but body content should use the system font so Dynamic Type works.

Briefs should specify: "system text styles for body and supporting content; [brand font] only for [specific brand moments]." Do not spec a custom type ramp for body content.

## Color and tint

**`.tint()` is the magic.** Setting `.tint(.indigo)` (or any color) at the app or view level propagates the accent color through:
- Tab bar selected state
- Button foreground (for `.bordered`, `.borderless`, plain buttons)
- Links
- Toggle on-state
- Progress indicators
- Selection highlights

This means a brief usually only needs to specify **one tint color** and the entire navigation/control layer adopts it consistently.

**Use semantic system colors for everything else:**
- `.primary`, `.secondary`, `.tertiary` — for text
- `.systemBackground`, `.secondarySystemBackground`, `.tertiarySystemBackground` — for surfaces
- `.systemGroupedBackground`, `.secondarySystemGroupedBackground` — for grouped content

These automatically handle light/dark mode. Do not spec hex values for system surfaces.

**Custom brand colors** are appropriate for: tint color, brand surfaces (header backgrounds, accent moments), illustrations, data viz. Always specify both light and dark mode values.

## Layering and depth

iOS 26 is layered:
1. **Content layer** (solid backgrounds, lists, body) — bottom
2. **Glass navigation layer** (tab bars, nav bars, floating controls) — top
3. **Modal layer** (sheets, alerts) — above both

Briefs should respect this. Don't put text on glass. Don't make content surfaces glass. Keep the glass-content boundary clean.

**Spacing and rhythm:** Liquid Glass emphasizes depth, so give elements room to breathe. Cramped spacing fights the material. Standard iOS padding: 16pt or 20pt for primary content margins, 8pt or 12pt for tighter groupings.

## Icons

App icons in iOS 26 use **Icon Composer** with layered, multi-layer compositions and three appearance modes:
- **Default** — standard rendering
- **Dark** — dark mode variant
- **Clear** — transparent background using Liquid Glass material

Brief should specify: "App icon designed as a layered composition for Icon Composer, with default / dark / clear appearance variants. 1024×1024 master, fully opaque, no transparency in the master." Square canvas; the system applies corner radii.

For in-app iconography, **SF Symbols** is the default. The library covers over 6,900 symbols. Custom icons should only appear when SF Symbols doesn't have an appropriate equivalent.

## Safe areas and screen sizes

Respect:
- Top status bar / Dynamic Island
- Bottom home indicator
- Side safe areas on landscape

Common iPhone frame sizes designers should target:
- **6.7" / 6.9" Pro Max:** 430×932pt (current iPhone 15/16/17 Pro Max)
- **6.1" / 6.3" Pro:** 393×852pt
- **6.1" standard:** 390×844pt
- **5.4" mini / SE:** 375×812pt

Design for the smaller frames first; layouts that work at 390pt usually work at 430pt, but not vice versa.

## Haptics

iOS apps use haptic feedback to reinforce interaction meaning. Spec haptics where they add real signal:
- **Selection:** light tap when changing pickers, segmented controls, tab selections
- **Impact:** medium/heavy when confirming an action, completing a swipe-to-delete, sending a message
- **Notification:** success/warning/error for completed flows

Don't spec haptics on every button — overuse desensitizes.

## Anti-patterns checklist

Before delivering an iOS brief, verify it doesn't include:

- [ ] Glass material on lists, content surfaces, or text backgrounds
- [ ] Custom-designed buttons, text fields, toggles, pickers, or alerts
- [ ] Material Design influences (FAB, ripple effects, elevation shadows)
- [ ] Hamburger menu where a TabView fits
- [ ] Web-style label-above-input form layouts instead of native `Form` patterns
- [ ] Custom segmented controls
- [ ] Hard-coded type sizes that bypass Dynamic Type
- [ ] Custom modal dialogs where `.alert`, `.confirmationDialog`, or `.sheet` would work
- [ ] Solid opaque tab bars (should be Liquid Glass, inset from edges)
- [ ] Old principles language (Clarity / Deference / Depth) — use Hierarchy / Harmony / Consistency
- [ ] References to `NavigationView` — use `NavigationStack` or `NavigationSplitView`
- [ ] Custom icon sets where SF Symbols would cover the need

## Sources to verify against

Before finalizing an iOS brief, cross-check against:
- <https://developer.apple.com/design/human-interface-guidelines> — current HIG
- <https://developer.apple.com/design/tips/> — UI design dos and don'ts
- <https://developer.apple.com/documentation/TechnologyOverviews/liquid-glass> — Liquid Glass overview
- <https://developer.apple.com/design/human-interface-guidelines/materials> — Materials and depth
- The current year's WWDC design sessions

If anything in this reference conflicts with current Apple guidance, follow Apple.
