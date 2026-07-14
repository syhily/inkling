# Plan 029: Make the default HTML import-to-render round trip use one complete node set

> **Executor instructions**: Reproduce the empty-render failure first. Preserve
> the two existing customization semantics: renderer constructor nodes are
> additive; `htmlToLexical(..., {editorConfig})` continues to allow an explicit
> editor configuration to override defaults. Do not solve the problem by
> making errors visible only—the default round trip itself must work.
>
> **Drift check (run first)**:
> `git diff --stat 316dd61..HEAD -- src/html src/nodes/base/inkling-default-nodes.ts docs/html-api.md test/html-renderer test/html-to-lexical`

## Status

- **Priority**: P2
- **Effort**: M
- **Risk**: MED — changing registered default nodes affects parsing and renderer state hydration
- **Depends on**: none
- **Category**: bug / compatibility
- **Planned at**: commit `316dd61`, 2026-07-14

## Why this matters

Inkling's two paired HTML modules disagree about what an Inkling document is.
They are currently internal/spike surfaces rather than root package exports,
but `docs/html-api.md` proposes them as one future public round-trip API. The
importer registers the extended text/heading/quote replacements and all default
cards. The renderer registers only five basic Lexical nodes unless the caller
knows to supply `DEFAULT_NODES` manually. As a result, state produced by the
default importer can fail to parse in the default renderer;
because the renderer's default `onError` intentionally swallows errors, the
observable result is often an empty string rather than an actionable failure.

This violates the strongest compatibility expectation for paired APIs:
default output from one must be valid default input to the other.

## Current-state evidence

- `src/html/html-to-lexical/html-to-lexical.ts:43-53` defines importer defaults
  as `HeadingNode`, `LinkNode`, `ListItemNode`, `ListNode`, `QuoteNode`, and
  `...DEFAULT_NODES`.
- `src/nodes/base/inkling-default-nodes.ts:103-129` includes extended node
  replacements plus all base card nodes.
- `src/html/renderer/LexicalHTMLRenderer.ts:49-56` registers only the five
  basic nodes and `...this.nodes`.
- The repository's documented spike in `docs/html-api.md:142-159` reproduced
  the gap: importing `<h1>Hello</h1>` creates `extended-heading`; rendering
  that state with a default renderer yields empty output, while passing
  `DEFAULT_NODES` succeeds.
- Existing heading renderer tests pass `ExtendedHeadingNode` explicitly, and
  card renderer tests supply their node classes. They therefore validate
  customization but do not cover the paired default-to-default flow.
- Renderer constructor `nodes` are currently additive. Importer
  `editorConfig.nodes` replaces the default array through `Object.assign`.
  Both behaviors may have consumers and must remain intentional.

## Desired behavior

1. `htmlToLexical('<h1>Hello</h1>')` followed by
   `new LexicalHTMLRenderer().render(state)` returns an `<h1>` containing
   `Hello`, without custom node options.
2. The same default round trip works for representative default cards.
3. Passing nodes to `LexicalHTMLRenderer` adds custom nodes after the complete
   Inkling defaults.
4. Supplying `editorConfig.nodes` to the importer retains its current explicit
   override behavior.
5. Errors supplied through a custom `onError` still surface exactly as today;
   this plan does not change the callback contract.
6. No serialized node type or HTML markup is renamed.

## Scope

**In scope**:

- A shared HTML default-node definition under `src/html/`
- `src/html/renderer/LexicalHTMLRenderer.ts`
- `src/html/html-to-lexical/html-to-lexical.ts`
- HTML renderer/importer tests and `docs/html-api.md`
- Node option typing needed to represent Lexical replacement tuples honestly

**Out of scope**:

- Changing card renderer markup or email rendering
- Adding decorator-card support to the constrained markdown round-trip API
- Making `onError` throw by default
- Renaming `DEFAULT_NODES` or changing the editor's main node registry
- Deep-merging arbitrary `editorConfig.html` objects
- Exporting either HTML module from `src/index.ts`; resolve internal
  correctness before the separate API/publication decision

## Commands you will need

| Purpose     | Command                                                     | Expected on success |
| ----------- | ----------------------------------------------------------- | ------------------- |
| HTML tests  | `pnpm test:unit -- test/html-renderer test/html-to-lexical` | all tests pass      |
| Typecheck   | `pnpm typecheck`                                            | exit 0              |
| Lint/format | `pnpm lint && pnpm format:check`                            | both exit 0         |
| Full units  | `pnpm test:unit`                                            | all tests pass      |

## Git workflow

- Branch: `advisor/029-align-html-default-node-set`
- Commit 1: `test(html): reproduce default round-trip node mismatch`
- Commit 2: `fix(html): share complete default node registration`
- Commit 3: `docs(html): document node override semantics`
- Do not push or open a PR unless instructed.

## Steps

### Step 1: Lock the failure with paired-flow tests

Add a test file beside the existing HTML tests that uses only each module's
exported/default constructors. Include:

1. `<h1>Hello</h1>` → importer → renderer; assert normalized `<h1>` output and
   non-empty text.
2. A paragraph with bold/line-break/link content to ensure shared node changes
   do not regress basics.
3. At least one card state that the importer can generate from HTML, if such a
   serializer already exists; otherwise create a serialized state through the
   public base node and prove the default renderer recognizes it.
4. A custom node registered only through the renderer constructor; assert it
   still works in addition to the defaults.
5. An importer call with explicit `editorConfig.nodes`; assert it still uses
   the caller's override rather than silently appending Inkling nodes.

For the original regression, pass an `onError` spy as well as checking output.
Before the fix, it should record the unknown/unregistered node failure and the
output should be empty. After the fix, the spy must remain untouched.

Do not snapshot the entire serialized document if focused node-type and HTML
assertions express the contract more clearly.

**Verify (expected red before implementation)**:

```bash
pnpm test:unit -- test/html-renderer test/html-to-lexical
```

Only the newly added default round-trip case should fail.

### Step 2: Define one shared default registry

Create a module such as `src/html/default-html-nodes.ts` that exports the
complete default node configuration in a single order:

```ts
import type { CreateEditorArgs } from 'lexical'

export const DEFAULT_HTML_NODES = [
  HeadingNode,
  LinkNode,
  ListItemNode,
  ListNode,
  QuoteNode,
  ...DEFAULT_NODES,
] satisfies NonNullable<CreateEditorArgs['nodes']>
```

Use the actual installed Lexical type. Do not force the registry into
`Klass<LexicalNode>[]`: replacement descriptors in `DEFAULT_NODES` are valid
`CreateEditorArgs['nodes']` entries and should not be hidden by a cast.

Keep the ordering already used by the importer unless a focused test proves
Lexical requires a different order. Export a function returning a fresh array
if either caller/library mutates the configuration; otherwise a readonly
constant plus spread at each call is sufficient.

Do not move or duplicate `DEFAULT_CONFIG.html`; the node registry and HTML
import serializers are related but separate configuration axes.

### Step 3: Rewire the importer without changing override semantics

Replace its local `defaultNodes` with the shared registry. Continue building
the default config with:

- `nodes: [...DEFAULT_HTML_NODES]`;
- `html: DEFAULT_CONFIG.html`.

Preserve the current top-level override behavior of
`Object.assign({}, defaultEditorConfig, options?.editorConfig)`: if a caller
passes `editorConfig.nodes`, that exact registry wins. Add a short code comment
because the renderer uses additive semantics and a future maintainer might
otherwise “unify” the behaviors accidentally.

Type `htmlToLexicalOptions.editorConfig` as the minimum compatible Lexical
configuration if current required fields make an empty object invalid. Do not
make existing valid caller inputs stricter without compile evidence and a
compatibility test.

### Step 4: Rewire the renderer with additive custom nodes

Change the renderer's `nodes` field and constructor option from
`Klass<LexicalNode>[]` to the node-entry type accepted by
`CreateEditorArgs['nodes']`. Normalize an omitted value to an empty array.

At render time use:

```ts
nodes: [...DEFAULT_HTML_NODES, ...this.nodes]
```

This preserves the existing meaning of constructor nodes while adding the
missing Inkling defaults. Do not concatenate the five basics twice.

If a custom node deliberately replaces a default node, confirm that placing
custom entries last gives Lexical the expected replacement behavior. Add a
focused test. If Lexical rejects duplicate registration instead, implement a
small deterministic “custom entry overrides matching default type” merge based
on public node metadata; do not inspect private editor maps.

Keep renderer `dom`, dynamic data, transforms, async update behavior, and
default error policy unchanged.

### Step 5: Add regression coverage for compatibility edges

Extend tests with:

- serialized extended heading and quote nodes;
- a default card that uses dynamic data, verifying node registration does not
  change fetching behavior;
- custom-node addition;
- explicit importer override;
- custom `onError` still receives a genuinely malformed/unregistered state;
- repeated `render()` calls do not mutate the shared node array.

If any existing test depended on the renderer rejecting default Inkling cards,
stop and document that consumer contract; do not update the expectation
silently.

### Step 6: Update HTML API documentation

Replace the documented open issue/prototype warning with the implemented
contract:

- both directions default to the complete Inkling HTML node set;
- renderer `nodes` are additive;
- importer `editorConfig.nodes` is an advanced full override;
- custom node replacement order is documented from the verified behavior;
- decorator-card support in markdown remains unrelated and constrained.

Keep the existing DOM/jsdom and email-option documentation accurate; do not
fold unrelated packaging work into this change.

### Step 7: Run full gates

Run:

```bash
pnpm format
pnpm format:check
pnpm typecheck
pnpm lint
pnpm test:unit -- test/html-renderer test/html-to-lexical
pnpm test:unit
```

## Test plan

| Layer                  | Required cases                                                            |
| ---------------------- | ------------------------------------------------------------------------- |
| Public round trip      | heading, rich paragraph, representative default card                      |
| Renderer customization | custom node remains additive and wins only where intended                 |
| Import customization   | explicit `editorConfig.nodes` remains a full override                     |
| Error behavior         | no error on defaults; malformed/unknown states still reach custom handler |
| State isolation        | repeated renders do not mutate shared configuration                       |

## Acceptance criteria

- Default importer output renders with the default renderer for extended/basic
  nodes and representative cards.
- Both implementations import the same shared node registry.
- Replacement descriptors are correctly typed without `any` casts.
- Renderer custom nodes remain additive; importer node overrides remain
  explicit replacements.
- Documentation no longer describes the known empty-render gap as unresolved.
- All gates pass.

## STOP conditions

- Registering the complete defaults changes serialized node types or markup of
  ordinary documents.
- A currently documented consumer relies on the renderer rejecting/omitting
  Inkling nodes by default.
- Lexical cannot accept the replacement entries through its public
  `CreateEditorArgs['nodes']` type without a private-field or `any` cast.
- Custom-node ordering is ambiguous and produces different results across
  supported Lexical versions.
- The regression is actually caused by async renderer timing rather than node
  registration on the current revision; split and re-plan from that evidence.

## Rollback plan

Revert shared registry, both call-site changes, tests, and docs together. Do
not leave the importer and renderer pointing at different copied arrays. Keep
the red paired-flow test in a follow-up issue if rollback is required for a
compatibility reason.
