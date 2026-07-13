# Plan 006: Replace barrel imports in card wrapper nodes to avoid circular dependencies

> **Executor instructions**: Follow this plan step by step. Run every verification command and confirm the expected result before moving to the next step. If anything in the "STOP conditions" section occurs, stop and report — do not improvise. When done, update the status row for this plan in `plans/README.md`.
>
> **Drift check (run first)**: `git diff --stat c295b9c..HEAD -- src/nodes/ButtonNode.tsx src/nodes/ToggleNode.tsx src/nodes/VideoNode.tsx src/nodes/BookmarkNode.tsx src/nodes/CodeBlockNode.tsx`
> If any in-scope file changed since this plan was written, compare the "Current state" excerpts against the live code before proceeding; on a mismatch, treat it as a STOP condition.

## Status

- **Priority**: P2
- **Effort**: S
- **Risk**: MED
- **Depends on**: none
- **Category**: tech-debt
- **Planned at**: commit `c295b9c`, 2026-07-13
- **Issue**: (omit)

## Why this matters

`src/index.ts` is a public barrel that re-exports `DEFAULT_NODES`, which imports every wrapper node. When wrapper nodes import shared primitives (`InklingCardWrapper`, `MINIMAL_NODES`) back from `@/index`, they create node↔barrel circular dependencies. The most recent commit on `main` fixed an ImageNode TDZ failure caused by exactly this pattern. Standardizing on direct source imports removes the cycle and prevents the same regression when cards are reordered or new cards are added.

## Current state

- `src/nodes/ImageNode.tsx:9-13` and `src/nodes/GalleryNode.tsx` already import directly and are the exemplars:

```ts
import InklingCardWrapper from '@/components/InklingCardWrapper'
import MINIMAL_NODES from '@/nodes/MinimalNodes'
```

- The following wrapper nodes still import from `@/index`:

```ts
// src/nodes/ButtonNode.tsx:6
import { InklingCardWrapper, MINIMAL_NODES } from '@/index'

// src/nodes/ToggleNode.tsx:7
import { InklingCardWrapper, MINIMAL_NODES } from '@/index'

// src/nodes/VideoNode.tsx:6
import { InklingCardWrapper, MINIMAL_NODES } from '@/index'

// src/nodes/BookmarkNode.tsx:6
import { InklingCardWrapper, MINIMAL_NODES } from '@/index'

// src/nodes/CodeBlockNode.tsx:6
import { InklingCardWrapper, MINIMAL_NODES } from '@/index'
```

- `src/nodes/DefaultNodes.ts:20-31` imports all wrapper nodes, so any `@/index` import inside them closes a cycle.

Repo conventions:

- Wrapper node files live in `src/nodes/<Card>Node.tsx`.
- Shared primitives are `src/components/InklingCardWrapper.tsx` and `src/nodes/MinimalNodes.ts`.

## Commands you will need

| Purpose   | Command                                           | Expected on success |
| --------- | ------------------------------------------------- | ------------------- | --------- | ------------ | --------------- | -------- |
| Typecheck | `pnpm typecheck`                                  | exit 0, no errors   |
| Lint      | `pnpm lint`                                       | exit 0              |
| Tests     | `pnpm test:unit -t "ButtonNode                    | ToggleNode          | VideoNode | BookmarkNode | CodeBlockNode"` | all pass |
| Full unit | `pnpm test:unit`                                  | all pass            |
| Dev start | `pnpm dev` starts without TDZ error (quick smoke) | no crash on load    |

## Scope

**In scope**:

- `src/nodes/ButtonNode.tsx`
- `src/nodes/ToggleNode.tsx`
- `src/nodes/VideoNode.tsx`
- `src/nodes/BookmarkNode.tsx`
- `src/nodes/CodeBlockNode.tsx`

**Out of scope**:

- `src/nodes/ImageNode.tsx` and `src/nodes/GalleryNode.tsx` (already fixed).
- `src/index.ts` barrel.
- Any other `@/index` imports in plugins/components unless they are in these five files.

## Git workflow

- Branch: `advisor/006-replace-barrel-imports-in-card-wrappers`
- Commit message style: `refactor(nodes): import card wrapper primitives directly to avoid barrel cycles`
- Do not push or open a PR unless instructed.

## Steps

### Step 1: Replace imports in each wrapper node

In each of the five files, replace:

```ts
import { InklingCardWrapper, MINIMAL_NODES } from '@/index'
```

with:

```ts
import InklingCardWrapper from '@/components/InklingCardWrapper'
import MINIMAL_NODES from '@/nodes/MinimalNodes'
```

Files to edit:

- `src/nodes/ButtonNode.tsx`
- `src/nodes/ToggleNode.tsx`
- `src/nodes/VideoNode.tsx`
- `src/nodes/BookmarkNode.tsx`
- `src/nodes/CodeBlockNode.tsx`

Preserve all other imports and ordering. Use the repo's import-sorting rules (oxfmt will re-sort).

**Verify**: `pnpm typecheck` → exit 0.

### Step 2: Add a lint/import rule guard (optional but recommended)

If `oxlint` supports it, add a rule or pattern that forbids `src/nodes/*Node.tsx` files from importing `@/index`. This is optional; if not straightforward, skip and document it as a future improvement.

**STOP condition**: If adding an import rule causes many unrelated failures, remove it and report.

### Step 3: Run tests and dev smoke

**Verify**:

- `pnpm lint` → exit 0
- `pnpm test:unit -t "ButtonNode|ToggleNode|VideoNode|BookmarkNode|CodeBlockNode"` → all pass
- `pnpm dev` → starts without `ReferenceError: Cannot access 'ImageNode' before initialization` or similar TDZ errors (run for ~30 seconds and stop).

### Step 4: Run full verification

**Verify**:

- `pnpm typecheck` → exit 0
- `pnpm lint` → exit 0
- `pnpm test:unit` → exit 0

## Test plan

- Existing unit tests for the five node types must continue to pass.
- No new tests required; the dev-server smoke test is the regression check.

## Done criteria

- [ ] All five wrapper node files import `InklingCardWrapper` and `MINIMAL_NODES` directly from source.
- [ ] `pnpm typecheck` exits 0.
- [ ] `pnpm lint` exits 0.
- [ ] `pnpm test:unit` exits 0.
- [ ] `pnpm dev` starts without TDZ errors.
- [ ] No files outside the in-scope list are modified (`git status`).
- [ ] `plans/README.md` status row updated.

## STOP conditions

Stop and report back if:

- Any of the five files do not contain the `import { InklingCardWrapper, MINIMAL_NODES } from '@/index'` line.
- `pnpm dev` still throws a TDZ error after the import changes.
- A step's verification fails twice after a reasonable fix attempt.

## Maintenance notes

- Never add new `@/index` imports inside `src/nodes/*Node.tsx` files.
- If a future card needs a new shared primitive, import it directly from its source file.
- A reviewer should verify that no new cycles appear in the import graph after landing this.
