# Plan 001: Fix capture-phase listener leak in `usePinturaEditor`

> **Executor instructions**: Follow this plan step by step. Run every verification command and confirm the expected result before moving to the next step. If anything in the "STOP conditions" section occurs, stop and report — do not improvise. When done, update the status row for this plan in `plans/README.md`.
>
> **Drift check (run first)**: `git diff --stat c295b9c..HEAD -- src/hooks/usePinturaEditor.ts test/unit/hooks/usePinturaEditor.test.ts`
> If any in-scope file changed since this plan was written, compare the "Current state" excerpts against the live code before proceeding; on a mismatch, treat it as a STOP condition.

## Status

- **Priority**: P1
- **Effort**: S
- **Risk**: LOW
- **Depends on**: none
- **Category**: bug
- **Planned at**: commit `c295b9c`, 2026-07-13
- **Issue**: (omit)

## Why this matters

`usePinturaEditor` registers a window-level click listener to detect clicks on the Pintura modal close button. It adds the listener in the capture phase but removes it in the bubble phase. `removeEventListener` must be called with the same options as `addEventListener`; otherwise the listener is never removed. On a long-lived editor session this leaks listeners and can trigger stale close behavior on unrelated clicks.

## Current state

- `src/hooks/usePinturaEditor.ts` — hook that loads and opens the Pintura image editor.
- The relevant effect is at the end of the file (lines 183–196):

```ts
// src/hooks/usePinturaEditor.ts:183
useEffect(() => {
  const handleCloseClick = (event: MouseEvent) => {
    const target = event.target as Element
    if (target?.closest?.('.PinturaModal button[title="Close"]')) {
      allowClose.current = true
    }
  }

  window.addEventListener('click', handleCloseClick, { capture: true })

  return () => {
    window.removeEventListener('click', handleCloseClick)
  }
}, [])
```

The `addEventListener` call uses `{ capture: true }`; the `removeEventListener` cleanup omits it.

Repo conventions:

- Hooks are written in TypeScript, use `React.useEffect` or `useEffect` consistently with the file.
- The existing test file `test/unit/hooks/usePinturaEditor.test.ts` uses `@testing-library/react` hooks renderer and asserts the hook shape; add regression coverage there.

## Commands you will need

| Purpose   | Command                                | Expected on success |
| --------- | -------------------------------------- | ------------------- |
| Typecheck | `pnpm typecheck`                       | exit 0, no errors   |
| Lint      | `pnpm lint`                            | exit 0              |
| Tests     | `pnpm test:unit -t "usePinturaEditor"` | all pass            |
| Full unit | `pnpm test:unit`                       | all pass            |

## Scope

**In scope**:

- `src/hooks/usePinturaEditor.ts` — fix the listener cleanup.
- `test/unit/hooks/usePinturaEditor.test.ts` — add a regression test that proves the listener is removed on unmount.

**Out of scope**:

- Pintura config validation or the dynamic import logic (separate plan).
- Any other hooks or components.

## Git workflow

- Branch: `advisor/001-fix-pintura-listener-leak`
- Commit message style: `fix(hooks): remove Pintura close listener with capture option` (match recent `fix(...)` commits).
- Do not push or open a PR unless instructed.

## Steps

### Step 1: Match the removeEventListener options

In `src/hooks/usePinturaEditor.ts`, change the cleanup function to pass the same options object used in `addEventListener`.

Target shape:

```ts
window.addEventListener('click', handleCloseClick, { capture: true })

return () => {
  window.removeEventListener('click', handleCloseClick, { capture: true })
}
```

**Verify**: `pnpm lint` → exit 0.

### Step 2: Add a regression test

Open `test/unit/hooks/usePinturaEditor.test.ts`. It already renders the hook. Add a test that:

1. Spies on `window.addEventListener` and `window.removeEventListener` before rendering.
2. Renders the hook (or triggers the effect).
3. Unmounts the hook.
4. Asserts that a `click` listener was removed with `{ capture: true }`.

If the test file currently stubs `window.addEventListener`, adjust the stub to record the options argument so the assertion is meaningful.

Model the test after the existing hook tests in the same file for setup style.

**Verify**: `pnpm test:unit -t "usePinturaEditor"` → all pass, including the new test.

### Step 3: Run full verification

**Verify**:

- `pnpm typecheck` → exit 0
- `pnpm lint` → exit 0
- `pnpm test:unit` → exit 0 (full suite)

## Test plan

- New test in `test/unit/hooks/usePinturaEditor.test.ts`: "removes the capture-phase click listener on unmount".
- Existing tests in the same file must continue to pass.

## Done criteria

- [ ] `src/hooks/usePinturaEditor.ts` cleanup uses `{ capture: true }`.
- [ ] A regression test exists and passes.
- [ ] `pnpm typecheck` exits 0.
- [ ] `pnpm lint` exits 0.
- [ ] `pnpm test:unit` exits 0.
- [ ] No files outside the in-scope list are modified (`git status`).
- [ ] `plans/README.md` status row updated.

## STOP conditions

Stop and report back if:

- The effect in `src/hooks/usePinturaEditor.ts` does not match the excerpt above (drift).
- The test file does not exist or uses a radically different testing style.
- A step's verification fails twice after a reasonable fix attempt.

## Maintenance notes

- When adding new global event listeners in hooks, always mirror `addEventListener` options in `removeEventListener`.
- A reviewer should check that the spy/test actually asserts the options argument, not just that remove was called.
