# Plan 033: Cancel trailing settings-panel resize work during cleanup

> **Executor instructions**: Keep this change narrow. Prove the trailing call
> after unmount with fake timers, cancel it in the same effect that owns the
> observer, and characterize—but do not opportunistically rewrite—the panel
> origin math.
>
> **Drift check (run first)**:
> `git diff --stat 316dd61..HEAD -- src/hooks/useSettingsPanelReposition.ts src/hooks/useMovable.ts src/utils/timing.ts test/unit/hooks test/unit/components/SettingsPanel.test.tsx`

## Status

- **Priority**: P2
- **Effort**: S
- **Risk**: LOW — one cleanup call plus focused timing coverage; positioning behavior must remain unchanged while mounted
- **Depends on**: none
- **Category**: bug / lifecycle / test coverage
- **Planned at**: commit `316dd61`, 2026-07-14

## Why this matters

The settings-panel hook creates a leading-and-trailing debounced resize
callback inside a layout effect. Cleanup disconnects `ResizeObserver` but does
not cancel the already scheduled trailing timeout. The callback can therefore
run after the panel unmounts or after a new observer/effect instance replaces
the old one. At best this performs stale layout work; at worst it can update a
new/ref-reused panel using old viewport and spacing data.

Inkling's in-repo debounce implementation deliberately exposes `.cancel()`,
and other hooks/components already use it during cleanup. This hook should
follow the same ownership rule.

## Current-state evidence

- `src/hooks/useSettingsPanelReposition.ts:295-302` creates
  `panelRepositionDebounced` with `{leading: true, trailing: true}` and a
  100 ms delay.
- The observer can call it repeatedly at lines 304-313.
- Cleanup at lines 318-320 only calls `resizeObserver.disconnect()`.
- `src/utils/timing.ts:110-116` implements `.cancel()` by clearing the timeout
  and pending arguments.
- `useSearchLinks`, `DropdownContainer`, `FloatingLinkToolbar`, and
  `WordCountPlugin` already cancel owned debounced/throttled work.
- There is no focused test for `useSettingsPanelReposition`; `useMovable` has
  its own hook suite.
- Separately, `keepWithinSpacing` accepts `origin` and immediately overwrites it
  with `getSelectedCardOrigin()` at line 83. This is suspicious because callers
  compute explicit origins, but the existing wide-card effects compensate in
  multiple places. It is not enough evidence for a behavior change in this
  lifecycle fix.

## Desired behavior

1. Resize bursts while mounted retain the same leading/trailing behavior.
2. Cleanup disconnects the observer and cancels pending trailing work.
3. Advancing timers after unmount causes no `getPosition`, `setPosition`, DOM
   query, or ref access from the old effect.
4. Re-running the effect cannot let an old debounce instance update the new
   panel.
5. Initial, drag, mobile, wide-card, and viewport-bound positioning remain
   byte/coordinate compatible with the current hook.

## Scope

**In scope**:

- `useSettingsPanelReposition` cleanup
- A focused hook test with a controllable `ResizeObserver` and fake timers
- Minimal test seams/exports for pure geometry helpers if required
- Characterization tests for explicit-origin behavior only to document current
  semantics

**Out of scope**:

- Redesigning panel coordinates, spacing constants, or wide-card offsets
- Fixing the overwritten `origin` parameter without separate red behavior
  evidence
- Rewriting `useMovable`
- Changing debounce timing globally
- Adding a resize-observer package

## Commands you will need

| Purpose              | Command                                                                                            | Expected on success |
| -------------------- | -------------------------------------------------------------------------------------------------- | ------------------- |
| Focused hook test    | `pnpm test:unit -- test/unit/hooks/useSettingsPanelReposition.test.ts`                             | all cases pass      |
| Neighbor regressions | `pnpm test:unit -- test/unit/hooks/useMovable.test.ts test/unit/components/SettingsPanel.test.tsx` | all pass            |
| Type/lint            | `pnpm typecheck && pnpm lint`                                                                      | both exit 0         |
| Full units           | `pnpm test:unit`                                                                                   | all pass            |
| Format               | `pnpm format && pnpm format:check`                                                                 | exits 0             |

## Git workflow

- Branch: `advisor/033-cancel-settings-panel-resize-work`
- Commit 1: `test(settings): reproduce trailing resize after cleanup`
- Commit 2: `fix(settings): cancel pending panel reposition work`
- Do not push or open a PR unless instructed.

## Steps

### Step 1: Build a deterministic hook harness

Create `test/unit/hooks/useSettingsPanelReposition.test.ts` (use `.tsx` only if
the harness renders JSX). Install no new dependency; use the existing React
Testing Library/Vitest hook utilities.

Provide a local `MockResizeObserver` that records:

- constructor callback;
- observed element(s);
- `disconnect` calls;
- an explicit `emit(width)` helper producing the same `contentBoxSize` shape
  the hook reads.

Use `vi.useFakeTimers()` and restore real timers/global observer in
`afterEach`, even on failed assertions. Set deterministic `window.innerWidth`,
`innerHeight`, element `offsetWidth`/`offsetHeight`, bounding rectangles, and
computed styles. Restore property descriptors after each test.

Either:

- render a small component that calls the hook and attaches the returned ref;
  then spy on its transform, or
- mock `useMovable` to expose stable `getPosition`/`setPosition` spies.

Prefer the real `useMovable` for one integration case, but a mock is acceptable
for proving stale callback ownership if it avoids coupling the test to drag
listeners. Do not mock `debounce`; the real timer behavior is the bug.

### Step 2: Add the red cleanup regression

Drive this exact sequence:

1. mount the hook with a panel and observed container;
2. emit width A, triggering the leading callback immediately;
3. before 100 ms elapses, emit width B, scheduling a trailing invocation;
4. capture the mounted call count/position;
5. unmount;
6. assert observer `disconnect()` ran;
7. advance beyond 100 ms;
8. assert no additional position/layout call occurred.

Before the fix, Step 8 should fail. Ensure width B differs from the locally
remembered width so it genuinely schedules pending args. Add a second test that
rerenders/recreates the effect and proves an old callback cannot write through
after the new instance mounts.

Also assert the mounted behavior remains:

- the first width invokes on the leading edge;
- the final changed width invokes once on the trailing edge;
- repeated identical width does not reposition.

### Step 3: Cancel the owned debounce before disconnecting

Change only the layout-effect cleanup:

```ts
return () => {
  panelRepositionDebounced.cancel()
  resizeObserver.disconnect()
}
```

Cancellation first makes the callback inert before observer teardown. If the
observer implementation can synchronously deliver records during disconnect,
this order is the safer ownership boundary. Do not flush the callback; stale
positioning is not work that must complete on unmount.

Do not memoize or hoist the debounce beyond the effect. Its lifetime should
remain exactly paired with the observer and current `onResize` closure.

**Verify**: the focused test passes with fake timers and no pending-timer
warnings.

### Step 4: Characterize the coordinate seam without changing it

Add small pure/helper tests only if they can be written without making private
implementation part of the public API. Cover current behavior for:

- ordinary card with no transform;
- transformed/wide card origin;
- panel near each viewport boundary;
- mobile placement below the card;
- explicit `positionToRef` selection.

Record the observation that `keepWithinSpacing` currently replaces a supplied
`origin`. If a test shows this causes a user-visible wrong position, open a
separate plan with expected coordinates and remove no compensating code until
the full flow is understood. If current tests show the argument is dead, a
later refactor can remove it rather than guessing which source should win.

Do not export `keepWithinSpacing` from the package root. A named test-only or
internal export is acceptable only if repository conventions allow it;
otherwise test through the hook.

### Step 5: Run regression gates and check timer hygiene

Run:

```bash
pnpm format
pnpm format:check
pnpm typecheck
pnpm lint
pnpm test:unit -- test/unit/hooks/useSettingsPanelReposition.test.ts test/unit/hooks/useMovable.test.ts test/unit/components/SettingsPanel.test.tsx
pnpm test:unit
```

Run the focused test once with Vitest's leak/open-handle diagnostics if
available. Ensure all fake timers are drained or canceled and real timers are
restored.

## Test plan

| Lifecycle                          | Expected result                    |
| ---------------------------------- | ---------------------------------- |
| first resize while mounted         | immediate leading reposition       |
| burst while mounted                | one final trailing reposition      |
| identical width                    | no extra reposition                |
| unmount with pending trailing call | cancel; no post-unmount work       |
| effect replacement                 | old instance cannot update new ref |
| observer cleanup                   | disconnect exactly once            |

## Acceptance criteria

- Effect cleanup calls both debounce cancellation and observer disconnect.
- Fake-timer regression proves no trailing callback after unmount.
- Leading/trailing behavior remains unchanged while mounted.
- No production coordinate/spacing behavior changes in this plan.
- The suspicious `origin` overwrite is documented/tested, not “fixed” without
  evidence.
- All gates pass.

## STOP conditions

- The real debounce does not reproduce pending work because the hook or timing
  implementation drifted; re-audit before editing.
- Product behavior requires flushing the final resize on unmount. Document why
  a detached panel needs an update and design explicit ownership instead of
  leaving a timer loose.
- A hook test can pass only by changing global debounce semantics.
- Coordinate characterization exposes an active user-visible positioning bug.
  Keep this cleanup isolated and write a separate evidence-based plan for the
  geometry change.

## Rollback plan

Revert the cleanup and its focused regression together only if cancellation is
proven to suppress required mounted work. Do not change `timing.ts` as part of
rollback; its cancellation API is used correctly elsewhere.
