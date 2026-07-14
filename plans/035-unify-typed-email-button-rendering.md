# Plan 035: Adopt Koenig's typed email-button styling without breaking legacy email markup

> **Executor instructions**: This is a P3 compatibility-preserving alignment
> plan. Reuse Inkling's local color and escaping utilities; do not add
> `@tryghost/color-utils` or copy Koenig's broad `stylex` helper. Preserve legacy
> email output when no customization/design option is supplied, and treat an
> explicit design style as opt-in to the modern path.
>
> **Drift check (run first)**:
> `git diff --stat 316dd61..HEAD -- src/nodes/base/export-dom.ts src/nodes/base/utils/render-helpers/email-button.ts src/nodes/base/nodes/button/button-renderer.ts src/nodes/base/nodes/header/renderers/v2/header-renderer.ts src/utils/colorUtils.ts test/nodes-base/nodes/button.test.ts test/nodes-base/nodes/header.test.ts test/nodes-base/utils`

## Status

- **Priority**: P3
- **Effort**: M
- **Risk**: MED — email table/style output is compatibility-sensitive across clients and feature-flag branches
- **Depends on**: plan 030 should land first if both change renderer safety tests
- **Category**: maintainability / feature parity / email rendering
- **Planned at**: commit `316dd61`, 2026-07-14

## Why this matters

Inkling's `renderEmailButton` survived the JS→TS migration as an untyped
destructured helper with JSDoc. It supports only alignment, accent class, URL,
and text. Header email rendering reimplements button tables, fill/outline
styles, accent substitution, and colors inline. Koenig has consolidated those
rules into a typed `EmailButtonOptions` helper with width, fill/outline, and
automatic text contrast; its header renderer uses that helper and honors an
explicit outline design even when the feature bag is empty.

The useful advantage is one tested email-button contract. Inkling should not
copy Koenig's weak input sanitation or add its color dependency: Inkling
already validates URLs/colors, escapes HTML, and provides
`textColorForBackgroundColor` locally.

## Current-state evidence

- `src/nodes/base/utils/render-helpers/email-button.ts:5-27` has an untyped
  options parameter and always emits `<td align="center"><a ...>` without
  width or inline color/style support.
- `button-renderer.ts` uses the helper only for
  `emailCustomizationAlpha`; stable customization and legacy branches contain
  duplicate table markup.
- Header V2 validates URL/media/color inputs, but lines 238-279 construct
  `buttonAccent`, `buttonStyle`, and `buttonTextColor` manually. Lines 315-322
  duplicate the email table.
- Header outline styling is gated by both a customization feature flag and
  `design.buttonStyle === 'outline'`. An explicit design option with
  `feature: {}` is therefore ignored.
- `ExportDOMOptionsBase.design` is `Record<string, unknown>`, while the Header
  renderer narrows it locally to `{buttonStyle?: string}`.
- Koenig's helper defines `EmailButtonOptions` with `buttonWidth`, color, and
  `'fill' | 'outline'`, chooses black/white text for custom fills, and emits
  outline border/link colors. Its header test explicitly expects outline
  output for `{design: {buttonStyle: 'outline'}, feature: {}}`.
- `src/utils/colorUtils.ts` already implements the required contrast helper,
  so adding `@tryghost/color-utils` would duplicate runtime ownership.
- Plan 024 listed this helper as an evaluate-first item. The full comparison
  now provides a concrete consumer (Header), duplicated logic, and a missing
  explicit-design behavior, so it is worth a low-priority implementation plan.

## Compatibility policy

1. With no `design.buttonStyle` and no customization feature flag, Button and
   Header email HTML stays on the current legacy branch.
2. Existing `emailCustomization` and `emailCustomizationAlpha` branches remain
   supported and render through the shared helper where structurally safe.
3. Supplying `design.buttonStyle: 'fill' | 'outline'` explicitly opts into the
   modern shared-button path even if `feature` is `{}`. This changes only a
   currently ignored explicit request.
4. URL, text, alignment, color, and width are escaped/validated exactly once.
5. Header background/VML/layout behavior and button visibility are unchanged.
6. Accent color remains represented by the `btn-accent`/theme class where the
   concrete accent value is not available; custom hex colors may use inline
   styles.

## Scope

**In scope**:

- Typed `EmailButtonOptions` and deterministic helper styles
- A narrow typed `ExportDOMDesignOptions` preserving unknown future keys
- Button and Header V2 email integration
- Helper unit tests plus renderer regression/safety snapshots

**Out of scope**:

- Adding product/call-to-action/signup cards that Inkling intentionally cut
- Replacing email CSS or VML architecture
- A generic CSS-in-JS/stylex framework
- Changing frontend/web button markup
- Removing legacy feature flags in this release
- Supporting arbitrary CSS color syntax beyond the currently reviewed safe
  values

## Commands you will need

| Purpose        | Command                                                                                       | Expected on success        |
| -------------- | --------------------------------------------------------------------------------------------- | -------------------------- |
| Helper tests   | `pnpm test:unit -- test/nodes-base/utils/email-button.test.ts`                                | full options matrix passes |
| Renderer tests | `pnpm test:unit -- test/nodes-base/nodes/button.test.ts test/nodes-base/nodes/header.test.ts` | all branches pass          |
| Type/lint      | `pnpm typecheck && pnpm lint`                                                                 | both exit 0                |
| Full units     | `pnpm test:unit`                                                                              | all tests pass             |
| Format         | `pnpm format && pnpm format:check`                                                            | exits 0                    |

## Git workflow

- Branch: `advisor/035-unify-email-button-rendering`
- Commit 1: `test(email): define shared button style contract`
- Commit 2: `refactor(email): type and extend button renderer helper`
- Commit 3: `refactor(email): use shared buttons in header output`
- Do not push or open a PR unless instructed.

## Steps

### Step 1: Add a focused helper behavior matrix

Create `test/nodes-base/utils/email-button.test.ts` beside existing base
utility tests. Test final HTML output, not private helper functions.

Required cases:

- no options: class `btn`, no empty optional alignment/width/style attributes;
- `undefined` option values do not overwrite defaults, especially
  `style: undefined` behaving as fill;
- safe URL and text are escaped exactly once;
- alignment is emitted only for supported/current values;
- `buttonWidth` is emitted only when non-empty and safe numeric/CSS width
  format accepted by the contract;
- `color: 'accent'` adds `btn-accent` and no unsafe inline color;
- custom dark fill yields a validated background and white link text;
- custom light fill yields black link text;
- custom outline yields transparent background, visible border,
  `border-color: currentColor`, and matching link text;
- invalid color produces no interpolated custom style;
- unsupported style falls back to fill at the untrusted runtime boundary even
  though TypeScript rejects it at compile time;
- rejected URL does not create a navigable unsafe link (either empty href or
  no button according to the helper contract chosen below).

Use inert unsafe sentinels where adding new security fixtures. Retain existing
renderer tests that already cover quote-containing URLs and text markup.

### Step 2: Define typed options and explicit escaping ownership

Export:

```ts
export interface EmailButtonOptions {
  url?: string
  text?: string
  alignment?: string
  buttonWidth?: string
  color?: string
  style?: 'fill' | 'outline'
}
```

Normalize defaults without allowing explicit `undefined` to erase them. A
small field-by-field normalizer is clearer and more type-safe than casting
`Object.fromEntries` to `Required<EmailButtonOptions>`.

Make the helper own final output safety:

- validate `url` with `isSafeUrl` and escape it before interpolation;
- escape raw `text` once;
- restrict/escape alignment and width attributes;
- accept `accent`, `transparent`, or safe hex colors according to explicit
  branch rules; invalid values produce no custom inline style;
- compute contrast through Inkling's local
  `textColorForBackgroundColor(color).hex()` only after hex validation.

Update every caller in the same commit to pass raw safe-domain values, not
pre-escaped strings. This prevents double escaping. Add comments/tests that
make the ownership clear.

If the product prefers the renderer to suppress the whole button for an unsafe
URL, expose a `null`/empty return and test callers. Do not render a clickable
unsafe value. Preserve current Button/Header entry guards, so the helper is a
second boundary rather than the only validation.

### Step 3: Generate deterministic styles without copying `stylex`

Implement two small style-building functions that return ordered strings for
the table cell and anchor. They need only these hardcoded properties:

- filled custom color: `background-color` on `<td>` and computed text color on
  `<a>`;
- outlined custom color: `color`, `border`, `border-color: currentColor`, and
  `background-color: transparent` on `<td>`, matching color on `<a>`;
- accent/empty color: class-driven, with no arbitrary interpolation.

Values come only from validated colors and fixed literals. Do not port the
general Koenig style parser, camelCase conversion, numeric unit heuristics, or
string CSS parsing; those broaden the injection/maintenance surface without a
current Inkling consumer.

Keep property order stable so email snapshots are deterministic. Use the
existing `html` oneline helper only for whitespace normalization; it does not
escape substitutions.

### Step 4: Type the shared design option without closing future keys

In `export-dom.ts`, add:

```ts
export interface ExportDOMDesignOptions {
  buttonStyle?: 'fill' | 'outline'
  [key: string]: unknown
}
```

Use it for `ExportDOMOptionsBase.design`. Remove the Header-local
`buttonStyle?: string` duplication and derive its options from the shared type.
This preserves arbitrary future design data while making the known style
compile-time safe.

Add a `test/typecheck` fixture only if plan 026's public options work includes
this type; otherwise helper/renderer compilation is sufficient. Do not export
the design interface from `src/index.ts` unless it appears in an already public
signature or the declaration plan requires a name.

### Step 5: Consolidate Button email customization carefully

Define `usesModernEmailButton(options)` as true when either customization flag
is set or `design.buttonStyle` is explicitly present. For modern output:

- call `renderEmailButton` with raw URL/text, alignment, `color: 'accent'`, and
  the requested style (default fill);
- retain the surrounding table and the current `ExportDOMOutput.type` expected
  by consumers for stable vs alpha branches unless tests prove they can be
  unified safely;
- preserve the legacy branch byte-for-byte when the predicate is false.

Because an accent outline is class/theme-driven in Koenig, verify Inkling's
email CSS actually distinguishes it. If there is no class/design-level rule,
do not claim accent outline works: either pass the resolved accent color through
an existing option or stop for a design contract. Do not emit `accent` as a CSS
color value.

Retain the existing empty-container outcome for blank/unsafe button URL.

### Step 6: Replace Header's duplicated modern button table

Keep Header's early safety work for background image, button URL, text, colors,
accent value, and VML. Derive:

- `showButton = buttonEnabled && safeButtonUrl !== ''`;
- helper color as resolved `accentColor` when the stored value is `accent`,
  otherwise the validated button color;
- style from `options.design?.buttonStyle` with fill default;
- raw button text for the helper to escape.

Use `renderEmailButton` inside the existing header button-wrapper cell for the
modern branch. Remove `buttonAccent`, `buttonStyle`, and `buttonTextColor`
calculations only after tests show the helper covers all branches.

Set the modern Header branch predicate to customization flag **or explicit
design style**. Leave the legacy Header markup untouched when neither exists.
This makes Koenig's `feature: {}, design: {buttonStyle: 'outline'}` case work
without changing default emails.

Preserve:

- split/non-split background tables;
- conditional MSO/VML comments and balanced tags;
- heading/subheading colors and escaping;
- alignment and background classes;
- button omission for disabled/unsafe/blank URL.

### Step 7: Add cross-renderer regression and email-client checks

For Button and Header, test the matrix:

| Feature/design                  | Expected branch                                  |
| ------------------------------- | ------------------------------------------------ |
| no flags, no design             | exact current legacy markup                      |
| `emailCustomization`            | modern helper, fill default                      |
| `emailCustomizationAlpha`       | modern helper, fill default                      |
| `feature: {}`, design fill      | modern helper fill                               |
| `feature: {}`, design outline   | modern helper outline                            |
| custom dark/light header colors | correct contrast                                 |
| accent header color             | resolved safe accent, never literal CSS `accent` |

Retain/extend malicious color, URL quotes, and markup-text tests. Assert no
double escaping (`&amp;lt;`) and no unsafe string reaches style/href.

Run generated Header HTML through the repository's existing prettifier/parser
and assert table/VML tag balance. If there is a manual Litmus/email-client QA
process, capture at least Outlook desktop, Gmail web, and Apple Mail screenshots
for fill and outline custom colors; do not introduce screenshot goldens unless
the repository already uses them.

### Step 8: Run full gates

Run:

```bash
pnpm format
pnpm format:check
pnpm typecheck
pnpm lint
pnpm test:unit -- test/nodes-base/utils/email-button.test.ts test/nodes-base/nodes/button.test.ts test/nodes-base/nodes/header.test.ts
pnpm test:unit
```

## Test plan

| Layer           | Required evidence                                                                          |
| --------------- | ------------------------------------------------------------------------------------------ |
| Helper          | defaults, undefined normalization, width/alignment, fill/outline, contrast, invalid inputs |
| Button renderer | all legacy/stable/alpha/design branches, escaping and unsafe URL                           |
| Header renderer | custom/accent fill and outline, feature-empty explicit design, VML/background preservation |
| Compatibility   | no-option legacy snapshots unchanged                                                       |
| Security        | URL/text/color each validated/escaped exactly once                                         |

## Acceptance criteria

- `renderEmailButton` has a strict named options interface and no implicit
  `any` parameter.
- Header modern email output uses the shared helper instead of duplicating the
  table/style rules.
- Explicit outline design works with an empty feature bag.
- No-option emails retain existing legacy markup.
- Custom fills choose readable black/white link text; outlines use matching
  safe colors.
- No new Ghost color/style dependency is added.
- Unsafe URL/color/text values do not enter HTML/CSS, and valid values are not
  double-escaped.
- VML and all gates pass.

## STOP conditions

- Inkling's email CSS has no way to represent accent outline without a concrete
  accent value. Define how that value enters `ExportDOMOptions` before shipping
  a misleading option.
- A downstream snapshot treats `design.buttonStyle` as intentionally ignored
  without feature flags. Obtain a compatibility/product decision before
  enabling the explicit opt-in.
- Consolidation changes no-option legacy output or `ExportDOMOutput.type`.
  Keep the duplicate legacy branch rather than broadening the refactor.
- Outlook/VML markup becomes unbalanced or loses the clickable button area.
- Contrast computation throws for an accepted color. Tighten validation before
  invoking `Color`; do not catch and interpolate the raw value.
- Plan 030 changes overlapping safety behavior and has not landed/rebased.

## Rollback plan

Revert Header/Button integration separately from the typed helper only if
email-client QA fails; the standalone helper and tests can remain unused while
markup compatibility is restored. Never leave callers passing pre-escaped
values to a helper that also escapes them—rollback ownership changes as a unit.
