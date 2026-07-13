# Plan 014: Replace the unmaintained `should` assertion library with Vitest `expect`

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the status row for this plan
> in `plans/README.md` — unless a reviewer dispatched you and told you they
> maintain the index.
>
> **Drift check (run first)**: `git diff --stat c689f8f..HEAD -- test/setup.ts test/html-renderer/setup.ts test/nodes-base/test-utils/assertions.ts package.json`
> If any in-scope file changed since this plan was written, compare the
> "Current state" excerpts against the live code before proceeding; on a
> mismatch, treat it as a STOP condition.

## Status

- **Priority**: P2
- **Effort**: M
- **Risk**: LOW (test-only change; the suite verifies itself)
- **Depends on**: none
- **Category**: migration
- **Planned at**: commit `c689f8f`, 2026-07-13

## Why this matters

21 test files assert with `should`, an assertion library whose last real
release was 2019, while the suite already runs Vitest 4 with globals and most
newer tests use `expect`. Two assertion dialects confuse contributors and
tooling, and `should` extends `Object.prototype` (its `.extend()` call), which
is a known source of subtle breakage on Node/runtime upgrades. Converting to
`expect` is mechanical and leaves one dialect.

## Current state

- `test/setup.ts:1-9` — installs `should` globally:

  ```ts
  import should from 'should'

  const shouldModule = should as unknown as { noConflict(): typeof should; extend(): void }
  Object.defineProperty(globalThis, 'should', {
    value: shouldModule.noConflict(),
    writable: true,
    configurable: true,
  })
  shouldModule.extend()
  ```

- `test/html-renderer/setup.ts:1` — `import should from 'should'` (same pattern).
- `test/nodes-base/test-utils/assertions.ts:4` — assertion helpers built on `should`.
- ~18 more test files import `should` directly — enumerate with
  `grep -rln "from 'should'" test/`. Known examples:
  `test/nodes-base/nodes/video.test.ts:4`, `test/markdown/round-trip.test.ts`
  (uses `roundTrip(markdown).should.equal(...)`).

- `package.json:151` — `"should": "13.2.3"` in `devDependencies`.

Common patterns to convert (verify each file; `should` chains vary):

| should                            | expect                                                   |
| --------------------------------- | -------------------------------------------------------- |
| `x.should.equal(y)` (strict)      | `expect(x).toBe(y)`                                      |
| `x.should.eql(y)` (deep)          | `expect(x).toEqual(y)`                                   |
| `x.should.be.true()` / `.false()` | `expect(x).toBe(true)` / `toBe(false)`                   |
| `x.should.have.length(n)`         | `expect(x).toHaveLength(n)`                              |
| `x.should.containDeep(y)`         | `expect(x).toMatchObject(y)` (verify semantics per case) |
| `should.exist(x)`                 | `expect(x).toBeDefined()`                                |
| `x.should.match(re)`              | `expect(x).toMatch(re)`                                  |
| `x.should.throw()`                | `expect(() => x()).toThrow()`                            |

Repo conventions: Vitest globals enabled (`vitest.config.ts:18`) — `expect`,
`describe`, `it` need no import in suites under the config's `include` (check
whether `test/html-renderer` files import from `vitest` explicitly and match
the file you're editing). Single quotes, no semicolons (`oxfmt`).

## Commands you will need

| Purpose    | Command          | Expected on success                     |
| ---------- | ---------------- | --------------------------------------- |
| Install    | `pnpm install`   | exit 0                                  |
| Typecheck  | `pnpm typecheck` | exit 0                                  |
| Lint       | `pnpm lint`      | exit 0                                  |
| Unit tests | `pnpm test:unit` | all pass                                |
| Format     | `pnpm format`    | run after edits; `format:check` exits 0 |

## Scope

**In scope**:

- Every file under `test/` importing `should` (enumerate at start: expect ~21)
- `test/setup.ts`
- `test/html-renderer/setup.ts`
- `test/nodes-base/test-utils/assertions.ts`
- `package.json` (remove `should`)

**Out of scope**:

- Any assertion _semantic_ change — convert 1:1; where a `should` chain has no
  clean `expect` equivalent, stop and report that case rather than weakening
  the assertion.
- Source files under `src/`.
- Test logic, names, or structure beyond assertion syntax.

## Git workflow

- Branch: `advisor/014-replace-should-with-expect`
- Commit per directory cluster is fine (e.g. `test(nodes-base): convert should assertions to expect`)
- Do NOT push or open a PR unless the operator instructed it.

## Steps

### Step 0: Enumerate and spot-check

Run `grep -rln "from 'should'\|\.should\." test/ | sort` and record the list in
the first commit message. Skim each file for unusual chains (`.containDeep`,
`.approximately`, `.keys`, custom properties) and flag any without a clear
mapping.

### Step 1: Convert leaf test files

Convert all test files that import `should` directly, cluster by cluster
(`test/nodes-base/`, `test/markdown/`, `test/html-renderer/`,
`test/transforms/`, etc.). After each cluster: `pnpm test:unit -t "<cluster keyword>"`
→ pass.

### Step 2: Convert the shared helpers and setups

- `test/nodes-base/test-utils/assertions.ts`: rewrite helpers on `expect`.
- `test/setup.ts`: delete the `should` global installation block.
- `test/html-renderer/setup.ts`: same.

**Verify**: `pnpm test:unit` → all pass.

### Step 3: Remove the dependency

Delete `"should": "13.2.3"` from `devDependencies`; `pnpm install`;
`pnpm format` the manifest if needed.

**Verify**: `grep -rn "should" test/ package.json | grep -v "should " | grep -viE "\bshould\b\s*(be|have|return|render)"`
→ review output manually; the goal: no `from 'should'` imports and no
`.should.` chains remain. Simpler gate: `grep -rn "from 'should'" test/` → no
matches; `grep -rn "\.should\." test/` → no matches.
`pnpm typecheck` → exit 0; `pnpm lint` → exit 0; `pnpm test:unit` → all pass.

## Test plan

- The conversion is its own test plan: every converted assertion must keep the
  suite green with zero expectation-value changes.
- Pay special attention to `.equal` (strict equality) vs `.eql` (deep) —
  swapping these changes semantics. Grep your diff for `toBe(` on object
  literals; those should be `toEqual(`.

## Done criteria

- [ ] `pnpm typecheck` exits 0
- [ ] `pnpm lint` exits 0
- [ ] `pnpm test:unit` exits 0 with zero changed expectation values (reviewer
      check on the diff)
- [ ] `grep -rn "from 'should'" test/` and `grep -rn "\.should\." test/` return no matches
- [ ] `should` absent from `package.json`; `pnpm install` exits 0
- [ ] No files outside the in-scope list are modified (`git status`)
- [ ] `plans/README.md` status row updated

## STOP conditions

Stop and report back (do not improvise) if:

- A `should` chain has no faithful `expect` equivalent (e.g. `.containDeep`
  with partial-array semantics `toMatchObject` can't express) — report the
  case; keep that one file on a local helper rather than weakening the test.
- A converted file fails and the cause is a real behavioral bug the old
  assertion was masking — report; do not "fix" the assertion to pass.
- The file count differs wildly from ~21 (e.g. 60) — re-scope before starting.
- A step's verification fails twice after a reasonable fix attempt.

## Maintenance notes

- After this, `expect` is the single assertion dialect; reviewers should
  reject new `should` imports. Consider an oxlint `no-restricted-imports`
  entry for `should` as a one-line follow-up if the team wants enforcement.
- `Object.prototype` pollution from `.extend()` disappears — if any test was
  accidentally relying on `.should` existing on all objects without importing
  the library, it will now fail loudly, which is the point.
