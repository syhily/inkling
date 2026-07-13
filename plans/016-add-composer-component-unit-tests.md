# Plan 016: Add real unit tests for the core composer components

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the status row for this plan
> in `plans/README.md` — unless a reviewer dispatched you and told you they
> maintain the index.
>
> **Drift check (run first)**: `git diff --stat c689f8f..HEAD -- test/unit/InklingComposer.test.tsx src/components/InklingComposer.tsx src/components/InklingErrorBoundary.tsx src/components/InklingCardWrapper.tsx`
> If any in-scope file changed since this plan was written, compare the
> "Current state" excerpts against the live code before proceeding; on a
> mismatch, treat it as a STOP condition.

## Status

- **Priority**: P2
- **Effort**: M
- **Risk**: LOW (additive tests only)
- **Depends on**: none
- **Category**: tests
- **Planned at**: commit `c689f8f`, 2026-07-13

## Why this matters

The components every consumer mounts — the public API surface exported from
`src/index.ts:64-71` (`InklingComposer`, `InklingComposableEditor`,
`InklingEditor`, `InklingNestedComposer`, `InklingCardWrapper`) — have no
jsdom-level tests. `test/unit/InklingComposer.test.tsx` is three `it.todo`
stubs and nothing else covers them; prop handling, initial-state parsing, and
error-boundary behavior are only exercised through the slow e2e layer, so
regressions are caught late. This plan converts the stubs and adds smoke
coverage for the exported composer surface.

## Current state

- `test/unit/InklingComposer.test.tsx` — the whole file:

  ```tsx
  import { describe, it } from 'vitest'

  describe('InklingComposer', function () {
    it.todo('renders')
    it.todo('accepts initialState prop')
    it.todo('accepts onChange prop')
  })
  ```

- `src/components/InklingComposer.tsx` — props (`:31-45`): `initialEditorState`
  (string | object | null), `nodes`, `onError`, `fileUploader`, `cardConfig`,
  `darkMode`, `enableMultiplayer` (default false), `isTKEnabled`, multiplayer
  props, `children`. Notable behavior worth testing: the empty-root-children
  guard (`:71-81`) injects a paragraph into a state whose root has zero
  children; the missing-`useFileUpload` fallback (`:96-105`) logs an error and
  installs a no-op uploader.
- `InklingComposer` renders `LexicalComposer` + contexts and passes
  `enableMultiplayer ? null : editorState` into the initial config (`:88`) —
  jsdom-mountable without network as long as `enableMultiplayer` stays false.
- Exemplars to copy for mounting patterns:
  - `test/unit/context/context.test.tsx` — mounts composer-level components.
  - `test/unit/nodes/HtmlNodeComponent.test.tsx` (and siblings) — mount card
    components inside an editor; use for `InklingCardWrapper`.
  - `test/unit/plugins/EmEnDashPlugin.test.tsx` — plugin+editor harness.

Repo conventions: Vitest globals, jsdom environment
(`vitest.config.ts:17-19`); `@testing-library/react` + `@testing-library/jest-dom`
available (devDependencies). Single quotes, no semicolons, width 120 (`oxfmt`).
Test files use `describe/it/expect` — match the exemplar file's imports
exactly (some import from `vitest` explicitly, some rely on globals).

## Commands you will need

| Purpose    | Command          | Expected on success                |
| ---------- | ---------------- | ---------------------------------- |
| Install    | `pnpm install`   | exit 0                             |
| Unit tests | `pnpm test:unit` | all pass                           |
| Typecheck  | `pnpm typecheck` | exit 0                             |
| Lint       | `pnpm lint`      | exit 0                             |
| Coverage   | `pnpm coverage`  | thresholds pass (plan 015 ratchet) |

## Scope

**In scope**:

- `test/unit/InklingComposer.test.tsx` (rewrite the stubs into real tests)
- New test files under `test/unit/components/` for `InklingComposableEditor`,
  `InklingNestedComposer` (smoke only), and `InklingCardWrapper` — one file
  each, small

**Out of scope**:

- Source changes under `src/` — if a component is untestable as-is, STOP and
  report rather than refactoring it for testability in this plan.
- `InklingEditor.tsx` full integration coverage (it's the composed product;
  covered by e2e) — at most a smoke render if it mounts cleanly.
- E2E tests.
- `enableMultiplayer: true` paths (requires y-websocket; smoke with
  `enableMultiplayer: false` only).

## Git workflow

- Branch: `advisor/016-composer-unit-tests`
- Commit style: e.g. `test(components): add InklingComposer unit tests`
- Do NOT push or open a PR unless the operator instructed it.

## Steps

### Step 1: Convert the three InklingComposer todos

Replace the stubs in `test/unit/InklingComposer.test.tsx` with real tests:

1. **renders**: mount `<InklingComposer>` with a child plugin tree minimal
   enough to render in jsdom (look at `test/unit/context/context.test.tsx`
   for the smallest working mount). Assert the editor root
   (`[contenteditable]`) exists.
2. **accepts initialEditorState prop**: pass a serialized state string
   containing one paragraph with text `hello`; assert the rendered editor
   contains `hello`. Also cover the empty-root-children guard: pass a state
   whose `root.children` is `[]` and assert the editor mounts (does not throw)
   and contains an empty paragraph.
3. **accepts onError / fileUploader fallback**: mount without
   `fileUploader.useFileUpload`; spy on `console.error` and assert the
   documented warning fires once (`<InklingComposer> requires a \`fileUploader\`
   prop…`).

### Step 2: Add smoke tests for the remaining exported composers

- `test/unit/components/InklingComposableEditor.test.tsx` (create): mount with
  required props (read the component's prop types first); assert it renders an
  editable surface.
- `test/unit/components/InklingNestedComposer.test.tsx` (create): mount inside
  a parent composer (pattern exists in `test/unit/plugins/TKPlugin.nested.test.tsx`
  — read it); assert the nested editable renders.
- `test/unit/components/InklingCardWrapper.test.tsx` (create): render a card
  wrapper around a trivial card node (pattern from
  `test/unit/nodes/*NodeComponent.test.tsx`); assert selection/visibility
  classes toggle with props per the component's actual API — keep this to 2-3
  assertions; do not reverse-engineer the whole component.

**Verify after each**: `pnpm test:unit -t "<file keyword>"` → pass.

### Step 3: Full verification

`pnpm test:unit` → all pass; `pnpm typecheck` → exit 0; `pnpm lint` → exit 0.
If plan 015 has landed, `pnpm coverage` → thresholds pass; if coverage
improved measurably, ratchet thresholds up per plan 015's maintenance policy
(only if 015 landed).

## Test plan

The steps above are the test plan. Cases to cover, summarized:

- InklingComposer: render, initialEditorState string, empty-root guard,
  fileUploader fallback warning.
- InklingComposableEditor: smoke render.
- InklingNestedComposer: nested mount smoke.
- InklingCardWrapper: 2–3 prop-driven class/state assertions.

## Done criteria

- [ ] `pnpm test:unit` exits 0; zero `it.todo` remains in
      `test/unit/InklingComposer.test.tsx`
- [ ] `pnpm typecheck` exits 0
- [ ] `pnpm lint` exits 0
- [ ] New test files exist under `test/unit/components/` and pass
- [ ] No `src/` files modified (`git status`)
- [ ] `plans/README.md` status row updated

## STOP conditions

Stop and report back (do not improvise) if:

- A component cannot be mounted in jsdom without source changes (e.g. requires
  browser-only APIs with no existing mock pattern) — report what's missing;
  cover the rest.
- A test requires flaky timing (real timers, network) to pass — rethink the
  assertion; do not add sleeps.
- The prop surface in the live components differs from "Current state"
  (drift).
- A step's verification fails twice after a reasonable fix attempt.

## Maintenance notes

- These tests are the jsdom-level contract for the public composer surface;
  when props change, update these first — they are faster than e2e for
  catching prop-shape regressions.
- If plan 015's ratchet is active, this plan should move coverage up several
  points (the composer files are large and currently at ~0% unit coverage).
- Reviewers: reject any `src/` change sneaking into this PR — it is
  test-only by design.
