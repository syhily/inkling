# Plan 025: Type every wrapper-node dataset and insert-command payload without weakening compatibility

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the status row for this plan in
> `plans/README.md` unless a reviewer told you they maintain the index.
>
> **Drift check (run first)**:
> `git diff --stat 316dd61..HEAD -- src/nodes src/plugins test/unit/nodes test/unit/plugins test/typecheck`
> If an in-scope file changed, compare the current code with the evidence below.
> Stop if a constructor, transient field, or command payload has changed shape.

## Status

- **Priority**: P1
- **Effort**: L
- **Risk**: MED — compile-time contracts touch every card insertion path, but serialized node shapes and runtime behavior must remain unchanged
- **Depends on**: none
- **Category**: tech-debt
- **Planned at**: commit `316dd61`, 2026-07-14

## Why this matters

Inkling is `strict: true`, but nine wrapper nodes still accept
`Record<string, any>` and most insert commands are untyped `createCommand()`
instances. That means the strongest part of Inkling's JS→TS migration stops at
the exact boundary where menus, uploads, plugins, serialized card data, and
nested editors meet. Koenig contains useful dataset shapes, but its broad
`any`s must not be copied; this batch derives types from Inkling's generated
base-node data types and adds only the transient UI fields that Inkling needs.

This is intentionally first in the new execution sequence. Plan 028 publishes
declaration files, and should not freeze the current `any`-heavy constructors
as the npm package's public type contract.

## Current state

- `src/nodes/base/generate-decorator-node.ts:81-92` already derives exact
  `DecoratorNodeValueMap` and partial `DecoratorNodeData` types from each
  property definition. The base nodes export `AudioData`, `BookmarkData`,
  `CalloutData`, `CodeBlockData`, `FileData`, `GalleryData`, `HeaderData`,
  `HtmlData`, `ImageData`, `ButtonData`, `ToggleData`, and `VideoData` through
  `src/nodes/base/index.ts`.
- These wrapper files still use `Record<string, any>` in constructors and
  factories: `AudioNode.tsx`, `BookmarkNode.tsx`, `CalloutNode.tsx`,
  `CodeBlockNode.tsx`, `FileNode.tsx`, `GalleryNode.tsx`, `HeaderNode.tsx`,
  `HtmlNode.tsx`, and `VideoNode.tsx`.
- `src/nodes/ImageNode.tsx:19-30`, `ButtonNode.tsx:10-12`, and
  `ToggleNode.tsx:16-22` use hand-written open records instead of intersecting
  their corresponding base data types.
- Most commands are inferred as `LexicalCommand<unknown>` because they call
  `createCommand()` without a type argument. `INSERT_HORIZONTAL_RULE_COMMAND`
  is the only payload-less case and should be `createCommand<void>()`.
- The plugin handlers compensate with nine copies of:

  ```ts
  function isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null
  }
  ```

  This checks only “object”, not the payload expected by the receiving node.

- `src/nodes/ToggleNode.tsx:81-118` uses a double `any` cast for `exportJSON`
  and another `any` spread into `ToggleNodeComponent`; the component and
  `ToggleCard` incorrectly type nested initial states as `string`, while
  `populateNestedEditor()` stores an `EditorState` at
  `src/utils/nested-editors.ts:61-71`.
- `src/nodes/HtmlNode.tsx:39-40`, `CalloutNode.tsx:76-85`, and
  `VideoNodeComponent.tsx:274-304` use `as any` to hide ordinary prop-interface
  mismatches. Fix the interfaces/props; do not replace these with `unknown` or
  `never` casts.
- Existing type-positive exemplars are `ImageNodeDataset` and typed commands
  such as `INSERT_MEDIA_COMMAND: LexicalCommand<{type: string | undefined;
file: File}>` in `src/plugins/DragDropPastePlugin.tsx:21`.

Compatibility constraints:

- Do not rename node types, JSON fields, commands, exported factories, or card
  menu entries.
- Dataset fields remain optional wherever their base `*Data` type is optional.
- Transient fields such as `initialFile`, nested editor objects,
  `triggerFileDialog`, selector components, and `_openInEditMode` must never be
  added to serialized JSON.
- Runtime guards for truly external/untrusted values may use `unknown` plus a
  narrow type guard. Do not use `any` as the guard result.

## Commands you will need

| Purpose               | Command                               | Expected on success                          |
| --------------------- | ------------------------------------- | -------------------------------------------- |
| Typecheck             | `pnpm typecheck`                      | exit 0, including `test/typecheck/` fixtures |
| Targeted node tests   | `pnpm test:unit -- test/unit/nodes`   | all node tests pass                          |
| Targeted plugin tests | `pnpm test:unit -- test/unit/plugins` | all plugin tests pass                        |
| Full unit suite       | `pnpm test:unit`                      | all tests pass                               |
| Lint                  | `pnpm lint`                           | exit 0, no warnings                          |
| Format                | `pnpm format && pnpm format:check`    | formatter succeeds, then check exits 0       |

## Scope

**In scope**:

- `src/nodes/*Node.tsx` wrapper files
- Immediate prop types that currently force wrapper `as any` casts:
  `src/nodes/CalloutNodeComponent.tsx`, `HtmlNodeComponent.tsx`,
  `ToggleNodeComponent.tsx`, `VideoNodeComponent.tsx`, and
  `src/components/ui/cards/ToggleCard.tsx`, `VideoCard.tsx`
- Card insertion handlers in `src/plugins/{Audio,Bookmark,Button,Callout,File,Gallery,Header,HorizontalRule,Html,Image,Toggle,Video}Plugin.tsx`
- `src/plugins/SlashCardMenuPlugin.tsx` only if its existing heterogeneous
  dispatch cast can be made generic without changing behavior
- Existing related unit tests and new `test/typecheck/card-node-payloads.ts`

**Out of scope**:

- Base property definitions or serialized field names under
  `src/nodes/base/nodes/`
- Runtime schema validation of imported JSON; this plan is compile-time
  hardening, not a parser migration
- Removing all `any` from the entire repository
- Product-cut cards, Unsplash, or a Koenig-style monorepo split
- Public declaration generation; plan 028 owns that

## Git workflow

- Branch: `advisor/025-type-card-node-boundaries`
- Commit 1: `refactor(types): type wrapper node datasets`
- Commit 2: `refactor(types): type card insertion commands`
- Do not push or open a PR unless instructed.

## Steps

### Step 1: Define exact wrapper datasets from base data types

For each wrapper, export a named dataset type that intersects its base data
type with only its transient client-side fields. Use the following shape as the
pattern (names can vary only to match existing conventions):

```ts
export type AudioNodeDataset = AudioData & {
  initialFile?: File
  triggerFileDialog?: boolean
}
```

Use these required mappings:

| Wrapper   | Base type       | Additional transient fields                                                                                                         |
| --------- | --------------- | ----------------------------------------------------------------------------------------------------------------------------------- |
| Audio     | `AudioData`     | `initialFile?: File`, `triggerFileDialog?: boolean`                                                                                 |
| Bookmark  | `BookmarkData`  | `captionEditor?: LexicalEditor`, `captionEditorInitialState?: EditorState`, `metadata?: unknown` only if a current caller passes it |
| Button    | `ButtonData`    | none                                                                                                                                |
| Callout   | `CalloutData`   | `calloutTextEditor?: LexicalEditor`, `calloutTextEditorInitialState?: EditorState`                                                  |
| CodeBlock | `CodeBlockData` | `captionEditor?: LexicalEditor`, `captionEditorInitialState?: EditorState`, `_openInEditMode?: boolean`                             |
| File      | `FileData`      | `initialFile?: File`, `triggerFileDialog?: boolean`                                                                                 |
| Gallery   | `GalleryData`   | `captionEditor?: LexicalEditor`, `captionEditorInitialState?: EditorState`                                                          |
| Header    | `HeaderData`    | header/subheader editor instances and their `EditorState`s                                                                          |
| HTML      | `HtmlData`      | none                                                                                                                                |
| Image     | `ImageData`     | retain the current preview, selector, hidden, file, and caption-editor fields                                                       |
| Toggle    | `ToggleData`    | title/content editor instances and their `EditorState`s                                                                             |
| Video     | `VideoData`     | `initialFile?: File`, `triggerFileDialog?: boolean`, caption editor fields                                                          |

If two or more wrappers need the exact same caption fields, a small exported
`CaptionEditorDataset` type in `src/types/card-node-datasets.ts` is acceptable.
Do not create a generic abstraction for fields that occur only once.

Change each constructor and `$create*Node` factory to accept its named dataset
type. Preserve optional/default parameters. Fix field declarations exposed by
the stronger types; for example Audio/File currently assign `null` to a field
declared `File | undefined`, while their components accept `File | undefined`.
Normalize those paths to `undefined`; Video may keep `null` because
`VideoNodeComponent` explicitly accepts `File | null`.

**Verify**: `pnpm typecheck` → exit 0 before proceeding. If the only way to
make a base constructor accept the intersection appears to be `as any`, stop.

### Step 2: Remove wrapper-to-component `any` spreads

Pass component props explicitly. Update the receiving prop interface when the
runtime value is already correct and the interface is wrong.

Required corrections:

- `ToggleNodeComponent` and `ToggleCard` nested initial states are
  `EditorState | undefined`, not `string | undefined`.
- Define a serialized toggle result type as the base serialized node plus
  `heading` and `content`; return that from `exportJSON()` without an `any`
  sandwich.
- `HtmlNode` should call `<HtmlNodeComponent html={this.html}
nodeKey={this.getKey()} />` (or the exact generated property name) directly.
- `CalloutNode` should pass its four existing props directly after aligning the
  component prop interface.
- Align `VideoCardProps` with the actual values assembled by
  `VideoNodeComponent`; retain all existing callbacks and error arrays.
- Remove the orphan `no-explicit-any` comments at
  `GalleryNodeComponent.tsx:203-207` if no `any` remains there.

Do not change JSX structure, class names, edit-mode behavior, or serialization.

**Verify**:

```bash
rg -n 'Record<string, any>|as any|no-explicit-any' src/nodes/*Node.tsx
```

Expected: no matches in wrapper node files. Then run `pnpm typecheck` → exit 0.

### Step 3: Give every insert command the exact payload type

Use `createCommand<DatasetType>('OPTIONAL_DEBUG_NAME')` for card commands and
`createCommand<void>()` for the horizontal-rule command. Preserve existing
command constants and debug-name strings. Do not add a required field merely
because one insertion path usually supplies it.

Update each plugin registration so its callback receives the typed dataset.
Delete duplicated `isRecord` helpers where the command type now guarantees the
payload. Keep runtime guards only where data crosses an untyped external
boundary (for example a parsed snippet or generic menu descriptor), and make
those guards return the named dataset type after checking the fields they use.

The generic slash menu dispatches heterogeneous commands. Prefer a generic
helper such as `dispatchInsertCommand<T>(command: LexicalCommand<T>, payload:
T)` if it removes the cast honestly. If the card-menu data model cannot express
the command/payload relationship without a repository-wide redesign, keep the
single `LexicalCommand<unknown>` cast in `SlashCardMenuPlugin` and document it as
the deliberate boundary; do not spread casts back into each node/plugin.

**Verify**:

```bash
rg -n 'INSERT_[A-Z_]+_COMMAND = createCommand\(\)' src/nodes src/plugins
```

Expected: no card insert commands with an untyped empty call. Run
`pnpm typecheck` → exit 0.

### Step 4: Add compile-time contract fixtures and runtime regressions

Create `test/typecheck/card-node-payloads.ts`. It is included by the root
`tsconfig.json` (unlike `test/unit`, which is excluded). Include:

- one valid payload for a file-upload card (`initialFile`), one nested-editor
  card, one plain data card, and the void horizontal-rule command;
- `satisfies` checks for the corresponding exported dataset types;
- `@ts-expect-error` cases for a wrong primitive field, wrong editor field,
  and payload passed to the void command;
- no runtime assertions and no imports from `@/index` inside node wrappers.

Extend the existing node/plugin unit tests only where Step 2 or Step 3 changes
code that lacks a runtime assertion. At minimum, retain tests for nested editor
serialization and drag/drop `initialFile` dispatch.

**Verify**: `pnpm typecheck`, then
`pnpm test:unit -- test/unit/nodes test/unit/plugins` → all pass.

### Step 5: Run full gates and commit in two reviewable batches

Run formatting because imports and type-only imports will change. Keep the
dataset/prop work and command/plugin work in separate commits as listed above.

**Verify**:

```bash
pnpm format
pnpm format:check
pnpm typecheck
pnpm lint
pnpm test:unit
git status --short
```

Expected: every command exits 0; only in-scope files plus
`plans/README.md` are modified.

## Test plan

- Compile-time fixtures reject incorrect card payloads and accept current
  menu/upload/nested-editor inputs.
- Existing wrapper-node tests prove exported JSON remains byte/shape
  compatible.
- Existing plugin tests prove typed commands still insert the same card and
  preserve `openInEditMode` behavior.
- Existing component tests prove replacing prop spreads did not alter UI.

## Done criteria

- [ ] No wrapper node constructor or factory contains `Record<string, any>`.
- [ ] No wrapper JSX uses `as any` to satisfy component props.
- [ ] Every card insertion command has an explicit payload type; the HR command is `void`.
- [ ] Transient editor/file/UI fields are absent from serialized JSON exactly as before.
- [ ] `test/typecheck/card-node-payloads.ts` contains positive and negative compile-time cases.
- [ ] `pnpm format:check`, `pnpm typecheck`, `pnpm lint`, and `pnpm test:unit` all exit 0.
- [ ] No product-cut node/card is reintroduced.
- [ ] `plans/README.md` is updated.

## STOP conditions

- A base `*Data` type is missing or contradicts the currently serialized data.
- A caller intentionally passes a field not represented in the mapping above;
  report the caller and field instead of adding `[key: string]: any`.
- Fixing a prop mismatch would require changing runtime values rather than
  correcting a stale interface.
- A command is used with two incompatible payload shapes that cannot be
  represented as an optional-field object or a discriminated union.
- Serialized snapshots change for reasons other than deterministic formatting.
- Any verification command fails twice after a reasonable fix.

## Maintenance notes

- New wrapper-only transient fields belong in the wrapper dataset, not the base
  serialized data type.
- Keep unknown/untrusted parsing at explicit adapters. A typed Lexical command
  is an internal contract, not a runtime schema validator.
- Reviewers should reject future `createCommand()` calls without `<Payload>` or
  `<void>` and new wrapper constructors that reopen to `Record<string, any>`.

## Rollback plan

Revert dataset/interface changes and command typing together by commit. Never
leave a command typed more narrowly than the payloads its plugin still sends.
Serialization must not need a data migration because this plan changes only
compile-time/transient contracts; if serialized snapshots changed, restore the
last compatible wrapper implementation and investigate before retrying.
