import { describe, expect, it } from 'vitest'

import { pasteDialect } from '@/markdown/paste-dialect'
import { roundTripDialect } from '@/markdown/round-trip'

// The two-dialect divergence is structural: each dialect module declares
// what it speaks as data (`@/markdown/dialects` owns the shared interface).
// This pins the declared grammars against each other — footnotes and card
// fences are exactly the axes the dialects diverge on; ==mark== and
// ~/^ sub/sup are spoken by both (behavior pinned in
// MarkdownPastePlugin.test.tsx and round-trip.test.ts).
describe('Markdown dialects', function () {
  it('declares what each dialect speaks as data', function () {
    expect(pasteDialect.grammar).toEqual({
      footnotes: true,
      mark: true,
      subSup: true,
      cardFences: false,
    })
    expect(roundTripDialect.grammar).toEqual({
      footnotes: false,
      mark: true,
      subSup: true,
      cardFences: true,
    })
  })
})
