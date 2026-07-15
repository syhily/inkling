import { getCardNodeClass, hasCardMenu } from '@/utils/inkling-node-class'

describe('inkling-node-class', () => {
  it('narrows classes that declare a static cardMenu', () => {
    const klass = getCardNodeClass({ cardMenu: { label: 'Image' } })
    expect(hasCardMenu(klass)).toBe(true)
    if (hasCardMenu(klass)) {
      expect(klass.cardMenu).toEqual({ label: 'Image' })
    }
  })

  it('accepts an array-shaped cardMenu', () => {
    expect(hasCardMenu(getCardNodeClass({ cardMenu: [{ label: 'A' }, { label: 'B' }] }))).toBe(true)
  })

  it('rejects classes without a cardMenu', () => {
    expect(hasCardMenu(getCardNodeClass({ uploadType: 'image' }))).toBe(false)
    expect(hasCardMenu(getCardNodeClass({}))).toBe(false)
    expect(hasCardMenu(getCardNodeClass({ cardMenu: undefined }))).toBe(false)
  })
})
