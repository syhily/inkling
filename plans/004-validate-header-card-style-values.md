# Plan 004: Validate header card style values in the v2 renderer

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the status row for this plan
> in `plans/README.md` — unless a reviewer dispatched you and told you they
> maintain the index.
>
> **Drift check (run first)**: `git diff --stat c689f8f..HEAD -- src/nodes/base/nodes/header/renderers/v2/header-renderer.ts test/nodes-base/nodes/header.test.ts`
> If any in-scope file changed since this plan was written, compare the
> "Current state" excerpts against the live code before proceeding; on a
> mismatch, treat it as a STOP condition.

## Status

- **Priority**: P1
- **Effort**: S
- **Risk**: LOW
- **Depends on**: none
- **Category**: security
- **Planned at**: commit `c689f8f`, 2026-07-13

## Why this matters

The header card v2 renderer interpolates node-data color strings directly into
`style="…"` and `data-*` attributes. These values come from document JSON, not
only from the color picker, so a crafted `textColor` containing a quote breaks
out of its attribute into arbitrary markup in every exported header card (web
and email). Unconstrained CSS values also allow `background-image:url(...)`
tricks in email clients. The sibling callout renderer already guards its color
with a regex (`callout-renderer.ts:20`); the header renderer has no equivalent.

## Current state

All in `src/nodes/base/nodes/header/renderers/v2/header-renderer.ts`:

- `:57-58` — URLs are already validated: `safeBackgroundImageSrc` /
  `safeButtonUrl` via `isSafeMediaUrl`/`isSafeUrl`. Colors are not.
- `:65` — `const buttonStyle = nodeData.buttonColor !== 'accent' ? \`background-color: ${nodeData.buttonColor};\` : \`\``
- `:67-70` — `backgroundImageStyle` embeds `${nodeData.backgroundColor}` raw.
- `:97` — `style="color: ${nodeData.textColor};" data-text-color="${nodeData.textColor}"`
- `:104` — same for the subheader.
- `:111` — `style="${buttonStyle}color: ${nodeData.buttonTextColor};"
data-button-color="${nodeData.buttonColor}"
data-button-text-color="${nodeData.buttonTextColor}"`
- `:119` — `data-background-color="${nodeData.backgroundColor}"`
- `:66` — alignment is already constrained: `nodeData.alignment === 'center' ? 'inkling-align-center' : ''` (keep as-is).

Node data shape (`HeaderV2NodeData`, lines ~15-28): `textColor`,
`buttonTextColor`, `buttonColor`, `backgroundColor`, `accentColor` are strings;
`'accent'` is a special sentinel for `backgroundColor`/`buttonColor` (see lines
63–64).

The callout renderer's existing pattern (`callout-renderer.ts:20-22`):

```ts
if (!node.backgroundColor || !node.backgroundColor.match(/^[a-zA-Z\d-]+$/)) {
  node.backgroundColor = 'white'
}
```

Repo conventions: TypeScript strict, single quotes, no semicolons, trailing
commas, width 120 (`oxfmt`). Vitest globals. Tests:
`test/nodes-base/nodes/header.test.ts` — read it first; it exercises both
renderer versions and is the pattern to extend.

## Commands you will need

| Purpose    | Command             | Expected on success |
| ---------- | ------------------- | ------------------- |
| Install    | `pnpm install`      | exit 0              |
| Typecheck  | `pnpm typecheck`    | exit 0              |
| Lint       | `pnpm lint`         | exit 0              |
| Unit tests | `pnpm test:unit`    | all pass            |
| Format     | `pnpm format:check` | exit 0              |

## Scope

**In scope**:

- `src/nodes/base/nodes/header/renderers/v2/header-renderer.ts`
- `test/nodes-base/nodes/header.test.ts`

**Out of scope**:

- Header v1 renderer and other renderers — audit found no raw color
  interpolation there; do not pre-emptively change them.
- The editor-side `HeaderCard.tsx` color picker — it already constrains input;
  this plan guards the export boundary.
- `slugify(nodeData.header)` at lines 97/104 — already safe output-wise.
- Changing what colors the product supports — the allowlist below covers every
  value the color picker can produce (hex, `rgb(a)`, named colors, and the
  `accent` sentinel).

## Git workflow

- Branch: `advisor/004-validate-header-style-values`
- Commit style: e.g. `fix(renderers): validate header card color values before interpolation`
- Do NOT push or open a PR unless the operator instructed it.

## Steps

### Step 1: Add a color sanitizer local to the header v2 renderer

At the top of `cardTemplate()` in `header-renderer.ts`, add:

```ts
// Colors come from document JSON, not just the color picker — constrain to
// values the picker can produce before interpolating into style/attributes.
const COLOR_REGEX =
  /^#[0-9a-fA-F]{3,8}$|^rgba?\(\s*[\d.]+\s*,\s*[\d.]+\s*,\s*[\d.]+\s*(?:,\s*[\d.]+\s*)?\)$|^[a-zA-Z]+$/

function safeColor(value: string, fallback: string): string {
  return COLOR_REGEX.test(value) ? value : fallback
}
```

Derive sanitized locals once: `textColor`, `buttonTextColor`, `buttonColor`,
`backgroundColor` — each via `safeColor(nodeData.X, <fallback>)`. Fallbacks:
`'#000000'` for text colors; for `backgroundColor`/`buttonColor` preserve the
`'accent'` sentinel handling by checking `value === 'accent'` first, else
`safeColor(value, 'transparent')`. Do not mutate `nodeData` (unlike the callout
precedent, which mutates — prefer locals here).

### Step 2: Use the sanitized locals at every interpolation site

Replace every `${nodeData.textColor}`, `${nodeData.buttonTextColor}`,
`${nodeData.buttonColor}`, `${nodeData.backgroundColor}` in the template
strings (lines 65, 67–70, 97, 104, 111, 119) with the sanitized locals. Keep
the existing `'accent'` comparisons working against the original semantics
(compare the raw value for the sentinel, interpolate the sanitized value).

**Verify**: `pnpm typecheck` → exit 0; `pnpm test:unit -t "header"` → all pass
including new tests.

## Test plan

Extend `test/nodes-base/nodes/header.test.ts` (v2 cases):

- `textColor: 'red"><img src=x onerror=alert(1)>'` → rendered output contains
  no injected `<img`; `data-text-color` falls back to the default.
- `backgroundColor: 'url(https://evil.example/x)'` → `data-background-color`
  falls back; no `url(` reaches the output style.
- regression: `#aabbcc`, `#abc`, `rgb(1, 2, 3)`, `rgba(1, 2, 3, 0.5)`, `white`,
  and `accent` (background/button) all render exactly as before — assert the
  existing snapshot/assertions still hold and add explicit ones if missing.
- `buttonColor: 'expression(alert(1))'` → falls back; `buttonStyle` empty of
  attacker content.

Verification: `pnpm test:unit` → all pass.

## Done criteria

- [ ] `pnpm typecheck` exits 0
- [ ] `pnpm lint` exits 0
- [ ] `pnpm test:unit` exits 0; new injection + regression tests exist and pass
- [ ] `grep -n '\${nodeData.textColor}' src/nodes/base/nodes/header/renderers/v2/header-renderer.ts` returns no matches (same for `buttonTextColor`, `buttonColor`, `backgroundColor`)
- [ ] No files outside the in-scope list are modified (`git status`)
- [ ] `plans/README.md` status row updated

## STOP conditions

Stop and report back (do not improvise) if:

- The excerpts in "Current state" don't match the live code (drift).
- Existing header tests/fixtures use color formats the regex rejects (e.g.
  `hsl(...)`, CSS variables) — report the formats seen so the allowlist can be
  extended deliberately; do not silently widen it.
- A step's verification fails twice after a reasonable fix attempt.

## Maintenance notes

- If the color picker gains new output formats (CSS variables, `hsl`), extend
  `COLOR_REGEX`, the picker tests, and these renderer tests together.
- The `'accent'` sentinel is product vocabulary shared with the callout card
  and theme classes; keep the sentinel comparison separate from color
  validation as this plan does.
- A reviewer should double-check that fallback colors don't silently change the
  look of real documents: run the header stories in Storybook
  (`pnpm storybook`) if in doubt.
