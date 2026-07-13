# Plan 017: Add unit tests for untested hooks and markdown paste/shortcut plugins

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the status row for this plan
> in `plans/README.md` — unless a reviewer dispatched you and told you they
> maintain the index.
>
> **Drift check (run first)**: `git diff --stat c689f8f..HEAD -- src/hooks/useTypeaheadTriggerMatch.ts src/hooks/useSearchLinks.ts src/plugins/MarkdownPastePlugin.tsx src/plugins/MarkdownShortcutPlugin.tsx test/unit/hooks test/unit/plugins`
> If any in-scope file changed since this plan was written, compare the
> "Current state" excerpts against the live code before proceeding; on a
> mismatch, treat it as a STOP condition.

## Status

- **Priority**: P2
- **Effort**: M
- **Risk**: LOW (additive tests only)
- **Depends on**: none (complements plans/005 and 016; no ordering constraint)
- **Category**: tests
- **Planned at**: commit `c689f8f`, 2026-07-13

## Why this matters

`src/hooks/` has 13 hooks; `test/unit/hooks/` covers 5. The untested set
includes `useTypeaheadTriggerMatch` (drives the slash/at-link menu triggers —
the exact surface whose e2e tests were just stabilized) and `useSearchLinks`
(link search; plan 005 fixes real races in it and this plan characterizes the
rest). On the plugin side, `MarkdownPastePlugin` and `MarkdownShortcutPlugin`
own the `*_TRANSFORMERS` sets exported from `src/index.ts:110-116` — the
highest-churn input paths in an editor — with no unit-level coverage; the
only net is e2e, which can't cover branch-level HTML/MIME-type combinations.
Fast characterization tests here are what make the next refactor (plans 006,
010, 012) safe.

## Current state

- Existing hook tests (pattern to copy): `test/unit/hooks/` contains
  `useGalleryReorder.test.ts`, `useInklingTextEntity.test.ts`,
  `useMovable.test.ts`, `usePinturaEditor.test.ts`,
  `useVisibilityToggle.test.ts` — `renderHook`-based.
- Untested hooks (verified by grep across `test/`): `useClickOutside`,
  `useSearchLinks`, `useTypeaheadTriggerMatch`, `useInputSelection`,
  `useCardDragAndDrop`, `useFileDragAndDrop`, `usePreviousFocus`,
  `useSettingsPanelReposition`.
- `useSearchLinks` shape (`src/hooks/useSearchLinks.ts:108-183`): takes
  `(query, searchLinks, { noResultOptions })`, returns `{ isSearching, listOptions }`;
  URL queries short-circuit to a "Link to web page" option
  (`URL_QUERY_REGEX` at line 7). Note: plan 005 adds race-guard tests in
  `test/unit/hooks/useSearchLinks.test.ts` — if 005 landed, extend that file;
  otherwise create it.
- Plugin test patterns: `test/unit/plugins/` has 14 files including
  `EmEnDashPlugin.test.tsx`, `WordCountPlugin.test.tsx`,
  `RestrictContentPlugin.test.ts`, and a `behaviour/` subdir. Headless-editor
  harness patterns also exist in `test/transforms/` and `test/markdown/`
  (e.g. `test/markdown/round-trip.test.ts` builds editor state without React).
- `MarkdownShortcutPlugin.tsx` exports the transformer sets
  (`ELEMENT_TRANSFORMERS`, `HR_TRANSFORMER`, `CODE_BLOCK_TRANSFORMER`,
  `DEFAULT_TRANSFORMERS`, etc.) wired to `src/index.ts:110-116`.

Repo conventions: Vitest globals, jsdom. Single quotes, no semicolons, width
120 (`oxfmt`).

## Commands you will need

| Purpose    | Command          | Expected on success |
| ---------- | ---------------- | ------------------- |
| Install    | `pnpm install`   | exit 0              |
| Unit tests | `pnpm test:unit` | all pass            |
| Typecheck  | `pnpm typecheck` | exit 0              |
| Lint       | `pnpm lint`      | exit 0              |

## Scope

**In scope** (new test files only):

- `test/unit/hooks/useTypeaheadTriggerMatch.test.ts` (create)
- `test/unit/hooks/useSearchLinks.test.ts` (create or extend plan 005's)
- `test/unit/hooks/useClickOutside.test.ts` (create)
- `test/unit/plugins/MarkdownShortcutPlugin.test.ts` (create)
- `test/unit/plugins/MarkdownPastePlugin.test.tsx` (create)

**Out of scope**:

- Source changes under `src/`.
- The remaining untested hooks (`useInputSelection`, `useCardDragAndDrop`,
  `useFileDragAndDrop`, `usePreviousFocus`, `useSettingsPanelReposition`) —
  deferred; they are DOM-drag heavy and better characterized after the
  drag-drop work in plan 006. Track in plan 023's triage list.
- E2E changes.

## Git workflow

- Branch: `advisor/017-hooks-and-markdown-plugin-tests`
- Commit style: e.g. `test(hooks): add useTypeaheadTriggerMatch coverage`
- Do NOT push or open a PR unless the operator instructed it.

## Steps

### Step 1: `useTypeaheadTriggerMatch` tests

Read the hook, then write `renderHook` cases covering:

- Trigger character (e.g. `/` or `@` per the hook's config) at start of
  paragraph → match fires with the expected lead offset.
- Trigger inside a word (`foo/bar`) → no match (or the hook's documented
  boundary behavior — assert what the code does, not what you wish).
- Whitespace/space termination → match cleared.
- Punctuation-only query edge cases present in the hook's regexes.

### Step 2: `useSearchLinks` tests

Create or extend `test/unit/hooks/useSearchLinks.test.ts`:

- URL query (`https://…`) → `urlQueryOptions` path, `searchLinks` not called.
- Empty query → default options path (`isSearching` true then false).
- Results → `convertSearchResultsToListOptions` mapping (labels, values,
  `type` field).
- If plan 005 did **not** land: also add the stale-response and
  undefined-result cases from plan 005's test plan (the bug still exists;
  the tests will fail — in that case STOP and do plan 005 first, or mark
  these two cases `it.fails` with a comment linking plan 005).

### Step 3: `useClickOutside` tests

`renderHook` with a ref attached to a jsdom element; dispatch
`mousedown`/`touchstart` (match the hook's events) inside and outside;
assert the callback fires only for outside events and that cleanup removes
the listener (`rerender`/unmount then dispatch → no call).

### Step 4: Markdown plugin tests

- `test/unit/plugins/MarkdownShortcutPlugin.test.ts`: use the headless
  pattern from `test/transforms/` — create an editor with the plugin's
  transformer set and assert `$convertToMarkdownString` /
  `$convertFromMarkdownString` behavior for: headings, lists, quote, hr,
  code block (language round-trip), sub/superscript if in the set. One
  `it` per transformer, mirroring `test/markdown/round-trip.test.ts`
  structure but targeting the plugin exports rather than the round-trip API.
- `test/unit/plugins/MarkdownPastePlugin.test.tsx`: mount the plugin in the
  React harness from `test/unit/plugins/` and dispatch a `PASTE_COMMAND` with
  a synthetic ClipboardEvent carrying `text/plain` markdown and, separately,
  `text/html`. Assert the resulting editor state (markdown branch converts
  `# Title` to a heading; HTML branch is left to Lexical/default handling —
  assert what the plugin actually does).

**Verify after each step**: `pnpm test:unit -t "<keyword>"` → pass.

### Step 5: Full verification

`pnpm test:unit` → all pass; `pnpm typecheck` → exit 0; `pnpm lint` → exit 0.
If plan 015 landed and coverage moved up, ratchet thresholds per its policy.

## Test plan

Covered by the steps. Structural patterns to copy:

- Hooks: `test/unit/hooks/useVisibilityToggle.test.ts`.
- Headless plugin/transformer: `test/markdown/round-trip.test.ts`.
- React-mounted plugin: `test/unit/plugins/EmEnDashPlugin.test.tsx`.

## Done criteria

- [ ] `pnpm test:unit` exits 0; the five new/extended test files exist and pass
- [ ] `pnpm typecheck` exits 0
- [ ] `pnpm lint` exits 0
- [ ] No `src/` files modified (`git status`)
- [ ] No `it.fails`/`it.skip` left behind (the plan 005 dependency either
      landed or those cases were deferred per Step 2)
- [ ] `plans/README.md` status row updated

## STOP conditions

Stop and report back (do not improvise) if:

- Plan 005 has not landed and you hit the known `useSearchLinks` races — do
  not paper over them with timing hacks; use `it.fails` or reorder to do 005
  first.
- A hook/plugin can't be tested without source changes — report what's
  missing; skip that file.
- ClipboardEvent synthesis in jsdom proves insufficient for the paste plugin
  (some APIs are stubbed) — fall back to asserting the command handler
  directly, and report the limitation.
- A step's verification fails twice after a reasonable fix attempt.

## Maintenance notes

- These characterization tests are the safety net cited by plans 006 (at-link
  gating), 010 (paste consolidation), and 012 (keyboard split) — keep them
  green before executing those.
- Deferred hooks are tracked in plan 023's triage list so they aren't lost.
- Reviewers: assertion values should describe current behavior; flag any test
  that encodes obviously-wrong behavior without a `// TODO: bug` comment.
