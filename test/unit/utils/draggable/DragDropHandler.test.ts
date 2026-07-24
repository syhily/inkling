import { beforeEach, describe, expect, it, vi } from 'vitest'

import { DragDropHandler } from '@/utils/draggable/DragDropHandler'
import { CONTAINER_DATA_ATTR, DROP_INDICATOR_ID, INKLING_CONTAINER_ID } from '@/utils/draggable/draggable-constants'

function createContainer(name = 'container') {
  const element = document.createElement('div')
  element.dataset[CONTAINER_DATA_ATTR] = 'true'
  element.innerHTML = `
    <div class="draggable" data-type="card" data-testid="${name}-draggable">Draggable</div>
    <div class="droppable" data-testid="${name}-droppable">Droppable</div>
  `
  document.body.appendChild(element)
  return element
}

function createHandlers() {
  return {
    draggable: {
      getDraggableInfo: vi.fn((element: HTMLElement | null) => {
        if (!element) {
          return false
        }
        return {
          type: 'image',
          element,
          target: null,
          mousePosition: { x: 0, y: 0 },
          dataset: {},
        }
      }),
      draggableSelector: '.draggable',
    },
    droppable: {
      onDrop: vi.fn().mockReturnValue(true),
      getIndicatorPosition: vi.fn().mockReturnValue(false),
      droppableSelector: '.droppable',
      onDragEnterContainer: vi.fn(),
      onDragEnterDroppable: vi.fn(),
      onDragOverDroppable: vi.fn(),
      onDragLeaveDroppable: vi.fn(),
      onDragLeaveContainer: vi.fn(),
    },
    lifecycle: {
      onDragStart: vi.fn(),
      onDragEnd: vi.fn(),
      onDropEnd: vi.fn(),
    },
  }
}

describe('DragDropHandler', () => {
  let handler: DragDropHandler
  const originalElementFromPoint = document.elementFromPoint

  beforeEach(() => {
    document.body.innerHTML = ''
    document.elementFromPoint = vi.fn(() => null)
    handler = new DragDropHandler()
  })

  afterEach(() => {
    document.elementFromPoint = originalElementFromPoint
    handler.destroy()
    document.body.innerHTML = ''
  })

  it('constructs with default editor container selector', () => {
    const h = new DragDropHandler()
    expect(h.editorContainerElement).toBeNull()
    h.destroy()
  })

  it('finds the default editor container through the real Inkling root attribute', () => {
    const inklingRoot = document.createElement('div')
    inklingRoot.dataset.inkling = 'editor'
    const lexicalRoot = document.createElement('div')
    lexicalRoot.setAttribute('data-lexical-editor', 'true')
    inklingRoot.appendChild(lexicalRoot)
    document.body.appendChild(inklingRoot)

    const h = new DragDropHandler()

    expect(h.editorContainerElement).toBe(lexicalRoot)
    h.destroy()
  })

  it('constructs with provided editor container element', () => {
    const container = document.createElement('div')
    document.body.appendChild(container)
    const h = new DragDropHandler({ editorContainerElement: container })
    expect(h.editorContainerElement).toBe(container)
    h.destroy()
  })

  it('forwards scrollHandlerOptions to its ScrollHandler', () => {
    const scrollContainer = document.createElement('div')
    scrollContainer.className = 'my-scroll-container'
    const target = document.createElement('div')
    scrollContainer.appendChild(target)
    document.body.appendChild(scrollContainer)

    const h = new DragDropHandler({ scrollHandlerOptions: { documentScrollContainerSelector: '.my-scroll-container' } })

    expect(h.scrollHandler.getScrollableElement(target)).toBe(scrollContainer)
    h.destroy()
  })

  it('registers and destroys containers', () => {
    const containerElement = createContainer('register')
    const handlers = createHandlers()

    const api = handler.registerContainer(containerElement, handlers)
    expect(handler.containers).toHaveLength(1)

    api.destroy()
    expect(handler.containers).toHaveLength(0)
  })

  it('enables and disables drag on registered container', () => {
    const containerElement = createContainer('enable')
    const handlers = createHandlers()

    const api = handler.registerContainer(containerElement, handlers)
    expect(containerElement.dataset.inklingDndContainer).toBe('true')

    api.disableDrag()
    expect(containerElement.dataset.inklingDndContainer).toBeUndefined()

    api.enableDrag()
    expect(containerElement.dataset.inklingDndContainer).toBe('true')
  })

  it('cleans up all containers', () => {
    const containerElement = createContainer('cleanup')
    handler.registerContainer(containerElement, createHandlers())

    handler.cleanup()
    expect(handler.containers).toHaveLength(0)
  })

  it('appends drag preview container element on construction', () => {
    const container = document.createElement('div')
    document.body.appendChild(container)
    const h = new DragDropHandler({ editorContainerElement: container })
    expect(document.getElementById(INKLING_CONTAINER_ID)).toBeInTheDocument()
    h.destroy()
  })

  it('removes drag preview container on destroy', () => {
    handler.destroy()
    expect(document.getElementById(INKLING_CONTAINER_ID)).not.toBeInTheDocument()
  })

  // the handler's test seam: performs the mousedown grab and resolves the
  // drag-start wait synchronously — no real mousemove choreography, no
  // wall-clock sleeps
  async function initiateDrag(containerName: string) {
    const containerElement = createContainer(containerName)
    handler.registerContainer(containerElement, createHandlers())
    const draggable = containerElement.querySelector('.draggable') as HTMLElement

    const img = document.createElement('img')
    img.width = 100
    img.height = 100
    draggable.appendChild(img)

    await handler.simulateDrag(draggable)

    return { containerElement, draggable }
  }

  it('initiates drag on mouse down and move', async () => {
    await initiateDrag('drag')

    expect(handler.isDragging).toBe(true)

    const mouseUp = new MouseEvent('mouseup', { bubbles: true })
    document.dispatchEvent(mouseUp)

    expect(handler.isDragging).toBe(false)
  })

  it('clears drag information when a drag resets', async () => {
    await initiateDrag('reset-info')

    expect(handler.draggableInfo).not.toBeNull()

    document.dispatchEvent(new MouseEvent('mouseup', { bubbles: true }))

    expect(handler.draggableInfo).toBeNull()
  })

  it('recomputes the indicator when consecutive drags cross the same droppable quadrant', async () => {
    const editorContainer = document.createElement('div')
    document.body.appendChild(editorContainer)
    handler.destroy()
    handler = new DragDropHandler({ editorContainerElement: editorContainer })

    const containerElement = createContainer('consecutive')
    const draggable = containerElement.querySelector<HTMLElement>('.draggable')
    const droppable = containerElement.querySelector<HTMLElement>('.droppable')
    if (!draggable || !droppable) {
      throw new Error('Expected draggable test elements')
    }

    const image = document.createElement('img')
    image.width = 100
    image.height = 100
    draggable.appendChild(image)

    const handlers = createHandlers()
    handlers.droppable.getIndicatorPosition.mockReturnValueOnce({ insertIndex: 1 })
    handlers.droppable.getIndicatorPosition.mockReturnValueOnce({ insertIndex: 2 })
    handler.registerContainer(containerElement, handlers)
    document.elementFromPoint = vi.fn(() => droppable)

    await handler.simulateDrag(draggable)
    expect(handler.draggableInfo?.insertIndex).toBe(1)
    document.dispatchEvent(new MouseEvent('mouseup', { bubbles: true }))

    await handler.simulateDrag(draggable)

    expect(handlers.droppable.getIndicatorPosition).toHaveBeenCalledTimes(2)
    expect(handler.draggableInfo?.insertIndex).toBe(2)
  })

  it('cancels drag on escape key', async () => {
    await initiateDrag('escape')

    expect(handler.isDragging).toBe(true)

    const escapeEvent = new KeyboardEvent('keydown', { key: 'Escape', bubbles: true })
    document.dispatchEvent(escapeEvent)

    expect(handler.isDragging).toBe(false)
  })

  it('removes the temporary keydown listener when a drag resets', async () => {
    const removeSpy = vi.spyOn(document, 'removeEventListener')

    await initiateDrag('keydown-reset')
    expect(handler.isDragging).toBe(true)

    document.dispatchEvent(new MouseEvent('mouseup', { bubbles: true }))

    expect(removeSpy).toHaveBeenCalledWith('keydown', expect.any(Function))
    removeSpy.mockRestore()
  })

  it('removes the keydown listener when destroyed mid-drag', async () => {
    const removeSpy = vi.spyOn(document, 'removeEventListener')

    await initiateDrag('keydown-destroy')
    expect(handler.isDragging).toBe(true)

    handler.destroy()

    expect(removeSpy).toHaveBeenCalledWith('keydown', expect.any(Function))
    removeSpy.mockRestore()
  })

  it('does not initiate drag on right click', () => {
    const containerElement = createContainer('rightclick')
    handler.registerContainer(containerElement, createHandlers())
    const draggable = containerElement.querySelector('.draggable') as HTMLElement

    const mouseDown = new MouseEvent('mousedown', {
      bubbles: true,
      clientX: 10,
      clientY: 10,
      button: 2,
    })
    draggable.dispatchEvent(mouseDown)

    expect(handler.isDragging).toBe(false)
  })

  it('ignores non-Element mouse targets', () => {
    const event = new MouseEvent('mousedown', { button: 0 })
    Object.defineProperty(event, 'target', { value: document.createTextNode('text') })

    expect(() => handler._onMouseDown(event)).not.toThrow()
    expect(handler.grabbedElement).toBeNull()
  })

  it('does not initiate drag when drag disabled element is target', () => {
    const containerElement = createContainer('dragdisabled')
    handler.registerContainer(containerElement, createHandlers())
    const draggable = containerElement.querySelector('.draggable') as HTMLElement

    const dragDisabled = document.createElement('div')
    dragDisabled.dataset.inklingDndDisabled = 'true'
    draggable.appendChild(dragDisabled)

    const mouseDown = new MouseEvent('mousedown', {
      bubbles: true,
      clientX: 10,
      clientY: 10,
      button: 0,
    })
    dragDisabled.dispatchEvent(mouseDown)

    expect(handler.isDragging).toBe(false)
  })

  it('appends drop indicator when drag starts', async () => {
    const containerElement = createContainer('indicator')
    const editorContainer = document.createElement('div')
    editorContainer.dataset.inklingEditor = 'true'
    const lexicalEditor = document.createElement('div')
    lexicalEditor.dataset.lexicalEditor = 'true'
    editorContainer.appendChild(lexicalEditor)
    document.body.appendChild(editorContainer)

    handler.destroy()
    handler = new DragDropHandler({ editorContainerElement: editorContainer })
    handler.registerContainer(containerElement, createHandlers())

    const draggable = containerElement.querySelector('.draggable') as HTMLElement
    const img = document.createElement('img')
    img.width = 100
    img.height = 100
    draggable.appendChild(img)

    await handler.simulateDrag(draggable)

    expect(document.getElementById(DROP_INDICATOR_ID)).toBeInTheDocument()

    const mouseUp = new MouseEvent('mouseup', { bubbles: true })
    document.dispatchEvent(mouseUp)
  })

  it('toggles hover suppression attribute on the editor root during drag', async () => {
    const containerElement = createContainer('hover-suppression')
    const editorRoot = document.createElement('div')
    editorRoot.dataset.inkling = 'editor'
    const lexicalEditor = document.createElement('div')
    lexicalEditor.dataset.lexicalEditor = 'true'
    editorRoot.appendChild(lexicalEditor)
    document.body.appendChild(editorRoot)

    handler.destroy()
    handler = new DragDropHandler({ editorContainerElement: lexicalEditor })
    handler.registerContainer(containerElement, createHandlers())

    const draggable = containerElement.querySelector('.draggable') as HTMLElement
    const img = document.createElement('img')
    img.width = 100
    img.height = 100
    draggable.appendChild(img)

    await handler.simulateDrag(draggable)

    expect(editorRoot.dataset.inklingDragging).toBe('true')

    const mouseUp = new MouseEvent('mouseup', { bubbles: true })
    document.dispatchEvent(mouseUp)

    expect(editorRoot.dataset.inklingDragging).toBeUndefined()
  })
})
