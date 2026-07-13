# Plan 022: Spike — headless HTML/email serialization as a public API

> **Executor instructions**: Follow this plan step by step. This is a **spike
> plan**: the deliverable is a design document and a throwaway prototype, not
> a shipped API. Run every verification command and confirm the expected
> result. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the status row for this plan
> in `plans/README.md` — unless a reviewer dispatched you and told you they
> maintain the index.
>
> **Drift check (run first)**: `git diff --stat c689f8f..HEAD -- src/html/renderer/LexicalHTMLRenderer.ts src/html/html-to-lexical/html-to-lexical.ts src/index.ts docs/markdown-api.md`
> If any in-scope file changed since this plan was written, compare the
> "Current state" excerpts against the live code before proceeding; on a
> mismatch, treat it as a STOP condition.

## Status

- **Priority**: P3
- **Effort**: M
- **Risk**: LOW (additive design work; main product risk is committing to an API shape prematurely — the spike exists to de-risk that)
- **Depends on**: none
- **Category**: direction
- **Planned at**: commit `c689f8f`, 2026-07-13

## Why this matters

The just-shipped markdown round-trip API (`docs/markdown-api.md:7-14`) names
headless CMS integrations as its motivation — but the HTML side of the same
story is unreachable for package consumers. `LexicalHTMLRenderer` already
renders a serialized state to `html`, `email`, or `plaintext` targets with a
full test suite (`test/html-renderer/`), and `htmlToLexical(html)` provides
the import path — both fully implemented, tested, and absent from
`src/index.ts`. Consumers must either screen-scrape `HtmlOutputPlugin` (live
editor only) or reimplement. The email target is particularly notable: the
repo ships an `EmailEditor` product, yet external apps cannot produce the
same email HTML headlessly. This spike designs the public surface before
anyone commits to it.

## Current state (all verified against live code)

- `src/html/renderer/LexicalHTMLRenderer.ts:42-56` — class with
  `async render(lexicalState: SerializedEditorState | string, userOptions)`;
  options include `target: 'html' | 'email' | 'plaintext'` (default 'html'),
  `dom`, and feature flags. Creates a headless editor with
  `HeadingNode/ListNode/ListItemNode/QuoteNode/LinkNode + this.nodes`, gathers
  and fetches dynamic data (`getDynamicDataNodes`, line 66 — bookmark
  metadata etc.), then renders. **It is async** — the markdown API is
  synchronous; this asymmetry is a design question.
- `src/html/html-to-lexical/html-to-lexical.ts:56-79` —
  `htmlToLexical(html, options?)`, synchronous, JSDOM-based
  (`new JSDOM(...)` at line 67 — requires the `jsdom` package at runtime;
  note `jsdom` is currently a **devDependency** — packaging question).
- `test/html-renderer/` — existing suite: `render.test.ts`, `cards.test.ts`,
  `headings.test.ts`, `links.test.ts`, etc. The renderer's behavior is
  already characterized.
- `src/index.ts:61-62` — current exports: `export * from '@/utils'` and the
  markdown pair. The markdown API's naming (`markdownToLexicalState`,
  `lexicalStateToMarkdown`) sets the naming precedent.
- `src/markdown/markdown-html-renderer.ts:99` — `render(markdown)` → HTML,
  used internally by `MarkdownPastePlugin`; unexported. In scope for the
  design (markdown → HTML is the third leg of the conversion triangle).

Repo conventions: TypeScript strict, single quotes, no semicolons, width 120
(`oxfmt`). Design docs live in `docs/` (see `docs/markdown-api.md`,
`docs/markdown-card-transformers.md` for the established structure:
Motivation → Signatures → Registration → Limitations → Open questions →
Verification).

## Commands you will need

| Purpose    | Command          | Expected on success             |
| ---------- | ---------------- | ------------------------------- |
| Install    | `pnpm install`   | exit 0                          |
| Unit tests | `pnpm test:unit` | all pass                        |
| Typecheck  | `pnpm typecheck` | exit 0                          |
| Build      | `pnpm build`     | exit 0 (prototype bundle check) |

## Scope

**In scope**:

- `docs/html-api.md` (create — the spike deliverable)
- A prototype branch change to `src/index.ts` exporting the chosen surface
  behind a clearly-marked experimental name (throwaway — see Step 3)
- `package.json` analysis only (the jsdom dependency question — do not change
  it in this spike; record the recommendation)

**Out of scope**:

- Shipping the API (no unmarked exports on `main`; the spike ends with a
  decision document).
- Changing `LexicalHTMLRenderer` or `htmlToLexical` behavior.
- The opt-in node/transformer list for the markdown API (related open
  question — note the intersection, don't solve it here).

## Git workflow

- Branch: `advisor/022-html-api-spike`
- Commit style: e.g. `docs(html): spike headless HTML/email export API design`
- Do NOT push or open a PR unless the operator instructed it.

## Steps

### Step 1: Answer the design questions with evidence

For each question, read the code and write the answer (with file:line
evidence) into the draft doc:

1. **Class vs function**: `LexicalHTMLRenderer` is a class taking
   `dom/nodes/onError` in its constructor. Public shape options:
   (a) export the class as-is; (b) wrap in
   `lexicalStateToHtml(state, { target, nodes?, dom? })`. Recommend one —
   symmetry with `lexicalStateToMarkdown` favors (b).
2. **Naming**: `lexicalStateToHtml(state, {target})` / `htmlToLexicalState(html)`
   matching the markdown pair? `target: 'email'` inside an "html" function
   name — acceptable or does the name need `render`?
3. **Async**: the renderer is async (dynamic data fetch). Is the public API
   async-only, or does it offer a sync variant that skips dynamic data
   (document what is lost: bookmark metadata fetching)?
4. **jsdom packaging**: `htmlToLexical` requires `jsdom` at runtime
   (devDependency today). Options: make `jsdom` an optional peer (matches the
   repo's documented pattern), inject a DOM, or document Node-only usage.
   Check bundle impact of each.
5. **Nodes parameter**: which node set does the public API default to —
   `DEFAULT_NODES`? How do callers with custom nodes extend it (intersects
   with markdown-api open question 1 — note it).
6. **Email options**: `options.feature.emailCustomization` /
   `emailCustomizationAlpha` branches exist in card renderers
   (e.g. `button-renderer.ts:51,68`). Which flags become public API?

### Step 2: Write `docs/html-api.md`

Follow the `docs/markdown-api.md` structure: Motivation (cite the headless
CMS integration need and the EmailEditor asymmetry), Proposed signatures
(final recommendation per question above), Node registration, Limitations
(async, jsdom, dynamic data), Open questions, Verification (point at
`test/html-renderer/` as the existing characterization suite). Include a
worked example:

```ts
const state = htmlToLexicalState('<h1>Hello</h1>')
const emailHtml = await lexicalStateToHtml(state, { target: 'email' })
```

(adjust to the chosen names).

### Step 3: Throwaway prototype

On the spike branch only, export the chosen surface from `src/index.ts` with
an `experimental` prefix (e.g. `experimentalLexicalStateToHtml`) and add one
smoke test per direction (HTML→state, state→HTML, state→email) in a new
`test/html-api-spike/` file marked clearly as spike-scoped. Run
`pnpm test:unit` (must pass) and `pnpm build` (check what jsdom does to the
bundle if the import path is exercised — report size delta in the doc).

Then **revert the prototype** (`git checkout` the three touched paths) —
the doc is the deliverable; the prototype exists to validate feasibility.

### Step 4: Record the decision checklist

End the doc with the maintainer decision list: approve shape (a)/(b), naming,
async story, jsdom packaging, default node set, email flags. Each item gets a
"recommended" and "alternative" line so the follow-up implementation plan can
be written mechanically.

## Test plan

- Spike-scoped smoke tests in Step 3 (reverted with the prototype).
- The existing `test/html-renderer/` suite must pass untouched throughout.

## Done criteria

- [ ] `docs/html-api.md` exists, answers all six design questions with
      file:line evidence, and ends with the decision checklist
- [ ] The prototype demonstrated all three conversions working
      (`pnpm test:unit` passed during Step 3 — record output in the doc or commit)
- [ ] After Step 3 revert, `git status` shows only `docs/html-api.md` (and
      `plans/`) changed
- [ ] `pnpm typecheck` and `pnpm test:unit` exit 0 on the final state
- [ ] `plans/README.md` status row updated

## STOP conditions

Stop and report back (do not improvise) if:

- The excerpts in "Current state" don't match the live code (drift).
- `LexicalHTMLRenderer`'s dynamic-data fetch requires infrastructure a
  headless consumer can't provide (e.g. authenticated endpoints) — that
  changes the async story fundamentally; report before recommending.
- jsdom cannot be externalized cleanly (breaks the browser build when
  imported) — report the packaging evidence; the jsdom answer drives the
  whole API shape.
- The prototype reveals behavioral gaps consumers would hit immediately
  (e.g. missing node registration for common cards) — record them in the doc
  as limitations rather than fixing them.

## Maintenance notes

- This spike resolves `docs/markdown-api.md` open question territory on the
  HTML side; when implemented, update both docs together (plan 021's policy).
- The follow-up implementation plan should be small: the code and tests
  exist; it is exports + packaging + docs.
- Reviewers: the doc's value is the evidence citations — spot-check three of
  them against the code.
