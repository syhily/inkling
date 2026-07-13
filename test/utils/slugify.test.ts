import slugify, { slugify as namedSlugify } from '@/utils/slugify'

describe('slugify()', function () {
  it('handles non-string input', function () {
    slugify(null).should.eql('')
    slugify(undefined).should.eql('')
    slugify({}).should.eql('')
  })

  describe('<4.x markdown', function () {
    it('replaces all whitespace with empty string', function () {
      slugify('test one\ttwo', { inklingVersion: '2.0', type: 'markdown' }).should.eql('testonetwo')
    })

    it('uses the legacy slug for a 3.x patch version', function () {
      slugify('test one\ttwo', { inklingVersion: '3.9.1', type: 'markdown' }).should.eql('testonetwo')
      slugify('test one\ttwo', { inklingVersion: '3.9.1' }).should.eql('test-one-two')
    })

    it('replaces all "non-word" chars with empty string', function () {
      slugify('tést øne twö', { inklingVersion: '2.0', type: 'markdown' }).should.eql('tstnetw')
    })

    it('lower cases everything', function () {
      slugify('TÉST ÓNE TWÖ', { inklingVersion: '2.0', type: 'markdown' }).should.eql('tstnetw')
    })
  })

  describe('<4.x mobiledoc', function () {
    it('replaces all white space with "-"', function () {
      slugify('test one\ttwo', { inklingVersion: '3.0' }).should.eql('test-one-two')
    })

    it('replaces all "non-word" chars with "-"', function () {
      slugify('tést øne twö', { inklingVersion: '3.0' }).should.eql('t-st-ne-tw-')
    })

    it('collapses multiple "-"', function () {
      slugify('ñéïñ', { inklingVersion: '3.0' }).should.equal('-')
    })

    it('lower cases everything', function () {
      slugify('TEST ONE\tTWO', { inklingVersion: '3.0' }).should.eql('test-one-two')
    })
  })

  describe('4.x', function () {
    it('replaces all white space with "-"', function () {
      slugify('test one\t two').should.equal('test-one-two')
    })

    it('strips symbols', function () {
      slugify('test! one? {two}').should.equal('test-one-two')
    })

    it('%-encodes chars', function () {
      const slug = slugify('ñéïñ')

      slug.should.equal('%C3%B1%C3%A9%C3%AF%C3%B1')
      decodeURIComponent(slug).should.equal('ñéïñ')
    })

    it('removes leading/trailing "-" and collapses "-" groups', function () {
      slugify(' \ttest    one  two! \t').should.equal('test-one-two')
    })

    it('matches the named export for header-like input', function () {
      const input = 'Some Header!'
      const fromDefault = slugify(input)
      const fromNamed = namedSlugify(input)

      fromNamed.should.equal(fromDefault)
      fromNamed.should.equal('some-header')
    })

    it('uses the 4.x slug for 4.x versions and unparseable versions', function () {
      for (const inklingVersion of ['4.0', '4.2.0', 'dev']) {
        slugify('test one\t two', { inklingVersion }).should.equal('test-one-two')
      }
    })
  })
})
