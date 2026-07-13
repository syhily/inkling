# Plan 011: Isolate private Lexical API usage behind typed wrappers

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the status row for this plan
> in `plans/README.md` — unless a reviewer dispatched you and told you they
> maintain the index.
>
> **Drift check (run first)**: `git diff --stat c689f8f..HEAD -- src/utils/getEditorCardNodes.ts src/utils/isEditorEmpty.ts src/plugins/RestrictContentPlugin.tsx src/plugins/EmEnDashPlugin.tsx src/types/lexical-internals.ts`
> If any in-scope file changed since this plan was written, compare the
> "Current state" excerpts against the live code before proceeding; on a
> mismatch, treat it as a STOP condition.

## Status

- **Priority**: P2
- **Effort**: M
- **Risk**: MED (public-API equivalents have subtly different semantics; each site needs its own decision)
- **Depends on**: none
- **Category**: tech-debt
- **Planned at**: commit `c689f8f`, 2026-07-13

## Why this matters

Four call sites read Lexical's underscore-prefixed internals:
`editor._nodes` (×2), `editor._updating`, `editor._pendingEditorState`. These
fields change without notice between Lexical minors, and this repo just
absorbed a painful 0.46 upgrade (commits `3a4c109`, `522aaf0`, `3c65e16`
repaired the e2e suite and collaboration context after it). Each unguarded
site is a silent breakage point for the next upgrade. Where a public
equivalent exists with identical semantics, switch to it; where it does not,
isolate the private access behind one typed wrapper with a comment so an
upgrade touches exactly one place.

## Current state

- `src/types/lexical-internals.ts` already exists as the partial isolation
  point:

  ```ts
  // Lexical's private fields are not in the public types but are used throughout the codebase
  export interface InklingEditorInternals extends LexicalEditor {
    _parentEditor: LexicalEditor | null
    _updating: boolean
  }
  ```

- `src/utils/getEditorCardNodes.ts:1-17` — reads `editor._nodes` to find card
  node classes (has a TODO: "open upstream PR to add public method"). Full
  file is 17 lines; typed with `any`.
- `src/plugins/EmEnDashPlugin.tsx:97` —
  `const supportsHrShortcut = [...editor._nodes.values()].some(({ klass }) => klass.getType() === 'horizontalrule')`
- `src/plugins/RestrictContentPlugin.tsx:29` — `if (!editor._updating) { return }`
  in a `RootNode` transform (guards against cross-editor root transforms).
- `src/utils/isEditorEmpty.ts:9` —
  `const editorState = editor._pendingEditorState || editor.getEditorState()`
  with a comment explaining why the pending state is needed (undo timing).

Public-API landscape (Lexical 0.46 — verify in
`node_modules/lexical/Lexical.d.ts` before deciding each site):

- Registered node classes: no public accessor equivalent to `_nodes` in 0.46
  (check for `editor.getRegisteredNodes?` — if absent, keep private access but
  isolate it).
- Update-in-progress: no public equivalent to `_updating` (verify).
- Pending editor state: no public equivalent to `_pendingEditorState`
  (verify).

Repo conventions: TypeScript strict, single quotes, no semicolons, trailing
commas, width 120 (`oxfmt`). Vitest globals. Tests: EmEnDash behavior in
`test/e2e` (em/en dash tests) and RestrictContentPlugin via
`demo/RestrictedContentDemo.tsx` + e2e; `isEditorEmpty` is exercised through
card rendering tests in `test/nodes-base/`.

## Commands you will need

| Purpose    | Command                                          | Expected on success |
| ---------- | ------------------------------------------------ | ------------------- |
| Install    | `pnpm install`                                   | exit 0              |
| Typecheck  | `pnpm typecheck`                                 | exit 0              |
| Lint       | `pnpm lint`                                      | exit 0              |
| Unit tests | `pnpm test:unit`                                 | all pass            |
| E2E (spot) | `pnpm test:e2e -- -g "dash"` and `-g "restrict"` | pass                |
| Format     | `pnpm format:check`                              | exit 0              |

## Scope

**In scope**:

- `src/types/lexical-internals.ts`
- `src/utils/getEditorCardNodes.ts`
- `src/plugins/EmEnDashPlugin.tsx` (line 97 only)
- `src/plugins/RestrictContentPlugin.tsx` (line 29 only)
- `src/utils/isEditorEmpty.ts`
- Optionally one new wrapper module `src/utils/lexical-internals.ts` if the
  isolation functions don't fit an existing file

**Out of scope**:

- The paste-handling duplication in RestrictContentPlugin — plan 010.
- Any other `editor._*` usages the audit did not cite — if you find more,
  report them; add them to this plan only if they are one-line equivalents of
  the four above.
- Upstreaming to Lexical — out of repo scope; keep the TODOs.

## Git workflow

- Branch: `advisor/011-isolate-lexical-internals`
- Commit style: e.g. `refactor(utils): isolate private Lexical API usage behind typed wrappers`
- Do NOT push or open a PR unless the operator instructed it.

## Steps

### Step 0: Verify the public-API landscape

Open `node_modules/lexical/Lexical.d.ts` and confirm whether 0.46 exposes:
registered-node accessors, an updating flag, or a pending-state accessor.
Write the answer in the commit message. If any public equivalent exists with
identical semantics for a site, use it at that site and skip the wrapper for
that site.

### Step 1: Add typed accessors to the internals module

Extend `src/types/lexical-internals.ts` (or a new
`src/utils/lexical-internals.ts` importing that type) with one function per
private field actually needed:

```ts
import type { Klass, LexicalEditor, LexicalNode } from 'lexical'

export function getRegisteredNodeMap(editor: LexicalEditor): Map<string, { klass: Klass<LexicalNode> }> {
  // Private API (Lexical 0.46 has no public registered-node accessor).
  // TODO: open upstream PR to add a public method of getting nodes.
  return (editor as InklingEditorInternals & { _nodes: Map<string, { klass: Klass<LexicalNode> }> })._nodes
}

export function isEditorUpdating(editor: LexicalEditor): boolean {
  // Private API — no public "update in progress" flag in 0.46.
  return (editor as InklingEditorInternals)._updating
}

export function getCurrentEditorState(editor: LexicalEditor): EditorState {
  // Private API — pending state is required for correct empty checks after undo
  // (see isEditorEmpty's comment for the timing explanation).
  const internals = editor as InklingEditorInternals & { _pendingEditorState: EditorState | null }
  return internals._pendingEditorState || editor.getEditorState()
}
```

Add `_pendingEditorState` to `InklingEditorInternals` if you keep the casts in
the interface instead of inline.

### Step 2: Rewire the four call sites

- `getEditorCardNodes.ts`: use `getRegisteredNodeMap(editor)`; drop the `any`
  annotations in favor of the typed map; remove the `oxlint-disable` comments
  if they become unnecessary. Type the editor parameter as `LexicalEditor`.
- `EmEnDashPlugin.tsx:97`:
  `const supportsHrShortcut = [...getRegisteredNodeMap(editor).values()].some(({ klass }) => klass.getType() === 'horizontalrule')`
- `RestrictContentPlugin.tsx:29`: `if (!isEditorUpdating(editor)) { return }`
- `isEditorEmpty.ts`: `const editorState = getCurrentEditorState(editor)` —
  keep its existing comment; type the parameter back to `LexicalEditor` if the
  wrapper absorbs the cast.

**Verify**: `pnpm typecheck` → exit 0; `pnpm lint` → exit 0;
`pnpm test:unit` → all pass.

### Step 3: Grep gate

`grep -rn "editor\._nodes\|editor\._updating\|editor\._pendingEditorState\|\._parentEditor" src/` → matches only inside the wrapper module and
`src/types/lexical-internals.ts`.

## Test plan

- Behavior-preserving refactor: existing suites are the net. Specifically
  exercise: `pnpm test:unit -t "em"`/dash-related tests, RestrictContentPlugin
  e2e (`demo/RestrictedContentDemo.tsx` backs it — check
  `ls test/e2e | grep -i restrict`), and card empty-state tests
  (`pnpm test:unit -t "empty"` if such exist; otherwise the nodes-base suite).
- If Playwright browsers are unavailable, run a manual `pnpm dev` smoke:
  type `---` (HR shortcut must not become em-dash), undo in an editor with a
  nested card, and load the restricted-content demo path if reachable.

## Done criteria

- [ ] `pnpm typecheck` exits 0
- [ ] `pnpm lint` exits 0
- [ ] `pnpm test:unit` exits 0
- [ ] Step 3 grep returns matches only in the wrapper module and the internals type file
- [ ] No files outside the in-scope list are modified (`git status`)
- [ ] `plans/README.md` status row updated

## STOP conditions

Stop and report back (do not improvise) if:

- The excerpts in "Current state" don't match the live code (drift).
- Step 0 reveals a public API whose semantics differ subtly (e.g. a registered
  node accessor that excludes replacement nodes) — do not switch to it
  silently; isolate privately and report the difference.
- `getEditorCardNodes` callers depend on the `any[]` tuple shape in a way the
  typed map breaks — adjust the wrapper's return shape rather than weakening
  types at call sites.
- A step's verification fails twice after a reasonable fix attempt.

## Maintenance notes

- On every Lexical upgrade, the wrapper module is the checklist: re-verify
  each private access against the new version's public API and delete wrappers
  that become unnecessary.
- The upstream-PR TODO in `getEditorCardNodes` survives; the wrapper is where
  it now lives.
- `_parentEditor` is declared in `InklingEditorInternals` — if it has no
  remaining consumers after this plan, note that in the commit (do not remove
  it in this plan; triage belongs to plan 023).
