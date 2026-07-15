import { readFileSync } from 'node:fs'

// The toolbar hook is a live e2e selector contract; a copy-paste from
// SignupNodeComponent labeled it "signup" on both sides.
it('labels header card toolbars as "header", not "signup"', () => {
  const source = readFileSync('src/nodes/header/v2/HeaderNodeComponent.tsx', 'utf8')
  expect(source).not.toContain('data-inkling-card-toolbar="signup"')
  expect(source.match(/data-inkling-card-toolbar="header"/g)?.length).toBe(2)
})
