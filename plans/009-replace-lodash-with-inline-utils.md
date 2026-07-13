# Plan 009: Replace lodash with small in-repo utilities

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the status row for this plan
> in `plans/README.md` — unless a reviewer dispatched you and told you they
> maintain the index.
>
> **Drift check (run first)**: `git diff --stat c689f8f..HEAD -- src/utils/lodash-lite.ts package.json src/context/TKContext.tsx src/nodes/GalleryNode.tsx src/plugins/WordCountPlugin.tsx src/utils/draggable/draggable-constants.ts src/utils/services/gif.ts src/components/ui/FloatingFormatToolbar.tsx src/components/ui/DropdownContainer.tsx src/components/ui/FloatingLinkToolbar.tsx src/components/ui/HighlightedString.tsx src/hooks/useSearchLinks.ts src/hooks/useGalleryReorder.ts src/hooks/useSettingsPanelReposition.ts`
> If any in-scope file changed since this plan was written, compare the
> "Current state" excerpts against the live code before proceeding; on a
> mismatch, treat it as a STOP condition.

## Status

- **Priority**: P2
- **Effort**: M
- **Risk**: MED (debounce/throttle edge semantics — leading/trailing/cancel — must match lodash exactly; WordCountPlugin relies on `.cancel()`)
- **Depends on**: none (if plans/005 lands first, its `useSearchLinks` changes and this plan's debounce swap there must be merged carefully — order is flexible)
- **Category**: perf
- **Planned at**: commit `c689f8f`, 2026-07-13

## Why this matters

`lodash` is a **runtime** dependency of the published package, so every
consumer of `@inkling/editor` installs it — ~70 kB min, 94 CJS modules in the
built bundle — for exactly five trivial functions used at 12 import sites:
`debounce` ×6, `throttle` ×2, `pick` ×2, `kebabCase` ×1, `escapeRegExp` ×1.
Replacing them with ~100 lines of in-repo utilities removes the dependency
entirely and shrinks every consumer's install.

## Current state

All 12 import sites (each imports a single method via `lodash/<method>`):

- `src/utils/services/gif.ts:1` — `debounce`
- `src/components/ui/FloatingFormatToolbar.tsx:11` — `debounce`
- `src/components/ui/DropdownContainer.tsx` — `debounce`
- `src/components/ui/FloatingLinkToolbar.tsx` — `debounce`
- `src/hooks/useSearchLinks.ts:1` — `debounce` (100ms, `.cancel()` used at
  line 170; plan 005 adds another `.cancel()` in a cleanup effect)
- `src/hooks/useSettingsPanelReposition.ts:1` — `debounce`
- `src/context/TKContext.tsx:1` — `throttle`
- `src/plugins/WordCountPlugin.tsx:11` — `throttle` (200ms; `.cancel()` at
  lines 209–210)
- `src/nodes/GalleryNode.tsx:3` and `src/hooks/useGalleryReorder.ts:1` — `pick`
- `src/utils/draggable/draggable-constants.ts:1` — `kebabCase`
- `src/components/ui/HighlightedString.tsx:1` — `escapeRegExp`

`package.json:60` — `"lodash": "4.18.1"` in `dependencies`;
`package.json:104` — `"@types/lodash": "^4.17.24"` in `devDependencies`.

No call site passes options (no `{leading, trailing, maxWait}`) — verified by
reading the call sites above; all use the single-argument form except the
wait-ms argument. Debounced functions are called with zero or one argument.

Repo conventions: TypeScript strict, single quotes, no semicolons, trailing
commas, width 120 (`oxfmt`). Vitest globals. New utility files live in
`src/utils/`; new unit tests in `test/unit/utils/` (check the dir for the
exact naming pattern — e.g. existing `test/unit/` entries).

## Commands you will need

| Purpose    | Command                            | Expected on success |
| ---------- | ---------------------------------- | ------------------- |
| Install    | `pnpm install`                     | exit 0              |
| Typecheck  | `pnpm typecheck`                   | exit 0              |
| Lint       | `pnpm lint`                        | exit 0              |
| Unit tests | `pnpm test:unit`                   | all pass            |
| E2E (spot) | `pnpm test:e2e -- -g "word count"` | pass                |
| Format     | `pnpm format:check`                | exit 0              |

## Scope

**In scope**:

- `src/utils/timing.ts` (create — `debounce`, `throttle`)
- `src/utils/objects.ts` or additions to an existing string/util module
  (create only if no suitable file exists — `pick`, `kebabCase`,
  `escapeRegExp`; check `src/utils/` for an existing strings file first)
- The 12 import sites listed above (import line changes only)
- `test/unit/utils/timing.test.ts` (create) and tests for the three other
  utilities (create or extend the matching file)
- `package.json` (remove two lines)

**Out of scope**:

- Behavior changes at any call site (wait times, call patterns).
- `demo/` or `test/` lodash usage — verify none exists
  (`grep -rn "lodash" demo test` should return nothing; if it does, report —
  do not expand scope).
- The unused `escapeRegExp` variants elsewhere — only replace what exists.

## Git workflow

- Branch: `advisor/009-replace-lodash`
- Commit style: e.g. `refactor(utils): replace lodash with in-repo utilities`
- Do NOT push or open a PR unless the operator instructed it.

## Steps

### Step 1: Implement and test the utilities

Create `src/utils/timing.ts` with `debounce` and `throttle` matching lodash
default semantics:

- `debounce(fn, wait)`: trailing-edge invoke; resets the timer on each call;
  returns a function with `.cancel()` (drops pending invoke) and passes the
  last args through. Leading edge is **off** by default in lodash — match that.
- `throttle(fn, wait)`: leading + trailing invoke within the window (lodash
  defaults: `leading: true, trailing: true`); returns a function with
  `.cancel()`.

Create the object/string utilities (in an existing `src/utils` module if one
fits, else `src/utils/objects.ts`):

- `pick(obj, keys)` — only used with object + key array; type it
  `<T extends object, K extends keyof T>(obj: T, keys: K[]) => Pick<T, K>`.
- `kebabCase(str)` — lodash behavior: splits camelCase and spaces/underscores
  into lowercase hyphenated words (e.g. `FooBar` → `foo-bar`,
  `__FOO_BAR__` → `foo-bar`). Check `draggable-constants.ts` usage to confirm
  the exact inputs it must handle.
- `escapeRegExp(str)` — escape `[ \ ^ $ . | ? * + ( )` per lodash.

Export all through the same barrel path the other utils use (`src/utils`
index — check how `slugify` is exported and match).

**Verify**: new unit tests pass — `pnpm test:unit -t "timing"` etc. Test with
`vi.useFakeTimers()`. Cover: trailing-only debounce, rapid-call coalescing,
`.cancel()` prevents invoke, throttle leading+trailing within window,
`.cancel()` on throttle, `pick` with missing keys, `kebabCase` on the actual
inputs from `draggable-constants.ts`, `escapeRegExp` round-trip through
`new RegExp(...)`.

### Step 2: Swap the 12 import sites

Replace each `import debounce from 'lodash/debounce'` (etc.) with the named
import from the new util module, matching the repo's import style (`oxfmt`
will sort). Do not change any call sites' arguments.

**Verify**: `pnpm typecheck` → exit 0; `pnpm lint` → exit 0;
`pnpm test:unit` → all pass (existing suites exercise the toolbars, GIF
service, gallery, word count).

### Step 3: Remove the dependency

Delete `"lodash"` from `dependencies` and `"@types/lodash"` from
`devDependencies` in `package.json`; run `pnpm install`; run `pnpm format` on
the manifest if needed.

**Verify**: `grep -rn "lodash" src/ package.json` → no matches;
`pnpm typecheck` → exit 0; `pnpm test:unit` → all pass;
`pnpm test:e2e -- -g "word count"` → pass (throttle timing is user-visible
there) — or report as not-run if Playwright browsers are unavailable.

## Test plan

- New: `test/unit/utils/timing.test.ts` — debounce/throttle semantics listed
  in Step 1 (this is the load-bearing test file; lodash semantics are subtle).
- New or extended: tests for `pick`, `kebabCase`, `escapeRegExp` covering the
  exact inputs used at the call sites.
- Regression: existing suites for `WordCountPlugin`, `useGalleryReorder`,
  `useSearchLinks` (note plan 005's tests if merged), `HighlightedString`
  (via `test/unit/components/ui/` if present) must pass unmodified.

Verification: `pnpm test:unit` → all pass.

## Done criteria

- [ ] `pnpm typecheck` exits 0
- [ ] `pnpm lint` exits 0
- [ ] `pnpm test:unit` exits 0; new timing/object utility tests exist and pass
- [ ] `grep -rn "lodash" src/ package.json` returns no matches
- [ ] `pnpm-lock.yaml` no longer lists lodash as a direct dependency
- [ ] No call-site arguments changed (`git diff` shows import-line changes only
      outside the new util files and tests)
- [ ] No files outside the in-scope list are modified (`git status`)
- [ ] `plans/README.md` status row updated

## STOP conditions

Stop and report back (do not improvise) if:

- Any call site passes debounce/throttle **options** (leading/maxWait) that the
  simple implementation doesn't support — report the site; extend the utility
  deliberately.
- An existing test relies on lodash-specific timing quirks (e.g. `Date.now`
  mocking interactions) — report rather than weakening the new utilities to
  match a broken test.
- `grep -rn "lodash" demo test` returns matches — report before touching
  demo/test code (out of scope).
- A step's verification fails twice after a reasonable fix attempt.

## Maintenance notes

- `src/utils/timing.ts` becomes the single timing-utility home: plan 005's
  `useSearchLinks` debounce and any future debounce/throttle need should use
  it. Reviewers should reject new lodash imports in PRs (consider an oxlint
  no-restricted-imports rule in a follow-up if the team wants enforcement).
- The published package loses a runtime dependency — mention in release notes.
- If a future feature genuinely needs lodash breadth, prefer per-method
  packages or another in-repo util rather than re-adding the full library.
