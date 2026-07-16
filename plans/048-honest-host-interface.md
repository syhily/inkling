# Plan 048: Make the host interface honest (2.0.0)

> **Executor instructions**: This plan closes the host-facing config type
> (`CardConfig`), exports the types hosts must name, removes two barrel
> exports that were never public surface, deletes accumulated type cruft, and
> folds two forwarder contexts — shipped as a **hard break with a major
> version bump to 2.0.0, no deprecation cycle** (decided at grilling
> 2026-07-16). The design is decided; do not reintroduce an index signature,
> a deprecated alias, or a compat shim. Interface names marked "illustrative"
> may be refined by the executor; the shape (closed composed type, named
> per-area slices, exported type family, removed barrel entries) may not.
> **Plan 047 must land first** — it re-splits the module `CardConfig` lives
> in; locate the declaration with a grep for `interface CardConfig` before
> Step 1.
>
> Work commits **directly on `main`** — no branches, no push, no PRs
> (grilling decision; overrides the `advisor/NNN-<slug>` convention in
> `plans/README.md`). Conventional commit messages; breaking commits carry
> the `!` marker.
>
> **Drift check (run first)**:
> `git diff --stat d998080..HEAD -- src/context src/components src/index.ts src/plugins/FloatingToolbarPlugin.tsx demo test/typecheck test/typecheck-consumer package.json scripts/verify-packed-package.mjs README.md CONTEXT.md`

## Status

- **Priority**: P1
- **Effort**: M
- **Risk**: MEDIUM — intentional breaking change to the published type
  surface; zero runtime behavior change is the invariant everywhere else
- **Confidence**: HIGH
- **Depends on**: 047 (re-splits the context module that declares
  `CardConfig`/`FileUploader`/`FileUploaderInput`)
- **Category**: architecture deepening / interface honesty
- **Planned at**: commit `d998080`, 2026-07-16

## Why this matters

The host-facing surface lies in both directions: it hides what hosts need
and advertises what hosts should never touch.

`CardConfig` (`src/context/InklingComposerContext.tsx:33-52`) declares 17
keys plus `[key: string]: unknown`. The index signature makes the declared
keys unenforceable: renaming or tightening any of them breaks nothing
mechanically and breaks hosts silently, because every host payload still
compiles. The type is read across ~15 src modules (card menus, card node
components, toolbars, hooks, the gif adapter) — all through optional chains
like `cardConfig?.tenor`, `cardConfig?.searchLinks`, `cardConfig?.stripeEnabled`
— so the compiler is the only guard, and it is switched off. Worse, the bag
carries **dead keys**: `renderLabels`/`fetchLabels` are declared and set by
the demo but read nowhere; `feature` is read once
(`InklingCardWrapper.tsx:210`) into a destructure that never uses it
(`src/components/ui/CardWrapper.tsx:43`); the demo sets `siteTitle`,
`siteDescription`, `membersEnabled` — keys that are not even declared and
survive only through the index signature. The interface claims to be the
host contract and is actually a landfill.

In the other direction, the types hosts genuinely must name — `CardConfig`,
`FileUploader`, `FileUploaderInput` — are **not exported from the barrel**
(`src/index.ts`). The demo deep-imports them from
`@/context/InklingComposerContext` (`demo/DemoApp.tsx:8`,
`demo/HtmlOutputDemo.tsx:6`, `demo/RestrictedContentDemo.tsx:7`), a path the
packed package does not expose (`package.json` exports only `.`). A real host
cannot write `const config: CardConfig = {...}` against the published
declaration; the shapes exist in `dist/editor.d.ts:2915-2979` as unexported
declarations.

Meanwhile the barrel exports two things that are not public surface:
`DesignSandbox` (`src/index.ts:85`) — a 385-line static design-mockup page
(`src/components/DesignSandbox.tsx`) with ~31 SVG icon imports, used only by
the demo's `/designsandbox` route (`demo/demo.tsx:23`) and shipping in the
published bundle and declaration (`dist/editor.d.ts:2814`) — and
`InklingCardWrapper` (`src/index.ts:91`), an internal `CardContext` provider
consumed by `src/nodes/decorate-card.tsx:4` and one unit test via deep
import. Both are documented in `README.md:66-68` as if they were supported
surface. Every barrel entry is depth we maintain for strangers; these two
have no legitimate consumer.

The smaller dishonesties compound:

- `hiddenFormats as never[]` is cast twice along one prop path
  (`InklingComposableEditor.tsx:156`, `FloatingToolbarPlugin.tsx:146`) even
  though every declaration on that path is already `hiddenFormats?: string[]`
  (`InklingComposableEditorProps`, `FloatingToolbarPlugin.tsx:25`,
  `FloatingFormatToolbar.tsx:49`, `FormatToolbarProps` at
  `FormatToolbar.tsx:61`). The casts are load-bearing nothing, present since
  the initial commit, and they tell every reader the types are lying.
- `InklingNestedEditor` declares `readOnly?: boolean` and
  `style?: React.CSSProperties` (`InklingNestedEditor.tsx:41-42`), never
  destructures them, and no call site passes them (verified:
  `HeaderCard.tsx:387,419`, `ToggleCard.tsx:29,50`, `CalloutCard.tsx:156`).
- `InklingEditorProps` redeclares `onChange` with the identical inherited
  type (`InklingEditor.tsx:13-15`); `EmailEditorProps` does the same via
  `Omit<InklingComposableEditorProps, 'onChange'>` plus redeclaration
  (`EmailEditor.tsx:56-62`).
- `SharedHistoryContext.tsx` (21 lines) and `SharedOnChangeContext.tsx`
  (23 lines) are pure forwarders. Each hook has exactly one consumer
  (`InklingComposableEditor.tsx:77,86`); each provider is nested verbatim in
  the two editor variants (`InklingEditor.tsx:19-26`,
  `EmailEditor.tsx:99-122`). The composition rule they encode — shared undo
  stack and nested→top-level `onChange` bubbling — lives only as convention
  inside `InklingComposableEditor._onChange` (:86-106), nowhere written down.

Grilling decision (2026-07-16): this lands as a **hard break at 2.0.0** —
remove the exports, close the index signature, no deprecation cycle. The
demo's `as CardConfig` casts (`DemoApp.tsx:438`, `HtmlOutputDemo.tsx:114`)
become the drift detector: they must compile against the closed type or be
fixed. Verified experimentally with the repo's `tsc` (6.0.3): **`as` casts
suppress excess-property checks even on fresh literals, and pre-declared
variables never get excess-property checks** — only annotation or
direct-assignment positions on fresh literals raise TS2353. So the drift
detector requires _removing_ the casts and _annotating_ the demo config
declarations; merely closing the type would let the demo's dead keys slip
through the casts unnoticed.

## Current-state evidence

Verified fresh against commit `d998080`:

- `CardConfig` = 17 declared keys + `[key: string]: unknown`
  (`src/context/InklingComposerContext.tsx:33-52`). Key census (every read
  verified):
  - **live**: `visibilitySettings` (`InklingCardWrapper.tsx:180`,
    `useVisibilityToggle.ts:29`), `stripeEnabled` (`useVisibilityToggle.ts:28`),
    `snippets`/`createSnippet`/`deleteSnippet` (`buildCardMenu.ts:91,145`,
    `SnippetCreateToolbar.tsx:26`, `SnippetActionToolbar.tsx:48`, plus
    `hide={!cardConfig.createSnippet}` in eleven card node components),
    `searchLinks` (`BookmarkNodeComponent.tsx:237,255`,
    `FloatingFormatToolbar.tsx:52`, `AtLinkPlugin.tsx:172`),
    `fetchAutocompleteLinks` (`SettingsPanel.tsx:210-213`),
    `siteUrl` (`BookmarkNodeComponent.tsx:87`,
    `LinkActionToolbarWithSearch.tsx:135`, `AtLinkPlugin.tsx:173`),
    `fetchEmbed` (`BookmarkNodeComponent.tsx:156,188`),
    `klipy`/`tenor` (`src/utils/services/gif.ts:37-50`,
    `src/nodes/cards/card-menus.ts:209`),
    `pinturaConfig` (`ImageNodeComponent.tsx:119`,
    `header/HeaderNodeComponent.tsx:82`),
    `image.allowedWidths` (`ImageNodeComponent.tsx:123-124`),
    `post.displayName` (`buildCardMenu.ts:52` — gates card-menu items by
    the host's content-type name).
  - **dead**: `feature` (only read: `InklingCardWrapper.tsx:210` →
    destructured and unused at `CardWrapper.tsx:43`), `renderLabels`,
    `fetchLabels` (no readers anywhere; grep confirms only the declaration
    and the demo's assignments at `demo/DemoApp.tsx:88-89`).
  - **write-only**: `editorType` — set by `getEmailEditorCardConfig`
    (`EmailEditor.tsx:47`) and merged by the demo (`DemoApp.tsx:432`), read
    nowhere in src or demo. Pinned as merge _output_ by
    `test/unit/EmailEditor.test.ts:53-60`.
  - **undeclared demo-only** (index-signature passengers): `siteTitle`,
    `siteDescription`, `membersEnabled` (`demo/DemoApp.tsx:90-93`).
- `FileUploader` (`InklingComposerContext.tsx:12-27`) and `FileUploaderInput`
  (:31, with the documented legacy-tolerance comment at :29-30 from plan 026)
  are also unexported; `InklingComposerProps` consumes them at
  `InklingComposer.tsx:49-50`.
- Barrel exports `DesignSandbox` (`src/index.ts:9,85`) and
  `InklingCardWrapper` (`src/index.ts:11,91`); both present in
  `dist/editor.d.ts` (:2814, :3030). Consumers of `InklingCardWrapper` are
  deep imports only: `src/nodes/decorate-card.tsx:4`,
  `test/unit/components/InklingCardWrapper.test.tsx:6`. The only
  `DesignSandbox` consumer is `demo/demo.tsx:6,23`. No story and no e2e spec
  references either (verified: `src/**/*.stories.tsx` barrel-import only node
  sets; no `designsandbox` match under `test/e2e/`).
- `README.md:66,68` documents both as public. `AGENTS.md`'s barrel note
  (deep-import `@/components/InklingCardWrapper` from node wrappers) stays
  true after the removal and needs no edit.
- `verify-packed-package.mjs:78-93` (`EXPORT_ASSERTIONS`) asserts only
  presence of seven exports — removal will not trip it; it needs negative
  assertions to pin the removal.
- `getEmailEditorCardConfig(cardConfig: Record<string, unknown> = {})`
  (`EmailEditor.tsx:40-54`) is a sanitizer: it clamps `visibilitySettings`
  to an allowed set (:38-43) and force-sets `image.allowedWidths` and
  `editorType`. `EmailEditorProps.cardConfig` is `Record<string, unknown>`
  (:60). Its test (`test/unit/EmailEditor.test.ts:53-60`) passes
  `{ editorType: 'full' }` — type-invalid under a closed type, but
  `test/unit/**` is excluded from the root tsconfig, so it never typechecks;
  runtime spread-through keeps it green.
- Forwarder contexts: `src/context/SharedHistoryContext.tsx` (21 lines),
  `src/context/SharedOnChangeContext.tsx` (23 lines); no test imports them;
  the only hook consumer is `InklingComposableEditor` (:77, :86); the only
  provider nestings are `InklingEditor.tsx:19-26` and `EmailEditor.tsx:99-122`.
- Version flows from `package.json` (`"version": "1.8.3"`) into the bundle
  via `__APP_VERSION__` (`vite.config.ts:48`); no hardcoded version string
  elsewhere in src/docs/README.
- Typecheck fixtures pin the current surface: `test/typecheck/public-editor-api.tsx`
  (root tsconfig, `@/index`) and `test/typecheck-consumer/consumer.tsx`
  (installed into packed consumers by `scripts/verify-packed-types.mjs`).
  The root tsconfig includes `demo/**/*`, so demo type edits are gated by
  `pnpm typecheck`.
- Gates baseline at `d998080` (from plan 040's execution record):
  `pnpm test:unit` = 1707 passed + 21 todo (206 files);
  `pnpm vitest run test/nodes-base test/html-renderer` = 730 passed + 21
  todo (46 files); typecheck/lint/format:check clean. This plan touches no
  renderer and no test expectation — both numbers must hold exactly.
- Coverage thresholds (`vitest.config.ts:36`) are floors over `src/**`;
  removing `DesignSandbox.tsx` (385 lines, no unit test) shrinks the
  denominator and can only raise the ratios.

## Scope

**In scope**:

- Closing `CardConfig`: per-feature-area slice interfaces (gif / snippets /
  linking / visibility / upload) composed into one exported closed
  host-config type — no index signature, dead keys deleted, every live key
  on a slice (census above). Keep the name `CardConfig` for the composed
  type: the demo, docs, and internal readers already use it, and the
  grilling approved closing it, not renaming it.
- Deleting the dead read chains: `CardConfig.feature` +
  `InklingCardWrapper.tsx:210` pass + `CardWrapper`'s unused `feature`
  prop/destructure; `renderLabels`/`fetchLabels`.
- Exporting the host type family from the barrel as type-only exports:
  `CardConfig`, the slices, `FileUploader`, `FileUploaderInput`, and the
  callback shapes hosts must implement (`SearchResult`, `ListOptionItem`
  from `src/hooks/useSearchLinks.ts`).
- Adopting the closed type at the composer boundary:
  `InklingComposerProps.cardConfig` (unchanged reference), and
  `EmailEditorProps.cardConfig` from `Record<string, unknown>` to
  `CardConfig`. `getEmailEditorCardConfig` keeps its
  `Record<string, unknown>` **input** (it sanitizes legacy bags — that is
  its honest input contract) and gains an explicit typed **return**
  (`CardConfig & { editorType: string }`, illustrative); its runtime,
  including the `...cardConfig` spread-through and the write-only
  `editorType` output, is unchanged so `test/unit/EmailEditor.test.ts`
  stays green unedited.
- Demo drift detector: import the types from the barrel, delete the
  `as CardConfig` casts, annotate the demo config declarations, delete the
  dead demo keys (`renderLabels`, `fetchLabels`, `siteTitle`,
  `siteDescription`, `membersEnabled`, and the `editorType` merge), and
  coalesce the `TenorConfig | null` / `KlipyConfig | null` demo values to
  `undefined` for the strict optional keys.
- Removing `DesignSandbox` and `InklingCardWrapper` from the barrel; moving
  `src/components/DesignSandbox.tsx` to `demo/components/DesignSandbox.tsx`
  (the `/designsandbox` route must keep working — imports of
  `@/styles/index.css` and `@/assets/icons/*` keep resolving through the
  existing `@/*` alias); updating `README.md:60-68`.
- Type cruft: delete both `hiddenFormats as never[]` casts (the source
  types are already `string[]`; nothing else changes); delete
  `InklingNestedEditor`'s `readOnly`/`style` dead props; collapse the
  redundant `onChange` redeclarations in `InklingEditor.tsx` and
  `EmailEditor.tsx`.
- Folding `SharedHistoryContext` + `SharedOnChangeContext` into one module
  (illustrative: `src/context/SharedEditorStateContext.tsx` with one
  provider + one hook) and documenting the composition rule in its module
  header (see Step 6).
- `package.json` → `2.0.0`; typecheck fixtures pin the new surface
  (positive + negative cases); `verify-packed-package.mjs` gains negative
  export assertions; full gates including `pnpm verify:package`,
  `pnpm verify:types`, and `pnpm build:demo`.
- A short `CONTEXT.md` glossary entry for the host-config term.

**Out of scope**:

- Any runtime behavior change. Zero unit-test expectation edits is the
  acceptance posture; the one test that brushes the change
  (`test/unit/EmailEditor.test.ts`) must pass unmodified.
- Closing `FileUploaderInput`'s legacy tolerance (`Partial<FileUploader> |
Record<string, unknown>`) — a documented plan-026 tradeoff; do not
  re-litigate.
- Renaming `CardConfig` or reshaping key _value_ types (e.g. narrowing
  `visibilitySettings?: string` to a union) — closing the keys is the
  decided change; value tightening is a follow-up.
- The `editorType` write-only merge output: kept for runtime tolerance
  (its test pins it), documented as output-only. Deleting it is a separate
  decision.
- e2e — no e2e spec touches the demo route or the public type surface;
  the demo gate is `pnpm build:demo` plus `pnpm typecheck`.
- Moving or renaming `InklingCardWrapper`'s module — it stays at
  `src/components/InklingCardWrapper.tsx` for its deep-import consumers.

## Commands you will need

| Purpose                      | Command                                              | Expected on success                                  |
| ---------------------------- | ---------------------------------------------------- | ---------------------------------------------------- |
| Locate post-047 declaration  | grep for `interface CardConfig` under `src/`         | exactly one declaration site                         |
| Static gate (covers demo)    | `pnpm typecheck`                                     | clean                                                |
| Unit baseline                | `pnpm test:unit`                                     | 1707 passed + 21 todo, zero expectation edits        |
| Renderer sanity subset       | `pnpm vitest run test/nodes-base test/html-renderer` | 730 passed + 21 todo (untouched, but cheap to prove) |
| Lint / format                | `pnpm lint && pnpm format:check`                     | clean                                                |
| Demo build (route must work) | `pnpm build:demo`                                    | builds; `/designsandbox` chunk present               |
| Packed runtime surface       | `pnpm verify:package`                                | PASS incl. new negative assertions                   |
| Packed type surface          | `pnpm verify:types`                                  | PASS under Bundler + NodeNext                        |

## Git workflow

- Branch: none — commit directly on `main` (grilling decision). Do not
  push, do not open a PR.
- Commit 1: `refactor(composer)!: close CardConfig into per-feature-area host-config interfaces`
- Commit 2: `feat(editor)!: export the host-config type family from the barrel`
- Commit 3: `refactor(demo): type demo card configs against the closed CardConfig`
- Commit 4: `refactor(editor)!: remove DesignSandbox and InklingCardWrapper from the public barrel`
- Commit 5: `refactor(editor): drop never[] casts, dead props, and redundant onChange redeclarations`
- Commit 6: `refactor(editor): fold shared history/onChange forwarders into one context module`
- Commit 7: `chore(release)!: bump @inkling/editor to 2.0.0 and pin the new public surface`

## Steps

### Step 1: Close `CardConfig` into per-area slices and delete the dead chains

In whatever module plan 047 leaves declaring `CardConfig` (pre-047:
`src/context/InklingComposerContext.tsx:33-52`):

- Replace the open interface with per-feature-area slice interfaces
  (names illustrative — avoid the existing collisions `GifConfig`
  (gif.ts:25), `GifProviderConfig` (gif.ts:18), `SnippetData`
  (buildCardMenu.ts), e.g. `GifSettings`, `SnippetSettings`,
  `LinkingSettings`, `VisibilitySettings`, `UploadSettings`):
  - gif: `klipy?: { apiKey?: string; contentFilter?: string }`,
    `tenor?: { googleApiKey?: string; contentFilter?: string }`
  - snippets: `snippets`, `createSnippet`, `deleteSnippet` (lift the
    existing signatures verbatim; consider a named snippet-item type so
    hosts can name `Array<{ name: string; value: string }>` — executor
    detail)
  - linking: `searchLinks`, `fetchAutocompleteLinks`, `siteUrl`,
    `fetchEmbed`
  - visibility: `visibilitySettings`, `stripeEnabled`
  - upload: `image?: { allowedWidths?: string[] }`, `pinturaConfig?: object`
- Compose the slices into `interface CardConfig extends ...` (or an
  intersection type) **without** `[key: string]: unknown`. Place
  `post?: { displayName?: string }` either on a small sixth slice or
  directly on the composed type with a comment (card-menu content-type
  gating, `buildCardMenu.ts:52`) — executor detail; it must remain declared.
- Delete `feature`, `renderLabels`, `fetchLabels` and their read chains:
  `InklingCardWrapper.tsx:210` (`feature={cardConfig?.feature}`),
  `CardWrapperProps.feature` (`CardWrapper.tsx:23`) and its destructure
  (`CardWrapper.tsx:43`).
- `InklingComposerContextValue.cardConfig` keeps its `CardConfig`
  reference; the context default `{}` still satisfies the closed type.
- Adopt the closed type at the email boundary: `EmailEditorProps.cardConfig`
  becomes `CardConfig`; `getEmailEditorCardConfig` keeps
  `Record<string, unknown>` input and gains an explicit
  `CardConfig & { editorType: string }` (illustrative) return annotation.
  Drop its now-redundant inner casts (:41-42, :49) only if the compiler
  agrees they are unnecessary; keep runtime lines otherwise identical.
- Optional locality win (executor detail): `src/utils/services/gif.ts:31-34`
  may import the gif slice instead of declaring its local `CardConfigLike`.
- Add the `CONTEXT.md` glossary entry for the host config (the closed,
  per-area-sliced bag a host hands `<InklingComposer>`; distinguish from
  "card spec"/"card declaration" — the glossary already forbids "card
  config" as a term for card spec, and this entry should say why the
  exported name `CardConfig` is nonetheless kept).
- No barrel changes yet. `pnpm typecheck` must pass; the demo still
  compiles because its `as CardConfig` casts suppress excess-key checks
  (that hole is closed deliberately in Step 3). Run `pnpm test:unit`:
  1707 + 21, no edits.

### Step 2: Export the host-config type family from the barrel

- In `src/index.ts`, add type-only exports next to the existing type block
  (:66-71): `CardConfig`, the slice interfaces, the snippet-item type if
  named, `FileUploader`, `FileUploaderInput` (from the post-047 module),
  and `SearchResult` + `ListOptionItem` (from `@/hooks/useSearchLinks`).
- No runtime export changes; `dist/editor.d.ts` should show the same shapes
  now carrying `export` keywords. Run `pnpm typecheck`, `pnpm lint`.
- Do not bump the version yet — the surface is not final until Step 6.

### Step 3: Make the demo the drift detector

- `demo/DemoApp.tsx`, `demo/HtmlOutputDemo.tsx`,
  `demo/RestrictedContentDemo.tsx`: switch the type imports from
  `@/context/InklingComposerContext` to the barrel (`@/`).
- `DemoApp.tsx`: annotate `const defaultCardConfig: CardConfig` (:79,
  replacing `Record<string, unknown>`); delete the dead keys
  (`renderLabels`, `fetchLabels`, `siteTitle`, `siteDescription`,
  `membersEnabled`); delete `editorType` from the cardConfig merge (:432 —
  the local `editorType` variable stays for the demo's own routing);
  remove the `as CardConfig` cast (:438) and annotate the merged
  declaration `const cardConfig: CardConfig = {...}`. Fix the typed reads
  the annotation now makes honest: `defaultCardConfig.searchLinks` (:436)
  and `.stripeEnabled` (:437) are `unknown` today — annotate first, then
  the ternaries type-check without casts.
- `HtmlOutputDemo.tsx` / `RestrictedContentDemo.tsx`: annotate their
  `cardConfig` literals `: CardConfig` (:28-31 / :29-32), coalesce the gif
  configs (`tenor: tenorConfig ?? undefined`, `klipy: klipyConfig ?? undefined`),
  and drop the `as CardConfig` cast at the JSX prop
  (`HtmlOutputDemo.tsx:114`), letting the spread literal check against the
  prop directly (fresh-literal excess-property checks apply to spreads —
  verified). The `as FileUploader` casts may stay (shape tolerance) or be
  revisited if the compiler accepts the demo's hook shape — executor
  detail; the drift detector is the cardConfig path.
- Proof point: `pnpm typecheck` now fails if anyone adds a key the editor
  does not read to any demo config. Run `pnpm test:unit` — 1707 + 21,
  no edits (e2e fixtures use `isTestEnv` gif configs, untouched).

### Step 4: Remove `DesignSandbox` and `InklingCardWrapper` from the barrel

- `git mv src/components/DesignSandbox.tsx demo/components/DesignSandbox.tsx`
  (imports of `@/styles/index.css` and `@/assets/icons/*` keep resolving
  via the demo config's `@/*` alias; verified the alias maps into `src/`).
- `demo/demo.tsx:6`: import `DesignSandbox` from
  `./components/DesignSandbox` instead of `@/`; the route at :23 is
  unchanged.
- `src/index.ts`: delete the two imports (:9, :11) and the two export
  entries (:85, :91).
- `README.md`: delete the `InklingCardWrapper` (:66) and `DesignSandbox`
  (:68) bullets from the Components list.
- `InklingCardWrapper`'s deep-import consumers (`src/nodes/decorate-card.tsx:4`,
  `test/unit/components/InklingCardWrapper.test.tsx:6`) are untouched.
- Run `pnpm typecheck`, `pnpm lint`, `pnpm test:unit` (1707 + 21), and
  `pnpm build:demo` — the build must succeed; optionally confirm the
  designsandbox route renders via `pnpm dev` manually (executor detail,
  not a gate).

### Step 5: Drop the `never[]` casts, dead props, and redundant redeclarations

- Delete `as never[]` at `InklingComposableEditor.tsx:156` and
  `FloatingToolbarPlugin.tsx:146`. Every declaration on the path is already
  `hiddenFormats?: string[]` — this is a pure cast deletion; do not touch
  any type.
- Delete `readOnly?: boolean` and `style?: React.CSSProperties` from
  `InklingNestedEditorProps` (`InklingNestedEditor.tsx:41-42`). The
  interface is not exported and no call site passes either prop.
- `InklingEditor.tsx:13-15`: collapse the redundant `onChange`
  redeclaration — `export type InklingEditorProps = InklingComposableEditorProps`
  or an empty-extension-free equivalent that keeps the exported name
  (barrel exports `InklingEditorProps` at `src/index.ts:69`; the name must
  survive).
- `EmailEditor.tsx:56-62`: drop `, 'onChange'` from the
  `Omit<InklingComposableEditorProps, ...>` and delete the identical
  redeclared `onChange` (:61) — the resulting props type is unchanged.
- Run `pnpm typecheck`, `pnpm lint`, `pnpm test:unit`.

### Step 6: Fold the forwarder contexts and document the composition rule

- Replace `src/context/SharedHistoryContext.tsx` and
  `src/context/SharedOnChangeContext.tsx` with one module (illustrative:
  `src/context/SharedEditorStateContext.tsx`) exporting one provider
  (holds `historyState` + `onChange`) and one hook.
- `InklingEditor.tsx:19-26` and `EmailEditor.tsx:99-122`: replace the
  two-level verbatim nesting with the single provider, `onChange` passed
  through.
- `InklingComposableEditor.tsx:77,86`: consume the single hook.
- The module header must document the rule that is currently convention:
  the provider wraps the **top-level** editor tree exactly once (it lives
  in `InklingEditor`/`EmailEditor`, never inside `InklingComposableEditor`,
  which also renders inside nested card composers and must not re-provide);
  every `InklingComposableEditor` instance — top-level or nested — mounts
  `HistoryPlugin` with the same `externalHistoryState`, so nested card
  edits join the top-level undo stack (skipped when collab is active,
  :145); and `_onChange` (:86-106) routes the shared callback through
  `(parentEditor || editor).getEditorState()` so a nested editor's change
  serializes the full top-level document, while a per-instance `onChange`
  prop receives only that instance's state.
- No test imports either context (verified) — no test changes. Run
  `pnpm typecheck`, `pnpm lint`, `pnpm test:unit`.

### Step 7: Bump to 2.0.0, pin the new surface, run every gate

- `package.json`: `"version": "2.0.0"`.
- `test/typecheck/public-editor-api.tsx`: positive cases — import
  `CardConfig`, the slices, `FileUploader`, `FileUploaderInput`,
  `SearchResult`, `ListOptionItem` from `@/index`; a full closed
  `CardConfig` literal accepted on `InklingComposer`; a snippet-item
  typed array accepted. Negative cases — `@ts-expect-error` on an unknown
  cardConfig key (e.g. `cardConfig={{ membersEnabled: true }}`), and
  `@ts-expect-error` on `import { DesignSandbox } from '@/index'` /
  `import { InklingCardWrapper } from '@/index'` (TS2305 proves removal;
  `void` the bindings).
- `test/typecheck-consumer/consumer.tsx`: the same positive imports and
  closed-literal/unknown-key cases against `@inkling/editor` (this fixture
  is type-checked against the packed tarball by `verify:types`), plus the
  two removed-export negative cases.
- `scripts/verify-packed-package.mjs`: extend `EXPORT_ASSERTIONS` with
  negative assertions (`if (mod.DesignSandbox) throw ...`,
  `if (mod.InklingCardWrapper) throw ...`) so the removal is pinned at the
  packed level.
- Run, in order: `pnpm format`, `pnpm format:check`, `pnpm typecheck`,
  `pnpm lint`, `pnpm test:unit` (1707 + 21 todo), `pnpm build:demo`,
  `pnpm verify:package`, `pnpm verify:types`. Record the results in the
  commit message.

## Test plan

| Scenario                       | Command                                              | Required invariant                                  |
| ------------------------------ | ---------------------------------------------------- | --------------------------------------------------- |
| After every commit             | `pnpm typecheck`                                     | clean (demo included via root tsconfig)             |
| Unit suite                     | `pnpm test:unit`                                     | 1707 passed + 21 todo; zero expectation edits       |
| Renderer subset (untouched)    | `pnpm vitest run test/nodes-base test/html-renderer` | 730 passed + 21 todo                                |
| Demo drift detector (Step 3)   | `pnpm typecheck`                                     | dead keys in demo configs are compile errors        |
| Demo build (Step 4)            | `pnpm build:demo`                                    | builds; `/designsandbox` route intact               |
| Packed runtime (Step 7)        | `pnpm verify:package`                                | PASS; DesignSandbox/InklingCardWrapper absent       |
| Packed types (Step 7)          | `pnpm verify:types`                                  | PASS Bundler + NodeNext; closed type enforced       |
| EmailEditor merge (Steps 1, 7) | `pnpm vitest run test/unit/EmailEditor.test.ts`      | green unedited (spread-through + editorType output) |

## Acceptance criteria

- `CardConfig` is closed: no index signature, no dead keys, every live key
  on a named per-area slice; the composed type, slices, `FileUploader`,
  `FileUploaderInput`, `SearchResult`, and `ListOptionItem` are exported
  from the barrel and appear as exported declarations in
  `dist/editor.d.ts`.
- `EmailEditorProps.cardConfig` is the closed type;
  `getEmailEditorCardConfig` keeps legacy-bag input and returns an
  explicitly typed config; its test passes unedited.
- The demo imports host types from the barrel, carries no `as CardConfig`
  casts and no dead config keys; an unknown key in any demo config fails
  `pnpm typecheck`.
- `DesignSandbox` and `InklingCardWrapper` are absent from the barrel,
  the packed exports, and `README.md`; the `/designsandbox` demo route
  still builds and renders from `demo/components/DesignSandbox.tsx`.
- Both `hiddenFormats as never[]` casts, `InklingNestedEditor`'s
  `readOnly`/`style`, and the redundant `onChange` redeclarations are
  gone; no type on the `hiddenFormats` path was changed.
- One shared-editor-state context module replaces the two forwarders; its
  header documents the once-per-top-level-editor provision rule, the
  shared undo stack, and the nested→top-level `onChange` serialization.
- `package.json` is `2.0.0`; fixtures pin the new surface including
  negative cases; `pnpm verify:package`, `pnpm verify:types`,
  `pnpm typecheck`, `pnpm lint`, `pnpm format:check`, `pnpm test:unit`
  (1707 + 21 todo) all green.
- `CONTEXT.md` gained the host-config glossary entry.

## STOP conditions

- **Plan 047 has not landed** (no DONE row for 047 in `plans/README.md`,
  or `interface CardConfig` still sits in an un-re-split
  `src/context/InklingComposerContext.tsx` and 047's expected layout is
  absent). Do not execute against the pre-047 layout — landing this first
  forces 047 to re-do the split on a moved target. Stop and report.
- **Any existing unit test fails or needs an expectation edit.** This is a
  type-surface refactor; runtime must not move. Revert the offending
  commit and reassess — never update test expectations to make a commit
  pass. (Standing red line.)
- **Closing the type exposes a live reader of a key missing from the
  census** (a src module or genuinely-used demo path reads a key listed
  as dead, or one not declared). If the key is genuinely live, add it to
  the right slice and record the correction in the commit message; if the
  read chain is dead, delete the chain. Do NOT re-add the index signature
  to make it compile.
- **`getEmailEditorCardConfig`'s test goes red** under the typed return
  annotation. Keep the return type structural enough that the
  `editorType` output remains; do not edit
  `test/unit/EmailEditor.test.ts`.
- **The `DesignSandbox` move breaks the demo build** in a way that needs
  vite config changes (alias, css). The move is specified as a plain file
  move with existing aliases; STOP and report rather than redesigning the
  demo build.
- **`pnpm verify:package` or `pnpm verify:types` fails** after the barrel
  changes. The published surface regressed; revert the responsible commit
  — do not shim the barrel or loosen the fixtures to pass.
- **Coverage thresholds trip** (they should improve as `DesignSandbox`
  leaves `src/`). Investigate which removed lines were coverage-bearing;
  do not lower thresholds to pass — report the numbers.

## Rollback plan

Each step is its own commit on `main`; revert the offending commit alone
(`git revert <sha>`) — steps are ordered so later commits depend on
earlier ones, so revert in reverse when unwinding multiple. Steps 1–3 are
type-level and revert cleanly to the open surface; Step 4's file move
reverts with the same `git revert` (git tracks it as a rename). If Steps
1–6 need rework after Step 7 landed, revert the version bump first, rework,
then re-land the bump and fixtures together — 2.0.0 must not describe a
surface that was subsequently reshaped. Nothing is pushed at any point, so
every rollback is local history surgery, not a public recall.
