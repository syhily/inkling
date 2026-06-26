import Prettier from '@prettier/sync'
import { minify } from 'html-minifier'
import assert from 'node:assert/strict'
import should from 'should'

const minifyOpts = { collapseWhitespace: true, collapseInlineTagWhitespace: true }

;(
  should as unknown as { Assertion: { add(name: string, fn: (this: should.Assertion, str: string) => void): void } }
).Assertion.add('prettifyTo', function (this: should.Assertion, str: string) {
  const expected = Prettier.format(minify(str, minifyOpts), { parser: 'html' })

  const assertion = this as should.Assertion & { obj: unknown }
  assert.equal(typeof assertion.obj, 'string', 'expected a string')
  const result = Prettier.format(minify(assertion.obj as string, minifyOpts), { parser: 'html' })
  assert.equal(result, expected)
})
