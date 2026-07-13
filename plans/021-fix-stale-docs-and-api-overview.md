# Plan 021: Fix stale docs and add a public API overview

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the status row for this plan
> in `plans/README.md` — unless a reviewer dispatched you and told you they
> maintain the index.
>
> **Drift check (run first)**: `git diff --stat c689f8f..HEAD -- README.md docs/markdown-api.md docs/markdown-card-transformers.md src/index.ts`
> If any in-scope file changed since this plan was written, compare the
> "Current state" excerpts against the live code before proceeding; on a
> mismatch, treat it as a STOP condition.

## Status

- **Priority**: P2
- **Effort**: S
- **Risk**: LOW (docs only)
- **Depends on**: plans/020-add-markdown-card-transformer.md (the markdown-api doc rewrite must describe the shipped card set, including the markdown card)
- **Category**: docs
- **Planned at**: commit `c689f8f`, 2026-07-13

## Why this matters

Three documentation drifts actively mislead consumers of this published
package: (1) `docs/markdown-api.md` still describes the shipped round-trip API
as a _proposal_ — "Proposed function signatures", "The prototype registers a
minimal node set", "Decorator cards are not round-tripped" — when
`src/markdown/round-trip.ts` registers 17 nodes + 10 (soon 11) card
transformers with full test coverage; readers can't tell implemented from
aspirational. (2) The README documents setup for an **Embed card** whose code
path is dead — `registerLinkMatching.ts:65` says explicitly
"$createEmbedNode does not exist in this codebase; the embed path is dead
code". (3) The public API surface (~60 exports in `src/index.ts`) has no
reference beyond the markdown docs, so consumers must read source to discover
the plugin/node-set/transformer inventory.

## Current state

- `docs/markdown-api.md:20` — `## Proposed function signatures`; `:34` — "The
  prototype registers a minimal node set…"; `:51-56` — "Decorator cards are
  not round-tripped. `MarkdownNode`, `ImageNode`, `GalleryNode`,
  `BookmarkNode`, etc. are not registered…"; `:70-71` — open question about
  an optional node/transformer list; `:90` — "Markdown cards (`.todo` until
  card transformers are designed)".
- Shipped reality (`src/markdown/round-trip.ts:46-79`): `MARKDOWN_NODES` (17
  entries) and `CARD_TRANSFORMERS` (10 entries: image, html, file, button,
  audio, video, gallery, bookmark, toggle, callout — plan 020 adds markdown).
- `README.md:46-48` — "Bookmark & Embed cards" section referencing
  `fetchEmbed.js` and CORS workarounds for a card that cannot be created.
  Actual behavior (`src/plugins/behaviour/registerLinkMatching.ts:59-69`):
  pasting a URL in an empty paragraph inserts a **bookmark** card.
- `src/index.ts:61-118` — the export surface, already organized by comment
  groups: `export * from '@/utils'`, the markdown pair, then a single block
  covering 5 editor components + DesignSandbox/EmailEditor, ~30 plugins, 5
  node sets, 7 transformer sets, `EMAIL_EDITOR_CARD_CONFIG`,
  `getEmailEditorCardConfig`, and `version`.

Repo conventions: docs are plain Markdown; README uses sentence-style
headings. No doc linting configured — verify by reading rendered output.

## Commands you will need

| Purpose     | Command               | Expected on success                 |
| ----------- | --------------------- | ----------------------------------- |
| Unit tests  | `pnpm test:unit`      | all pass (docs shouldn't affect it) |
| Grep checks | per Step verification | as specified                        |

## Scope

**In scope**:

- `docs/markdown-api.md` (rewrite to present tense, correct limitations)
- `docs/markdown-card-transformers.md` (small status update)
- `README.md` (fix Embed section; add Public API overview section)

**Out of scope**:

- Code changes of any kind.
- Full per-export API reference documentation (the overview lists groups with
  one-line descriptions and pointers — not signatures for 60 symbols).
- `AGENTS.md` / `CLAUDE.md` (plan 019).

## Git workflow

- Branch: `advisor/021-docs-overhaul`
- Commit style: e.g. `docs(markdown): rewrite API doc to match shipped behavior`
- Do NOT push or open a PR unless the operator instructed it.

## Steps

### Step 1: Rewrite `docs/markdown-api.md` to present tense

Concrete edits:

- `:20` heading → `## Function signatures` (drop "Proposed").
- `:32-47` → retitle `## Registered nodes` and describe the shipped set:
  the 6 Lexical/basic nodes plus the 11 card nodes from
  `round-trip.ts:46-64` (list them; confirm against the live file after
  plan 020).
- `:49-66` Limitations → keep only what is still true:
  - **HeaderNode and MarkdownNode**: after plan 020, only HeaderNode lacks a
    transformer — say exactly that. (If plan 020 has not landed, STOP — this
    plan depends on it.)
  - Code-block transformer coupling (`:57-59`) — keep if still accurate.
  - ExtendedTextNode note (`:60-63`) — keep; reword as a current decision,
    not "a production API should decide".
  - HTML-in-markdown note (`:64-66`) — keep if accurate.
  - Delete the "Decorator cards are not round-tripped" bullet entirely; add a
    `## Card support` section describing the `inkling:<card>` fence format
    with one example (copy a real one from `test/markdown/round-trip-cards.test.ts`).
- `:68-79` Open questions → drop question 3 (answered by the shipped fence
  format + plan 020); keep questions 1, 2, 4 verbatim as genuinely open.
- `:81-98` Verification → replace the bullet list with the real coverage:
  `test/markdown/round-trip.test.ts` (text formatting, lists, hr) and
  `test/markdown/round-trip-cards.test.ts` (11 card types). Keep the command
  block.

**Verify**: every claim in the rewritten doc traces to a file you opened —
grep each node/transformer name against `src/markdown/round-trip.ts`.

### Step 2: Fix the README Embed section

Replace `README.md:46-48` ("Bookmark & Embed cards") with a section titled
"Bookmark cards" describing the actual behavior: pasting a URL into an empty
paragraph creates a bookmark card; the demo fetches bookmark metadata on the
front end and needs CORS enabled (keep the browser-extension tip and the
`fetchEmbed.js` test-data escape hatch only if `fetchEmbed.js` still exists —
check `ls demo` / `grep -rn fetchEmbed demo` first; if it does not exist,
drop the reference).

**Verify**: `grep -rn "fetchEmbed" README.md demo src` — README mentions only
existing files.

### Step 3: Add a Public API overview to the README

Add a `## Public API` section after Installation, organized by the existing
export groups in `src/index.ts:61-118`:

- **Markdown API** — `markdownToLexicalState` / `lexicalStateToMarkdown`;
  link `docs/markdown-api.md`.
- **Components** — `InklingEditor`, `InklingComposableEditor`,
  `InklingComposer`, `InklingNestedComposer`, `InklingCardWrapper`,
  `EmailEditor`, `DesignSandbox` (one line each, from reading the files).
- **Plugins** — state that ~30 plugins are exported (list the names inline,
  comma-separated, copied from the barrel) with the one-line purpose for the
  non-obvious ones (e.g. `TKPlugin`, `ReplacementStringsPlugin`,
  `RestrictContentPlugin`).
- **Node sets** — `DEFAULT_NODES`, `BASIC_NODES`, `MINIMAL_NODES`,
  `EMAIL_NODES`, `EMAIL_EDITOR_NODES` (one line each).
- **Transformers** — the 7 exported sets (one line: which editor variant).
- **Config** — `EMAIL_EDITOR_CARD_CONFIG`, `getEmailEditorCardConfig`,
  `version`, and note `export * from '@/utils'` exposes URL
  validation/slugify helpers.

Keep it factual and short; no signatures beyond the markdown pair (already
documented). **Verify**: every symbol named exists in `src/index.ts`
(`grep -c` the names).

### Step 4: Status note in the transformer doc

Update `docs/markdown-card-transformers.md` migration plan (`:71-81`): mark
steps 1–2 done (all card transformers except header shipped), step 3 done by
this plan, and keep step 4 (opt-in node/transformer list) as the open item.

**Verify**: `pnpm test:unit` → all pass (sanity).

## Test plan

Docs-only plan; verification is the per-step greps and the full unit suite.

## Done criteria

- [ ] `grep -n "Proposed\|prototype" docs/markdown-api.md` returns no matches
- [ ] `grep -n "not round-tripped" docs/markdown-api.md` returns no matches
- [ ] `grep -rn "Embed card" README.md` returns no matches (or only as a
      historical note with the dead-code explanation)
- [ ] README contains a `## Public API` section; every symbol it names appears
      in `src/index.ts`
- [ ] `pnpm test:unit` exits 0
- [ ] No files outside the in-scope list are modified (`git status`)
- [ ] `plans/README.md` status row updated

## STOP conditions

Stop and report back (do not improvise) if:

- Plan 020 has not landed — the markdown-api rewrite would be stale on
  arrival; do 020 first.
- The live export surface differs from `src/index.ts:61-118` as quoted
  (drift).
- `fetchEmbed.js` still exists and is referenced elsewhere — keep the
  reference but correct what it does; report the other consumers.
- You find additional stale doc claims while editing — fix only claims you
  can verify against code; list the rest in the commit message.

## Maintenance notes

- Doc drift was found twice in this audit (markdown-api, README embed). When
  the public API changes, `docs/markdown-api.md` and the README overview must
  change in the same PR — add that to the PR template/checklist if one
  exists.
- The overview intentionally avoids per-symbol signatures; if the team later
  wants a full reference, generate it from the barrel + TSDoc rather than
  hand-maintaining.
