# Plan 005: Validate iframe `data-src` in `set-src-background-from-parent` helper

> **Executor instructions**: Follow this plan step by step. Run every verification command and confirm the expected result before moving to the next step. If anything in the "STOP conditions" section occurs, stop and report — do not improvise. When done, update the status row for this plan in `plans/README.md`.
>
> **Drift check (run first)**: `git diff --stat c295b9c..HEAD -- src/nodes/base/utils/set-src-background-from-parent.ts`
> If any in-scope file changed since this plan was written, compare the "Current state" excerpts against the live code before proceeding; on a mismatch, treat it as a STOP condition.

## Status

- **Priority**: P1
- **Effort**: S
- **Risk**: MED
- **Depends on**: none
- **Category**: security
- **Planned at**: commit `c295b9c`, 2026-07-13
- **Issue**: (omit)

## Why this matters

`buildSrcBackgroundScript` serializes a function to a string and embeds it in a `<script>` tag. The serialized function reads `data-src` from an iframe and assigns it to `iframe.src`. Because `new URL(baseSrc)` accepts any URL scheme, an attacker-controlled `data-src` can execute arbitrary code in the iframe context. The helper appears to have no internal callers, but it is exported, so hardening its contract is defensive maintenance.

## Current state

- `src/nodes/base/utils/set-src-background-from-parent.ts` (lines 26–78):

```ts
// src/nodes/base/utils/set-src-background-from-parent.ts:26
const baseSrc = el.getAttribute('data-src')
if (!baseSrc) {
  return
}

// ... color detection ...

if (!node || !bg || bg === 'transparent') {
  el.src = baseSrc
  return
}

// ...

const u = new URL(baseSrc)
u.searchParams.set('background', hex)
el.src = u.toString()
```

And at line 78:

```ts
script.innerHTML = `(${setSrcBackgroundFromParent.toString()})()`
```

Repo conventions:

- URL validation helpers live in `src/nodes/base/utils/is-safe-url.ts`.
- The helper is exported from `src/nodes/base/utils/index.ts` (verify via grep).

## Commands you will need

| Purpose   | Command                                        | Expected on success        |
| --------- | ---------------------------------------------- | -------------------------- | -------- |
| Typecheck | `pnpm typecheck`                               | exit 0, no errors          |
| Lint      | `pnpm lint`                                    | exit 0                     |
| Tests     | `pnpm test:unit -t "setSrcBackgroundFromParent | buildSrcBackgroundScript"` | all pass |
| Full unit | `pnpm test:unit`                               | all pass                   |

## Scope

**In scope**:

- `src/nodes/base/utils/set-src-background-from-parent.ts`
- A new or updated unit test file for this helper (likely `test/unit/utils/set-src-background-from-parent.test.ts` or `test/nodes-base/utils/...` depending on existing layout).

**Out of scope**:

- Callers of this helper (none found internally; do not search for external callers).
- Changing the color-detection algorithm.

## Git workflow

- Branch: `advisor/005-validate-iframe-data-src-helper`
- Commit message style: `fix(utils): validate iframe data-src before assignment in background script helper`
- Do not push or open a PR unless instructed.

## Steps

### Step 1: Find the helper's test location

Search for existing tests referencing `setSrcBackgroundFromParent` or `buildSrcBackgroundScript`:

```bash
grep -rn "setSrcBackgroundFromParent\|buildSrcBackgroundScript" test/
```

If no test exists, create one in the same directory as other node-base utility tests (likely `test/nodes-base/utils/` or `test/unit/utils/`).

### Step 2: Validate `baseSrc` before use

In `src/nodes/base/utils/set-src-background-from-parent.ts`:

1. Import `isSafeUrl`:

```ts
import { isSafeUrl } from './is-safe-url'
```

2. After reading `baseSrc`, reject unsafe URLs early:

```ts
const baseSrc = el.getAttribute('data-src')
if (!baseSrc || !isSafeUrl(baseSrc)) {
  return
}
```

This prevents both the direct `el.src = baseSrc` fallback and the `new URL(baseSrc)` path from accepting `javascript:`, `data:`, `blob:`, etc.

### Step 3: Avoid `innerHTML` for the script body

Change line 78 from:

```ts
script.innerHTML = `(${setSrcBackgroundFromParent.toString()})()`
```

to:

```ts
script.textContent = `(${setSrcBackgroundFromParent.toString()})()`
```

`textContent` is safer for script bodies and behaves identically for plain string content.

### Step 4: Add regression tests

Add tests that call `buildSrcBackgroundScript` (or exercise the serialized function if the test environment supports it) with:

- A safe `https://example.com/embed?data-src=...` iframe — assert `src` is set.
- A `javascript:alert(1)` data-src — assert `src` is not set.
- A `data:text/html,...` data-src — assert `src` is not set.

If the helper has no callers and no realistic way to invoke the serialized function in jsdom, add at minimum a unit test that inspects the generated script and asserts it contains the `isSafeUrl` validation and uses `textContent`.

**Verify**: `pnpm test:unit -t "setSrcBackgroundFromParent|buildSrcBackgroundScript"` → all pass.

### Step 5: Run full verification

**Verify**:

- `pnpm typecheck` → exit 0
- `pnpm lint` → exit 0
- `pnpm test:unit` → exit 0

## Test plan

- New or updated test for `src/nodes/base/utils/set-src-background-from-parent.ts`.
- Tests cover safe URL acceptance, unsafe URL rejection, and script body insertion method.

## Done criteria

- [ ] `baseSrc` is validated with `isSafeUrl` before assignment.
- [ ] `script.textContent` is used instead of `script.innerHTML`.
- [ ] Regression tests exist and pass.
- [ ] `pnpm typecheck` exits 0.
- [ ] `pnpm lint` exits 0.
- [ ] `pnpm test:unit` exits 0.
- [ ] No files outside the in-scope list are modified (`git status`).
- [ ] `plans/README.md` status row updated.

## STOP conditions

Stop and report back if:

- The helper file does not match the excerpt above.
- `isSafeUrl` is not available in `src/nodes/base/utils/is-safe-url.ts`.
- The serialized function cannot be tested in jsdom and you cannot write a meaningful assertion about the generated script string.

## Maintenance notes

- This helper is exported but appears unused internally. Consider deprecating or removing it if no consumer exists after this fix; that is out of scope for this plan.
- Future helpers that build inline scripts should validate URLs and use `textContent`.
