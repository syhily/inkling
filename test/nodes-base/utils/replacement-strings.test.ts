import { JSDOM } from 'jsdom'

import {
  removeCodeWrappersFromHelpers,
  removeSpaces,
  wrapReplacementStrings,
} from '@/nodes/base/utils/replacement-strings'

describe('Utils: replacement-strings', function () {
  describe('removeSpaces', function () {
    it('collapses whitespace and newlines', function () {
      expect(removeSpaces('hello\n\n  world')).toBe('hello world')
    })

    it('trims leading and trailing whitespace', function () {
      expect(removeSpaces('  hello world  ')).toBe('hello world')
    })
  })

  describe('wrapReplacementStrings', function () {
    it('wraps simple replacement strings', function () {
      expect(wrapReplacementStrings('Hello {name}')).toBe('Hello %%{name}%%')
    })

    it('wraps replacement strings with quoted arguments', function () {
      expect(wrapReplacementStrings('Hello {name, "world"}')).toBe('Hello %%{name, "world"}%%')
    })

    it('does not wrap non-replacement text', function () {
      expect(wrapReplacementStrings('Hello world')).toBe('Hello world')
    })
  })

  describe('removeCodeWrappersFromHelpers', function () {
    let document: Document

    beforeAll(function () {
      document = new JSDOM().window.document
    })

    it('removes code wrappers around replacement strings', function () {
      const result = removeCodeWrappersFromHelpers('<code><span>{foo}</span></code>', document)
      expect(result).toBe('<span>{foo}</span>')
    })

    it('leaves non-helper code wrappers intact', function () {
      const result = removeCodeWrappersFromHelpers('<code>regular code</code>', document)
      expect(result).toBe('<code>regular code</code>')
    })
  })
})
