# Plan 031: Put every unavoidable Lexical private-field dependency behind one tested adapter

> **Executor instructions**: This plan reduces upgrade blast radius; it cannot
> eliminate the few capabilities for which Lexical 0.46 has no public API.
> Rewire behavior without changing nested-editor routing. Use public APIs where
> available, and keep all remaining underscore-field reads in
> `src/utils/lexical-internals.ts` only.
>
> **Drift check (run first)**:
> `git diff --stat 316dd61..HEAD -- src/utils/lexical-internals.ts src/types/lexical-internals.ts src/components/InklingCaptionEditor.tsx src/components/InklingComposableEditor.tsx src/components/ui/FormatToolbar.tsx src/plugins/DragDropReorderPlugin.tsx src/plugins/InklingNestedEditorPlugin.tsx src/plugins/TKPlugin.tsx src/plugins/WordCountPlugin.tsx src/plugins/behaviour/keyboard-navigation test/unit`

## Status

- **Priority**: P2
- **Effort**: M
- **Risk**: MED — parent-editor routing controls keyboard navigation, nested state, word counts, and focus
- **Depends on**: none
- **Category**: maintainability / upgrade-safety
- **Planned at**: commit `316dd61`, 2026-07-14 against Lexical 0.46

## Why this matters

Inkling has already created `src/utils/lexical-internals.ts` to isolate two
private Lexical reads, but parent editor, theme config, and editability still
leak through components and plugins. A Lexical upgrade therefore requires a
repository-wide search and makes behavior differences easy to miss. Several
call sites use non-null assertions even though the parent relationship is
nullable, and the WordCount test manually mutates `_parentEditor` rather than
constructing the relationship through Lexical's supported editor factory.

Koenig also relies on Lexical internals in places; that is not an advantage to
copy. Inkling's stricter boundary can make the dependency explicit and
testable while preserving all nested-editor behavior.

## Current-state evidence

- `src/utils/lexical-internals.ts` currently contains typed accessors for
  `_nodes` and `_updating` only.
- Direct `_parentEditor` reads occur in:
  `InklingCaptionEditor`, `InklingComposableEditor`, `FormatToolbar`,
  `InklingNestedEditorPlugin`, `WordCountPlugin`, and keyboard-navigation
  escape handling.
- `WordCountPlugin` repeats a loop over `_parentEditor` to find the top-level
  editor and checks nested/top-level state in several branches.
- `TKPlugin.tsx:37-38` reads `_config.theme` through an internal cast.
- `DragDropReorderPlugin.tsx:348` passes `_editable` into
  `useDragDropReorder`, but the parameter is explicitly unused and discarded.
  This private read can be removed, not wrapped.
- Lexical 0.46 source declares `_parentEditor`, `_config`, and `_editable`, but
  their underscore naming and internal use do not constitute a stable public
  compatibility promise.
- Lexical exposes public `editor.isEditable()`, but no public parent-editor,
  complete registered-node-map, update-in-progress, or editor-theme accessor
  was identified in the installed version.
- `EditorThemeClasses` is exported publicly by `lexical`, allowing the adapter
  to return a stable public result type even if it reads a private config.
- Existing nested-editor tests already cover TK, replacement strings, word
  counts, node datasets, and keyboard behavior. One WordCount test assigns
  `_parentEditor` manually and should use `createEditor({parentEditor})`.

## Boundary design

The utility module should expose only semantic functions:

```ts
getParentEditor(editor): LexicalEditor | null
isNestedEditor(editor): boolean
getTopLevelEditor(editor): LexicalEditor
getEditorTheme(editor): EditorThemeClasses
getRegisteredNodeMap(editor): Map<...>
isEditorUpdating(editor): boolean
```

Do not export a broad `InklingEditorInternals` object for consumers to cast and
read arbitrarily. Keep one minimal internal structural type private to the
adapter module (or in the types file if lint architecture requires it), with a
comment recording the verified Lexical version and why no public method is
available.

## Scope

**In scope**:

- All current direct Lexical editor fields matching `_parentEditor`,
  `_config`, `_editable`, `_nodes`, and `_updating`
- Semantic adapter tests
- Nested editor tests affected by the rewire
- Removal/narrowing of `InklingEditorInternals`

**Out of scope**:

- Eliminating card-node internal fields such as `__openInEditMode`
- Replacing Lexical or upgrading its version
- Exposing parent/theme helpers from the npm public barrel
- Rewriting word-count algorithms or keyboard behavior
- Reading arbitrary new private fields “for convenience”

## Commands you will need

| Purpose            | Command                                                                                                                                                                                                                                  | Expected on success |
| ------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------- | -------- | ----- | --------------------------------------- | --------------------------------------------- |
| Private-read audit | `rg -n "\\.\_(parentEditor                                                                                                                                                                                                               | config              | editable | nodes | updating)\\b" src --glob '\*.{ts,tsx}'` | matches only `src/utils/lexical-internals.ts` |
| Focused tests      | `pnpm test:unit -- test/unit/utils/lexical-internals.test.ts test/unit/plugins/WordCountPlugin.test.tsx test/unit/plugins/TKPlugin.test.tsx test/unit/plugins/TKPlugin.nested.test.tsx test/unit/plugins/behaviour test/unit/components` | all pass            |
| Type/lint          | `pnpm typecheck && pnpm lint`                                                                                                                                                                                                            | both exit 0         |
| Full units         | `pnpm test:unit`                                                                                                                                                                                                                         | all pass            |
| Format             | `pnpm format && pnpm format:check`                                                                                                                                                                                                       | exits 0             |

## Git workflow

- Branch: `advisor/031-centralize-lexical-internals`
- Commit 1: `test(lexical): characterize editor hierarchy adapters`
- Commit 2: `refactor(lexical): centralize private editor access`
- Commit 3: `test(lexical): exercise nested routing through real parents`
- Do not push or open a PR unless instructed.

## Steps

### Step 1: Add adapter characterization tests

Create `test/unit/utils/lexical-internals.test.ts`. Build editors with Lexical's
real `createEditor` API:

- a top-level editor;
- a child with `{parentEditor: topLevel}`;
- a grandchild with `{parentEditor: child}`;
- a configured theme containing `tk` and `tkHighlighted` classes.

Assert:

- parent of root is `null`;
- child and grandchild return their immediate parents;
- `isNestedEditor` is false/true appropriately;
- `getTopLevelEditor` returns the root from all three levels;
- the theme result exposes configured classes and returns the current empty
  theme for an editor without entries;
- existing registered-node-map and update-state helpers retain behavior.

Do not fake parent linkage by assigning `_parentEditor`. Tests should fail to
compile if a future Lexical factory removes the supported `parentEditor`
option, which is useful upgrade evidence.

Add a defensive cycle test only if the helper contains cycle detection and it
can be built without mutating private state. Otherwise document that Lexical's
factory owns acyclicity; do not add production complexity for an impossible
public input.

### Step 2: Expand and narrow the adapter implementation

In `src/utils/lexical-internals.ts`:

1. Define the smallest internal structural type containing only the fields
   accessed in this file.
2. Add `getParentEditor`, `isNestedEditor`, `getTopLevelEditor`, and
   `getEditorTheme` with public return types.
3. Keep `getRegisteredNodeMap` and `isEditorUpdating` here.
4. Update the module comment to state it was verified against Lexical 0.46 and
   list which public alternatives were checked.
5. Keep casts local to individual accessors. Do not return the internal editor
   type or export a generic `getInternals()` escape hatch.

`getTopLevelEditor` should iteratively call `getParentEditor` so all knowledge
of the field lives in one function. If adding a safety guard, use a visited
`Set<LexicalEditor>` and throw a clear invariant error; do not silently return
an arbitrary editor on a cycle.

`getEditorTheme` returns `EditorThemeClasses`. Do not let callers access the
rest of `_config`.

If `src/types/lexical-internals.ts` is no longer needed for editor fields,
remove `InklingEditorInternals` or narrow the file to its separate `CardNode`
purpose. Preserve that card type unless another plan replaces it.

**Verify**: adapter tests and `pnpm typecheck` pass.

### Step 3: Rewire nested-editor routing call sites

Replace every direct parent read:

- `InklingComposableEditor`: derive `parentEditor`, `isNested`, and the primary
  state source through helpers. Avoid calling the helper repeatedly in one
  render when a local captures the invariant.
- `InklingCaptionEditor`: resolve the parent once per command handler. If the
  component contract says it must be nested, handle a missing parent safely
  (return `false`/fall through) and optionally report through the existing
  error path; remove non-null assertions.
- `FormatToolbar`: use `isNestedEditor` to hide snippets.
- `InklingNestedEditorPlugin`: use a nullable parent local for Enter and
  settings-panel flows. Preserve command priorities and update/read nesting.
- Escape keyboard navigation: use immediate parent for focus and parent-or-self
  for card selection exactly as the current code does.

Do not replace immediate-parent behavior with top-level behavior unless the
existing code already walks to top level. Nested editors may be more than one
level deep.

After each component group, run its focused tests so a routing regression is
localized.

### Step 4: Simplify WordCount through the hierarchy helper

Import `getTopLevelEditor`, `getParentEditor`, or `isNestedEditor` as needed.
Remove the local `_parentEditor` traversal and use the semantic helper in:

- registration of the root callback;
- nested full-recompute branch;
- cleanup of the root callback;
- every top-level state/cache lookup.

Update `test/unit/plugins/WordCountPlugin.test.tsx` to construct the nested
editor with `{parentEditor: topLevelEditor}` rather than assigning the private
field. Add/retain a grandchild test so top-level traversal is not accidentally
implemented as only one hop.

Assert callback counts and throttle cleanup remain identical. This plan must
not change word segmentation or cache invalidation.

### Step 5: Route theme access and delete the unused editable dependency

In `TKPlugin`, call `getEditorTheme(editor)` and derive the two class arrays
from that public result. Remove its editor-internals cast and lint suppression.
Retain empty-array behavior for missing theme keys.

In `DragDropReorderPlugin`, remove the unused `isEditable` parameter and the
`void isEditable` line, then call `useDragDropReorder(editor)`. Do not replace
it with `editor.isEditable()` when the value is not used. Confirm drag enable
and disable remain driven by `isEditingCard` as before.

If execution reveals editability should genuinely gate drag behavior, stop and
write a separate behavior plan with tests; do not smuggle that change into a
private-field cleanup.

### Step 6: Enforce the single-boundary invariant

Run:

```bash
rg -n "\\._(parentEditor|config|editable|nodes|updating)\\b" src --glob '*.{ts,tsx}'
rg -n "InklingEditorInternals" src test --glob '*.{ts,tsx}'
```

Expected:

- underscore editor-field matches exist only in
  `src/utils/lexical-internals.ts`;
- `InklingEditorInternals` has no matches if removed, or only the adapter uses
  the narrowed type;
- tests do not assign private editor fields.

Add this grep as a lightweight lint script only if the project already has an
architecture-check convention. Otherwise document it in the plan/upgrade
checklist; do not introduce a one-off shell dependency into cross-platform CI.

### Step 7: Run full gates

Run:

```bash
pnpm format
pnpm format:check
pnpm typecheck
pnpm lint
pnpm test:unit -- test/unit/utils/lexical-internals.test.ts test/unit/plugins/WordCountPlugin.test.tsx test/unit/plugins/TKPlugin.test.tsx test/unit/plugins/TKPlugin.nested.test.tsx test/unit/plugins/behaviour test/unit/components
pnpm test:unit
```

## Test plan

| Area                    | Required cases                                                  |
| ----------------------- | --------------------------------------------------------------- |
| Hierarchy adapter       | root, child, grandchild, immediate parent, top-level lookup     |
| Theme adapter           | configured TK classes and missing-class fallback                |
| Caption/nested commands | Enter/arrows/Escape route to the same immediate parent          |
| Word count              | root and nested updates, grandchild traversal, cleanup/throttle |
| Toolbar/TK              | nested snippet hiding and theme class behavior unchanged        |
| Drag plugin             | no behavior change after removing unused argument               |

## Acceptance criteria

- No source module outside the adapter reads the listed Lexical private
  editor fields.
- Parent and top-level helpers are tested with real Lexical-created nested
  editors.
- Call sites have no parent non-null assertions.
- TK styling and WordCount behavior remain unchanged.
- Drag-drop no longer reads `_editable` for an unused value.
- Existing public APIs and serialized data are unchanged.
- All gates pass.

## STOP conditions

- The installed/upgraded Lexical version removes or changes a private field and
  no public replacement exists. Report every affected behavior before adapting
  the cast.
- Tests reveal a call site intentionally needs top-level routing where current
  code used immediate parent, or vice versa. Preserve the old behavior pending
  product review.
- Removing the editable argument exposes an undocumented drag-readonly bug.
  Split that behavior change from this refactor.
- Theme access can be supplied cleanly through existing React context instead
  of a private read but requires API changes; propose that larger migration
  separately rather than expanding this plan silently.

## Rollback plan

Revert consumer rewires and adapter changes together so there is never a mixed
set of hierarchy implementations. Keep the real-parent tests if possible;
they improve confidence even if the abstraction must be redesigned.
