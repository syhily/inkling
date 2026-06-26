import { JSDOM } from 'jsdom'

import {
  removeCodeWrappersFromHelpers,
  removeSpaces,
  wrapReplacementStrings,
} from '@/nodes/base/utils/replacement-strings'

describe('Utils: replacement-strings', function () {
  describe('removeSpaces', function () {
    it('collapses whitespace and newlines', function () {
      removeSpaces('hello\n\n  world').should.equal('hello world')
    })

    it('trims leading and trailing whitespace', function () {
      removeSpaces('  hello world  ').should.equal('hello world')
    })
  })

  describe('wrapReplacementStrings', function () {
    it('wraps simple replacement strings', function () {
      wrapReplacementStrings('Hello {name}').should.equal('Hello %%{name}%%')
    })

    it('wraps replacement strings with quoted arguments', function () {
      wrapReplacementStrings('Hello {name, "world"}').should.equal('Hello %%{name, "world"}%%')
    })

    it('does not wrap non-replacement text', function () {
      wrapReplacementStrings('Hello world').should.equal('Hello world')
    })
  })

  describe('removeCodeWrappersFromHelpers', function () {
    let document: Document

    beforeAll(function () {
      document = new JSDOM().window.document
    })

    it('removes code wrappers around replacement strings', function () {
      const result = removeCodeWrappersFromHelpers('<code><span>{foo}</span></code>', document)
      result.should.equal('<span>{foo}</span>')
    })

    it('leaves non-helper code wrappers intact', function () {
      const result = removeCodeWrappersFromHelpers('<code>regular code</code>', document)
      result.should.equal('<code>regular code</code>')
    })
  })
})
