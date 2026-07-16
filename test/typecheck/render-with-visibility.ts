/**
 * Compile-time pin for the plan-042 leftover fixed in plan 048:
 * `renderWithVisibility`'s third parameter is
 * `Partial<Pick<RenderContext, 'target'>>` — the `target` key is optional
 * (the body only compares it against 'email'; omitting it takes the web
 * path).
 *
 * This file is included by the root tsconfig (unlike test/unit) and is only
 * type-checked — it is never executed and contains no runtime assertions.
 */
import { renderWithVisibility } from '@/nodes/base/utils/visibility'

declare const output: Parameters<typeof renderWithVisibility>[0]
declare const visibility: Parameters<typeof renderWithVisibility>[1]

// target may be omitted entirely (web path) or given explicitly
renderWithVisibility(output, visibility, {})
renderWithVisibility(output, visibility, { target: 'email' })
renderWithVisibility(output, visibility, { target: undefined })

// @ts-expect-error - target must be a string when present
renderWithVisibility(output, visibility, { target: 42 })

// @ts-expect-error - the context slice carries only target
renderWithVisibility(output, visibility, { target: 'web', mode: 'dark' })
