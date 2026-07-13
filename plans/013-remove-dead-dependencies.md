# Plan 013: Remove dead and redundant dependencies

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the status row for this plan
> in `plans/README.md` — unless a reviewer dispatched you and told you they
> maintain the index.
>
> **Drift check (run first)**: `git diff --stat c689f8f..HEAD -- package.json demo/components/SerializedStateTextarea.tsx`
> If any in-scope file changed since this plan was written, compare the
> "Current state" excerpts against the live code before proceeding; on a
> mismatch, treat it as a STOP condition.

## Status

- **Priority**: P2
- **Effort**: S
- **Risk**: LOW
- **Depends on**: none
- **Category**: migration
- **Planned at**: commit `c689f8f`, 2026-07-13

## Why this matters

Four manifest entries cost install time and create confusion with zero
benefit, verified by grep across `src/`, `demo/`, `test/`, `.storybook/`, and
config files:

1. `cross-fetch` — zero imports anywhere. (Node 18+ and all modern bundlers
   provide `fetch`; the repo requires Node 24 in CI.)
2. `@types/luxon` — no `luxon` dependency and no `from 'luxon'` import anywhere
   (luxon itself was removed in commit `b1683ce`).
3. `@types/color` (v4 types) — `color@5.0.3` bundles its own types
   (`node_modules/color/package.json` has `"types": "./index.d.ts"`); the v4
   types can silently override the v5 API surface and mask type errors.
4. `react-highlight` — sole usage is one demo textarea
   (`demo/components/SerializedStateTextarea.tsx:5`); last published 2022-11,
   no React 19 support signal, and the repo already carries `highlight.js`
   directly plus CodeMirror.

## Current state

- `package.json:101` — `"@types/color": "^4.2.1"`
- `package.json:105` — `"@types/luxon": "^3.7.2"`
- `package.json:120` — `"cross-fetch": "4.1.0"`
- `package.json:148` — `"react-highlight": "0.15.0"`
- `demo/components/SerializedStateTextarea.tsx:5` — the only
  `react-highlight` import; it renders a syntax-highlighted JSON textarea in
  the demo. Read the component to see whether highlighting is load-bearing
  (expected: cosmetic).

Repo conventions: after changing `package.json` or imports, run `pnpm format`
(repo rule in AGENTS.md). TypeScript strict, `oxfmt`/`oxlint` clean.

## Commands you will need

| Purpose    | Command          | Expected on success                        |
| ---------- | ---------------- | ------------------------------------------ |
| Install    | `pnpm install`   | exit 0                                     |
| Typecheck  | `pnpm typecheck` | exit 0                                     |
| Lint       | `pnpm lint`      | exit 0                                     |
| Unit tests | `pnpm test:unit` | all pass                                   |
| Demo smoke | `pnpm dev`       | demo loads, serialized-state panel renders |

## Scope

**In scope**:

- `package.json`
- `demo/components/SerializedStateTextarea.tsx`

**Out of scope**:

- Any other dependency (lodash → plan 009, semver → plan 007, `should` →
  plan 014).
- Rewriting the demo component beyond removing the highlight wrapper.
- `pnpm-lock.yaml` by hand — it regenerates via `pnpm install`.

## Git workflow

- Branch: `advisor/013-remove-dead-deps`
- Commit style: e.g. `chore(deps): remove unused cross-fetch, @types/luxon, @types/color, react-highlight`
- Do NOT push or open a PR unless the operator instructed it.

## Steps

### Step 1: Replace react-highlight in the demo component

In `demo/components/SerializedStateTextarea.tsx`, remove the
`react-highlight` import and render the content in a plain styled `<pre>`/
`<code>` block (or reuse `highlight.js` directly via a one-line
`hljs.highlight(...)` call if the file already has access — only if it stays
under ~10 lines; otherwise the plain `<pre>` is fine for a demo debug panel).
Preserve the existing Tailwind/scoped classes and copy behavior if any.

**Verify**: `pnpm dev` → the demo page containing the serialized-state panel
renders without console errors.

### Step 2: Remove the four manifest entries

Delete the four lines from `package.json` (listed in Current state). Run
`pnpm install`, then `pnpm format` (repo rule for manifest changes).

**Verify**:

- `grep -rn "cross-fetch\|react-highlight\|from 'luxon'" src demo test .storybook vite.config.ts vite.config.demo.ts playwright.config.js` → no matches
- `pnpm typecheck` → exit 0 (proves `@types/color` wasn't load-bearing)
- `pnpm lint` → exit 0
- `pnpm test:unit` → all pass

## Test plan

- No new tests. Typecheck + full unit suite are the verification that no type
  or runtime reference remains.
- Demo smoke per Step 1 covers the `react-highlight` removal.

## Done criteria

- [ ] `pnpm install` exits 0
- [ ] `pnpm typecheck` exits 0
- [ ] `pnpm lint` exits 0
- [ ] `pnpm test:unit` exits 0
- [ ] The Step 2 grep returns no matches
- [ ] Demo serialized-state panel renders (manual smoke or screenshot note in commit)
- [ ] No files outside the in-scope list are modified (`git status`)
- [ ] `plans/README.md` status row updated

## STOP conditions

Stop and report back (do not improvise) if:

- Typecheck fails after removing `@types/color` — some file relies on the v4
  type surface; report the file and the API difference instead of re-adding
  the package blindly (the correct fix is usually a small code change to the
  v5 API).
- A grep hit appears outside the cited single usage for any of the four
  packages — the audit missed a consumer; report before deleting.
- The demo component's highlight removal breaks a demo build
  (`pnpm build:demo`) — report the error.
- A step's verification fails twice after a reasonable fix attempt.

## Maintenance notes

- Consider adding `pnpm audit --prod` and a dead-dep check
  (`pnpm dlx depcheck` or similar, run manually) to periodic maintenance —
  this is the second dead-dep sweep in recent history (see `b1683ce`).
- Reviewers: the lockfile diff should show only removals cascading from these
  four entries.
