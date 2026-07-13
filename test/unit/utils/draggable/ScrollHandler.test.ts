import { afterEach, describe, expect, it } from 'vitest'

import { ScrollHandler } from '@/utils/draggable/ScrollHandler'

function getScrollingElement(): HTMLElement {
  return (document.scrollingElement || document.documentElement) as HTMLElement
}

describe('ScrollHandler', function () {
  afterEach(function () {
    document.body.innerHTML = ''
  })

  it('uses the Admin editor container by default when only the document scrolls', function () {
    const adminEditor = document.createElement('div')
    adminEditor.className = 'gh-inkling-editor'
    const target = document.createElement('div')
    adminEditor.appendChild(target)
    document.body.appendChild(adminEditor)

    const handler = new ScrollHandler()
    expect(handler.getScrollableElement(target)).toBe(adminEditor)
  })

  it('accepts a custom document scroll container selector', function () {
    const container = document.createElement('div')
    container.className = 'my-scroll-container'
    const target = document.createElement('div')
    container.appendChild(target)
    document.body.appendChild(container)

    const handler = new ScrollHandler({ documentScrollContainerSelector: '.my-scroll-container' })
    expect(handler.getScrollableElement(target)).toBe(container)
  })

  it('falls back to the document scrolling element when no container matches', function () {
    const target = document.createElement('div')
    document.body.appendChild(target)

    const handler = new ScrollHandler({ documentScrollContainerSelector: '.does-not-exist' })
    expect(handler.getScrollableElement(target)).toBe(getScrollingElement())
  })

  it('can disable the container override entirely', function () {
    const adminEditor = document.createElement('div')
    adminEditor.className = 'gh-inkling-editor'
    const target = document.createElement('div')
    document.body.appendChild(adminEditor)
    document.body.appendChild(target)

    const handler = new ScrollHandler({ documentScrollContainerSelector: null })
    expect(handler.getScrollableElement(target)).toBe(getScrollingElement())
  })
})
