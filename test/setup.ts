import Prettier from '@prettier/sync'
import '@testing-library/jest-dom/vitest'
import { cleanup } from '@testing-library/react'
import { minify } from 'html-minifier-terser'
import assert from 'node:assert/strict'
import should from 'should'
import { afterEach } from 'vitest'

// jsdom does not implement ResizeObserver, but several components depend on it.
function MockResizeObserver() {}
MockResizeObserver.prototype.observe = () => {}
MockResizeObserver.prototype.unobserve = () => {}
MockResizeObserver.prototype.disconnect = () => {}
globalThis.ResizeObserver = MockResizeObserver as unknown as typeof ResizeObserver

// IntersectionObserver is also absent from jsdom and may be required by lazy loaders.
function MockIntersectionObserver() {}
MockIntersectionObserver.prototype.observe = () => {}
MockIntersectionObserver.prototype.unobserve = () => {}
MockIntersectionObserver.prototype.disconnect = () => {}
MockIntersectionObserver.prototype.takeRecords = () => []
globalThis.IntersectionObserver = MockIntersectionObserver as unknown as typeof IntersectionObserver

// should global
const shouldModule = should as unknown as { noConflict(): typeof should; extend(): void }
Object.defineProperty(globalThis, 'should', {
  value: shouldModule.noConflict(),
  writable: true,
  configurable: true,
})
shouldModule.extend()

afterEach(() => {
  cleanup()
})

// prettifyTo custom assertion (from default-nodes test-utils)
const minifyOpts = { collapseWhitespace: true, collapseInlineTagWhitespace: true }
;(
  should as unknown as { Assertion: { add(name: string, fn: (this: should.Assertion, str: string) => void): void } }
).Assertion.add('prettifyTo', async function (this: should.Assertion, str: string) {
  const expected = Prettier.format(await minify(str, minifyOpts), { parser: 'html' })
  const assertion = this as should.Assertion & { obj: unknown }
  assert.equal(typeof assertion.obj, 'string', 'expected a string')
  const result = Prettier.format(await minify(assertion.obj as string, minifyOpts), { parser: 'html' })
  assert.equal(result, expected)
})
