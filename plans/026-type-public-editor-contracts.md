# Plan 026: Make exported editor props honest and remove composer-level `any`

> **Executor instructions**: Follow every step and verification gate. Stop and
> report on a listed STOP condition rather than widening a type to `any`.
>
> **Drift check (run first)**:
> `git diff --stat 316dd61..HEAD -- src/components/InklingComposer.tsx src/components/InklingNestedComposer.tsx src/components/InklingComposableEditor.tsx src/components/InklingEditor.tsx src/components/EmailEditor.tsx src/components/InklingNestedEditor.tsx src/context/InklingComposerContext.tsx src/context/SharedOnChangeContext.tsx src/plugins/ExternalControlPlugin.tsx src/index.ts test/unit/components test/typecheck`

## Status

- **Priority**: P1
- **Effort**: M
- **Risk**: MED — these are exported React props and collaboration boundaries; preserve accepted runtime inputs
- **Depends on**: none (coordinate with plan 025 if both touch `src/index.ts`)
- **Category**: tech-debt
- **Planned at**: commit `316dd61`, 2026-07-14

## Why this matters

The five exported editor components are where TypeScript consumers need the
best guidance, but they currently expose `unknown`, open record props, and
multiple `as any` casts. Some casts hide real contract drift: multiplayer gets
the unnormalized object form of `initialEditorState`, Toggle/nested editors use
Lexical types more precise than the wrappers declare, and the same `onError`
callback is passed to two APIs with different second arguments. Tightening this
surface before declaration publishing gives consumers useful types without
adopting Koenig's weaker `strict: false` patterns.

## Current state

- `InklingComposerProps.initialEditorState` accepts string/object/null, then
  normalizes the non-collaboration path to a JSON string. The collaboration
  path passes the original value through `as any` at lines 176-179.
- `InklingComposer.tsx:96-104` mutates the caller's `fileUploader` object to
  install a fallback hook, using `as any`.
- `InklingComposer.tsx:145-179` casts the provider factory and entire Lexical
  initial config to `any`.
- Installed Lexical 0.46 exposes the required source types:
  `InitialConfigType`/`InitialEditorStateType` in
  `@lexical/react/LexicalComposer`, `LexicalNestedComposerProps` in
  `@lexical/react/LexicalNestedComposer`, `Transformer` in
  `@lexical/markdown`, and `SerializedEditorState`/`EditorState` in `lexical`.
- `InklingNestedComposerProps` uses three `any`s for initial state, nodes, and
  theme even though it forwards directly to `LexicalNestedComposer`.
- `InklingComposableEditorProps.markdownTransformers` is `unknown[]` then cast
  to `any`; `registerAPI` is only `object | null` although
  `ExternalControlPlugin.tsx:9-19` defines the full API.
- `InklingEditorProps` and `EmailEditorProps` use `[key: string]: unknown` and
  spread those values into `InklingComposableEditor`, defeating prop checking.
- The public `onError` is documented as React-style
  `(error, info?: React.ErrorInfo)`, but `LexicalComposer` calls its `onError`
  with `(Error, LexicalEditor)`. Preserve the existing public React-error
  callback by adapting the Lexical handler to call `onError(error)` rather than
  forwarding an incompatible second argument.

## Commands you will need

| Purpose        | Command                                                                                                                                                                     | Expected on success |
| -------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------- |
| Typecheck      | `pnpm typecheck`                                                                                                                                                            | exit 0              |
| Composer tests | `pnpm test:unit -- test/unit/components/InklingComposer.test.tsx test/unit/components/InklingNestedComposer.test.tsx test/unit/components/InklingComposableEditor.test.tsx` | all pass            |
| Full tests     | `pnpm test:unit`                                                                                                                                                            | all pass            |
| Lint/format    | `pnpm lint && pnpm format:check`                                                                                                                                            | both exit 0         |

## Scope

**In scope**:

- The components, contexts, plugin, index, and typecheck fixtures named in the drift command
- Existing unit tests for those components

**Out of scope**:

- Changing the public component names or runtime JSX tree
- Replacing Yjs/y-websocket or changing the collaboration protocol
- Making Lexical a runtime peer dependency
- Declaration emission/package exports (plan 028)
- Repository-wide `unknown` removal; `unknown` is correct at genuinely untrusted boundaries

## Git workflow

- Branch: `advisor/026-type-public-editor-contracts`
- Commit: `refactor(types): define public editor contracts`
- Do not push or open a PR unless instructed.

## Steps

### Step 1: Export shared public types instead of open records

Define and export:

- `InklingInitialEditorState = InitialEditorStateType | SerializedEditorState`
  so the current serialized-object convenience remains accepted;
- `InklingComposerProps`, `InklingNestedComposerProps`,
  `InklingComposableEditorProps`, `InklingEditorProps`, and `EmailEditorProps`;
- `ExternalControlAPI` from `ExternalControlPlugin.tsx`.

Build wrapper props from real component props instead of index signatures:

```ts
export interface InklingEditorProps extends InklingComposableEditorProps {
  onChange?: (editorState: SerializedEditorState) => void
}
```

Use `Omit` where two components intentionally specialize a prop. Do not use
`[key: string]: unknown` to simulate prop forwarding. Export the named types
from `src/index.ts` with `export type` statements.

Use `LexicalNestedComposerProps['initialNodes']` and `['initialTheme']` for the
nested wrapper. Include Lexical's current `skipEditableListener?: true` prop if
the wrapper is intended to mirror `LexicalNestedComposer`; otherwise document
why it is intentionally not forwarded.

**Verify**: `pnpm typecheck` → exit 0.

### Step 2: Normalize initial editor state once for both modes

Extract a pure helper (local or under `src/utils/`) that:

- returns `null`, a Lexical `EditorState`, or initializer function unchanged;
- parses a JSON string only to detect and repair the existing empty-root case,
  then returns a string;
- clones a `SerializedEditorState` before adding the fallback paragraph so the
  caller's object is not mutated;
- returns the serialized object as a JSON string accepted by Lexical.

Use the resulting `InitialEditorStateType` for both
`InitialConfigType.editorState` and `CollaborationPlugin.initialEditorState`.
When collaboration is enabled, the composer config still receives `null`; the
plugin receives the normalized bootstrap state. Preserve malformed-JSON error
behavior unless an existing test specifies otherwise.

Add tests for string, serialized object, empty root, non-empty root, null, and
the multiplayer prop path. Assert the input object remains unchanged.

**Verify**: run the three targeted component test files → all pass.

### Step 3: Stop mutating `fileUploader` and type the fallback

Accept a compatibility-friendly input type such as
`Partial<FileUploader> & Record<string, unknown>`. Derive a new normalized
object with `useFileUpload` filled in; never assign to the prop object. Type the
fallback return as the exact `ReturnType<FileUploader['useFileUpload']>` and
retain the current diagnostic message and resolved `undefined` upload result.

Add a unit test that freezes the input uploader object, renders the composer,
and verifies no mutation/error occurs.

**Verify**: targeted `InklingComposer` tests → all pass.

### Step 4: Isolate the collaboration provider assertion

Derive the provider factory type from the installed component rather than
copying a private Lexical alias:

```ts
type LexicalProviderFactory = React.ComponentProps<typeof CollaborationPlugin>['providerFactory']
```

Type `createWebsocketProvider` as that factory. If `WebsocketProvider` is not
structurally assignable because its event overloads are narrower, keep exactly
one `as unknown as ReturnType<LexicalProviderFactory>` at the return boundary,
with a comment naming the methods verified (`awareness`, `connect`,
`disconnect`, `on`, `off`). Do not use `any` and do not cast at every consumer.
Keep the context's factory type synchronized by deriving or importing the same
alias.

Add a unit test that calls the factory through the context or a small exported
adapter and verifies the returned provider exposes those methods. Do not open a
real websocket.

**Verify**: `pnpm typecheck` and targeted composer tests → exit 0/all pass.

### Step 5: Type callbacks, transformers, and the external-control API

- Replace markdown `unknown[]`/`any` with `readonly Transformer[]` (copy to a
  mutable array only if Lexical's prop requires it).
- Type editor-state callbacks as `SerializedEditorState` after `.toJSON()`.
- Use `ExternalControlAPI | null` for `registerAPI` throughout.
- Keep the public React error callback shape. Create a Lexical-specific
  `(error: Error) => onError(error)` adapter for `InitialConfigType.onError`;
  retain the original callback in context for `react-error-boundary`.
- Type `initialConfig` with `satisfies InitialConfigType` and remove the whole
  object cast.

Update demo callback annotations only if typecheck proves they are consumers
of these exported types; do not refactor demo behavior.

**Verify**:

```bash
rg -n 'as any|ReadonlyArray<any>|: any|no-explicit-any' \
  src/components/InklingComposer.tsx \
  src/components/InklingNestedComposer.tsx \
  src/components/InklingComposableEditor.tsx \
  src/components/InklingEditor.tsx \
  src/components/EmailEditor.tsx
```

Expected: no matches. Run `pnpm typecheck` → exit 0.

### Step 6: Add a public consumer compile fixture

Create `test/typecheck/public-editor-api.tsx` importing only from
`@/index` (simulating root exports). Cover valid props for all five exported
editors, typed `registerAPI`, typed markdown transformers, serialized object
initial state, and a partial uploader. Add `@ts-expect-error` cases for an
invalid node list, invalid transformer, and wrong callback payload.

**Verify**: `pnpm typecheck` → exit 0 and every `@ts-expect-error` is consumed.

### Step 7: Run full gates

Run `pnpm format` because imports and exported type blocks will move.

**Verify**: `pnpm format:check`, `pnpm typecheck`, `pnpm lint`, and
`pnpm test:unit` all exit 0.

## Test plan

- Normalization tests prove both collaboration and non-collaboration paths
  accept the same documented initial-state inputs.
- Frozen-uploader test proves prop objects are no longer mutated.
- Provider test proves the one external assertion matches runtime methods.
- Compile-only fixture proves a consumer sees precise public props and catches
  invalid values.

## Done criteria

- [ ] The five exported editor prop interfaces and `ExternalControlAPI` are named and exported.
- [ ] Composer files contain no explicit `any` or `as any`.
- [ ] Both editor modes use the same normalized initial bootstrap state.
- [ ] `fileUploader` input is not mutated.
- [ ] There is at most one documented `unknown` assertion at the y-websocket/Lexical provider boundary.
- [ ] Public callbacks, markdown transformers, nodes, themes, and control API are precisely typed.
- [ ] All required gates pass and `plans/README.md` is updated.

## STOP conditions

- Existing tests or downstream fixtures demonstrate that callers depend on an
  undocumented arbitrary prop being forwarded by an index signature.
- The provider lacks a method Lexical actually calls at runtime; report the
  missing method instead of asserting through it.
- State normalization would change non-empty serialized JSON or collaboration
  bootstrap semantics.
- A public input must be narrowed rather than widened/clarified to remove a
  cast; report the compatibility conflict.
- A verification step fails twice.

## Maintenance notes

- Keep public prop types exported from the root barrel once declaration files
  ship. They are part of semver review after plan 028.
- External libraries may require one narrow adapter; repeated downstream casts
  are a signal that the adapter contract has drifted.

## Rollback plan

Revert public prop exports, composer adapters, and their compile fixtures as a
unit so implementation and root types cannot diverge. Preserve any independent
non-mutation regression test if it exposes a real runtime bug. Do not restore a
whole-config `as any` merely to keep part of the new public interface.
