import { Color, textColorForBackgroundColor } from '@/utils/index'

describe('colorUtils', function () {
  describe('Color', function () {
    it('re-exports the Color library', function () {
      const c = Color('#ff0000')
      c.hex().should.equal('#FF0000')
    })

    it('constructs from RGB object', function () {
      Color({ r: 255, g: 255, b: 255 }).hex().should.equal('#FFFFFF')
    })
  })

  describe('textColorForBackgroundColor', function () {
    it('returns black for a light background', function () {
      textColorForBackgroundColor('#ffffff').hex().should.equal('#000000')
    })

    it('returns white for a dark background', function () {
      textColorForBackgroundColor('#000000').hex().should.equal('#FFFFFF')
    })

    it('returns white for a mid-dark background', function () {
      textColorForBackgroundColor('#333333').hex().should.equal('#FFFFFF')
    })

    it('returns white for the #cccccc Lab-b edge case', function () {
      // .b() returns the Lab b-channel, not RGB blue — preserved from upstream source
      textColorForBackgroundColor('#cccccc').hex().should.equal('#FFFFFF')
    })

    it('accepts a Color instance as input', function () {
      textColorForBackgroundColor(Color('#000000')).hex().should.equal('#FFFFFF')
    })
  })
})
