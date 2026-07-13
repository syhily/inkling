# Plan 002: Remove ReDoS-prone regexes from `sanitizeHtml`

> **Executor instructions**: Follow this plan step by step. Run every verification command and confirm the expected result before moving to the next step. If anything in the "STOP conditions" section occurs, stop and report — do not improvise. When done, update the status row for this plan in `plans/README.md`.
>
> **Drift check (run first)**: `git diff --stat c295b9c..HEAD -- src/utils/sanitize-html.ts test/unit/utils/sanitize-html.test.ts`
> If any in-scope file changed since this plan was written, compare the "Current state" excerpts against the live code before proceeding; on a mismatch, treat it as a STOP condition.

## Status

- **Priority**: P1
- **Effort**: S
- **Risk**: LOW
- **Depends on**: none
- **Category**: security
- **Planned at**: commit `c295b9c`, 2026-07-13
- **Issue**: (omit)

## Why this matters

`sanitizeHtml` runs custom regexes to strip `<script>` and `<iframe>` tags before handing the result to DOMPurify. Both regexes use nested quantifiers (`(?:(?!<\/script>)<[^<]*)*`) that can cause catastrophic backtracking on crafted input. Because this function is called on pasted or imported HTML, a malicious payload can freeze the editor thread. DOMPurify already strips scripts and iframes when configured with `FORBID_TAGS`, so the custom regexes add risk without adding security.

## Current state

- `src/utils/sanitize-html.ts` — HTML sanitizer used by paste, import, and card export paths.
- Current implementation (lines 7–32):

```ts
// src/utils/sanitize-html.ts:7
export function sanitizeHtml(html = '', options: SanitizeHtmlOptions = {}): string {
  const resolvedOptions = {
    replaceJS: true,
    ...options,
  }

  let result = html

  // replace script and iFrame
  if (resolvedOptions.replaceJS) {
    result = result.replace(
      /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
      '<pre class="js-embed-placeholder">Embedded JavaScript</pre>',
    )
    result = result.replace(
      /<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi,
      '<pre class="iframe-embed-placeholder">Embedded iFrame</pre>',
    )
  }

  // sanitize html
  return DOMPurify.sanitize(result, {
    ALLOWED_URI_REGEXP: /^(?:https?:|\/|blob:)/,
    ADD_ATTR: ['id'],
    FORBID_TAGS: ['style'],
  }) as string
}
```

Repo conventions:

- Utility tests live in `test/unit/utils/<name>.test.ts` and use Vitest with `describe`/`it`.
- The existing `test/unit/utils/sanitize-html.test.ts` (if present) is the pattern to follow; otherwise model after `test/unit/utils/isInternalUrl.test.ts`.

## Commands you will need

| Purpose   | Command                            | Expected on success |
| --------- | ---------------------------------- | ------------------- |
| Typecheck | `pnpm typecheck`                   | exit 0, no errors   |
| Lint      | `pnpm lint`                        | exit 0              |
| Tests     | `pnpm test:unit -t "sanitizeHtml"` | all pass            |
| Full unit | `pnpm test:unit`                   | all pass            |

## Scope

**In scope**:

- `src/utils/sanitize-html.ts` — remove the ReDoS-prone pre-sanitization regexes.
- `test/unit/utils/sanitize-html.test.ts` — add a regression test with a pathological input; create the file if absent.

**Out of scope**:

- Changing DOMPurify configuration (unless required to preserve behavior).
- Refactoring callers of `sanitizeHtml`.

## Git workflow

- Branch: `advisor/002-remove-redos-in-sanitize-html`
- Commit message style: `fix(utils): remove ReDoS-prone pre-sanitization regexes`
- Do not push or open a PR unless instructed.

## Steps

### Step 1: Remove the custom script/iframe regexes

In `src/utils/sanitize-html.ts`, delete the `if (resolvedOptions.replaceJS)` block and the `result` variable. Make the function return DOMPurify's output directly.

Target shape:

```ts
export function sanitizeHtml(html = '', options: SanitizeHtmlOptions = {}): string {
  const resolvedOptions = {
    replaceJS: true,
    ...options,
  }

  return DOMPurify.sanitize(html, {
    ALLOWED_URI_REGEXP: /^(?:https?:|\/|blob:)/,
    ADD_ATTR: ['id'],
    FORBID_TAGS: resolvedOptions.replaceJS ? ['style', 'script', 'iframe'] : ['style'],
  }) as string
}
```

This preserves the intent of `replaceJS: false` (do not forbid script/iframe) while removing the regexes. If `replaceJS: true` callers expect `<pre class="js-embed-placeholder">` placeholders instead of removal, evaluate whether DOMPurify removal is acceptable; the finding assumes the placeholder behavior is not a hard requirement.

**STOP condition**: If any caller asserts the exact placeholder output, stop and report before changing behavior.

**Verify**: `pnpm typecheck` → exit 0.

### Step 2: Add a ReDoS regression test

Create or open `test/unit/utils/sanitize-html.test.ts`. Add a test that calls `sanitizeHtml` with a long, pathological string designed to trigger the old regex backtracking (for example, many `<` characters followed by a closing `</script>`) and assert it returns promptly and does not hang.

Example:

```ts
it('does not hang on input that used to cause catastrophic backtracking', () => {
  const payload = '<' + 'a'.repeat(10000) + '</script>'
  const start = performance.now()
  const result = sanitizeHtml(payload)
  expect(performance.now() - start).toBeLessThan(100)
  expect(result).not.toContain('<script')
})
```

Also add a happy-path test that a normal `<script>` tag is still removed.

**Verify**: `pnpm test:unit -t "sanitizeHtml"` → all pass.

### Step 3: Run full verification

**Verify**:

- `pnpm typecheck` → exit 0
- `pnpm lint` → exit 0
- `pnpm test:unit` → exit 0

## Test plan

- New/updated file: `test/unit/utils/sanitize-html.test.ts`.
- Tests:
  - "removes script tags without ReDoS-prone regex".
  - "removes iframe tags without ReDoS-prone regex".
  - "returns quickly on pathological input".
- Model after existing utility tests in `test/unit/utils/`.

## Done criteria

- [ ] Custom `script`/`iframe` regex replacements are removed from `sanitizeHtml`.
- [ ] `replaceJS: true` still strips scripts and iframes (via DOMPurify `FORBID_TAGS`).
- [ ] Regression tests exist and pass.
- [ ] `pnpm typecheck` exits 0.
- [ ] `pnpm lint` exits 0.
- [ ] `pnpm test:unit` exits 0.
- [ ] No files outside the in-scope list are modified (`git status`).
- [ ] `plans/README.md` status row updated.

## STOP conditions

Stop and report back if:

- The file `src/utils/sanitize-html.ts` does not match the excerpt above.
- A caller or existing test depends on the `<pre class="js-embed-placeholder">` output shape.
- A step's verification fails twice after a reasonable fix attempt.

## Maintenance notes

- Avoid writing regexes that strip HTML; prefer a hardened sanitizer (DOMPurify) with explicit tag/attribute allowlists.
- If placeholder output for scripts/iframes is later required, implement it as a DOMPurify hook rather than a regex.
