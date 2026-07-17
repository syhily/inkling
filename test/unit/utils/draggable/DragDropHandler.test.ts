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
          source: null,
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

  it('constructs with provided editor container element', () => {
    const container = document.createElement('div')
    document.body.appendChild(container)
    const h = new DragDropHandler({ editorContainerElement: container })
    expect(h.editorContainerElement).toBe(container)
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

  async function initiateDrag(containerName: string) {
    const containerElement = createContainer(containerName)
    handler.registerContainer(containerElement, createHandlers())
    const draggable = containerElement.querySelector('.draggable') as HTMLElement

    const img = document.createElement('img')
    img.width = 100
    img.height = 100
    draggable.appendChild(img)

    const mouseDown = new MouseEvent('mousedown', {
      bubbles: true,
      clientX: 10,
      clientY: 10,
      button: 0,
    })
    draggable.dispatchEvent(mouseDown)

    const mouseMove = new MouseEvent('mousemove', {
      bubbles: true,
      clientX: 15,
      clientY: 15,
      button: 0,
    })
    document.dispatchEvent(mouseMove)

    // Allow the drag-start promise to resolve
    await new Promise((resolve) => {
      setTimeout(resolve, 50)
    })

    return { containerElement, draggable }
  }

  it('initiates drag on mouse down and move', async () => {
    await initiateDrag('drag')

    expect(handler.isDragging).toBe(true)

    const mouseUp = new MouseEvent('mouseup', { bubbles: true })
    document.dispatchEvent(mouseUp)

    expect(handler.isDragging).toBe(false)
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

  it('does not initiate drag on right click', async () => {
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

    const mouseMove = new MouseEvent('mousemove', {
      bubbles: true,
      clientX: 15,
      clientY: 15,
      button: 2,
    })
    document.dispatchEvent(mouseMove)

    await new Promise((resolve) => {
      setTimeout(resolve, 50)
    })

    expect(handler.isDragging).toBe(false)
  })

  it('does not initiate drag when drag disabled element is target', async () => {
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

    const mouseMove = new MouseEvent('mousemove', {
      bubbles: true,
      clientX: 15,
      clientY: 15,
      button: 0,
    })
    document.dispatchEvent(mouseMove)

    await new Promise((resolve) => {
      setTimeout(resolve, 50)
    })

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

    const mouseDown = new MouseEvent('mousedown', {
      bubbles: true,
      clientX: 10,
      clientY: 10,
      button: 0,
    })
    draggable.dispatchEvent(mouseDown)

    const mouseMove = new MouseEvent('mousemove', {
      bubbles: true,
      clientX: 15,
      clientY: 15,
      button: 0,
    })
    document.dispatchEvent(mouseMove)

    await new Promise((resolve) => {
      setTimeout(resolve, 50)
    })

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

    const mouseDown = new MouseEvent('mousedown', {
      bubbles: true,
      clientX: 10,
      clientY: 10,
      button: 0,
    })
    draggable.dispatchEvent(mouseDown)

    const mouseMove = new MouseEvent('mousemove', {
      bubbles: true,
      clientX: 15,
      clientY: 15,
      button: 0,
    })
    document.dispatchEvent(mouseMove)

    await new Promise((resolve) => {
      setTimeout(resolve, 50)
    })

    expect(editorRoot.dataset.inklingDragging).toBe('true')

    const mouseUp = new MouseEvent('mouseup', { bubbles: true })
    document.dispatchEvent(mouseUp)

    expect(editorRoot.dataset.inklingDragging).toBeUndefined()
  })
})
