import EventEmitter from 'eventemitter3'

import { ActiveDrag } from '@/utils/draggable/ActiveDrag'
import { DragDropContainer, type DraggableInfo, type DroppablePosition } from '@/utils/draggable/DragDropContainer'
import {
  CONTAINER_SELECTOR,
  DRAGGABLE_SELECTOR,
  DRAG_DISABLED_SELECTOR,
  DROPPABLE_SELECTOR,
  DROP_INDICATOR_ID,
  DROP_INDICATOR_ZINDEX,
  INKLING_ZINDEX,
  INKLING_CONTAINER_ID,
} from '@/utils/draggable/draggable-constants'
import { applyUserSelect, getParent } from '@/utils/draggable/draggable-utils'
import { ScrollHandler } from '@/utils/draggable/ScrollHandler'

interface EventHandlerEntry {
  handler: (e: Event) => void
  options?: AddEventListenerOptions | boolean
}

export interface DraggableContainerHandle {
  enableDrag: () => void
  disableDrag: () => void
  refresh: () => void
  destroy: () => void
}

export class DragDropHandler {
  eventEmitter: EventEmitter
  editorContainerElement: HTMLElement | null = null
  containers: DragDropContainer[] = []
  // grab-phase state: set on mousedown, consumed (or discarded) when the drag
  // start threshold is met — everything the initiated drag owns lives in
  // _activeDrag instead
  grabbedElement: HTMLElement | null = null
  sourceContainer: DragDropContainer | null = null
  scrollHandler: ScrollHandler

  _activeDrag: ActiveDrag | null = null
  _dropIndicator: HTMLElement | null = null
  _eventHandlers: Record<string, EventHandlerEntry> = {}
  _dragPreviewContainerElement: HTMLElement | null = null
  _rafUpdateDragPreviewElementPosition: () => void
  _waitForDragStartPromise: Promise<void> | null = null

  isDragging: boolean = false

  // the in-flight drag's info; null between drags. Kept as an accessor so the
  // handler's external interface survives the ActiveDrag collapse
  get draggableInfo(): DraggableInfo | null {
    return this._activeDrag?.draggableInfo ?? null
  }

  // lifecycle ---------------------------------------------------------------

  constructor({ editorContainerElement }: { editorContainerElement?: HTMLElement } = {}) {
    this.editorContainerElement =
      editorContainerElement ?? document.querySelector('[data-inkling="editor"] [data-lexical-editor]')
    this.containers = []
    this.scrollHandler = new ScrollHandler()

    // bind any raf handler functions
    this._rafUpdateDragPreviewElementPosition = this._updateDragPreviewElementPosition.bind(this)

    // set up document event listeners
    this._addGrabListeners()

    // append body elements
    this._appendDragPreviewContainerElement()

    this.eventEmitter = new EventEmitter()
  }

  destroy() {
    // reset any on-going drag and remove any temporary listeners
    this.cleanup()

    // clean up document event listeners
    this._removeGrabListeners()

    // remove body elements
    this._removeDropIndicator()
    this._removeDragPreviewContainerElement()
  }

  // interface ---------------------------------------------------------------

  registerContainer(
    element: HTMLElement,
    options: ConstructorParameters<typeof DragDropContainer>[1],
  ): DraggableContainerHandle {
    const container = new DragDropContainer(element, options)
    this.containers.push(container)

    // return a minimal interface to the container because this class
    // should be used for management rather than the container class instance
    return {
      enableDrag: () => {
        container.enableDrag()
      },

      disableDrag: () => {
        container.disableDrag()
      },

      refresh: () => {
        // re-calculate draggables/droppables
        container.refresh()
      },

      destroy: () => {
        // unregister container
        container.disableDrag()
        this.containers = this.containers.filter((c) => c !== container)
      },
    }
  }

  // remove all containers and event handlers, useful when leaving an editor route
  cleanup() {
    this.containers.forEach((container) => container.disableDrag())
    this.containers = []
    // cancel any tasks and remove intermittent event handlers
    this._resetDrag()
  }

  // test seam: runs the grab → drag-start choreography synchronously so unit
  // tests don't re-create it with real mousedown/mousemove sequences and
  // wall-clock sleeps. Dispatches a real mousedown (the grab path runs
  // end-to-end), then resolves the drag-start wait immediately. Resolves once
  // the drag has been initiated — or immediately when the grab never started
  // a wait (right click, drag-disabled target, drag already in progress)
  async simulateDrag(element: HTMLElement, start: { x: number; y: number } = { x: 10, y: 10 }): Promise<void> {
    element.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, clientX: start.x, clientY: start.y, button: 0 }))

    const pending = this._waitForDragStartPromise
    if (!pending) {
      return
    }

    this.eventEmitter.emit('drag-start-conditions-met')
    // the _onMouseDown continuation that calls _initiateDrag is attached to
    // this promise before our await, so initiation has completed by the time
    // simulateDrag resolves
    await pending.catch(() => {})
  }

  // event handlers ----------------------------------------------------------

  // we use a custom "drag" detection rather than native drag events because it
  // allows better tracking across multiple containers and gives more flexibility
  // for handling touch events later if required
  _onMouseDown(event: MouseEvent) {
    if (!this.isDragging && event.button === 0) {
      const target = event.target instanceof Element ? event.target : null
      const grabbedElement = getParent(target, DRAGGABLE_SELECTOR)
      this.grabbedElement = grabbedElement instanceof HTMLElement ? grabbedElement : null

      if (this.grabbedElement) {
        // some elements may have explicitly disabled dragging such as
        // captions where we want to allow text selection instead
        const dragDisabledElement = getParent(target, DRAG_DISABLED_SELECTOR)
        if (dragDisabledElement && this.grabbedElement.contains(dragDisabledElement)) {
          return
        }

        const containerElement = getParent(this.grabbedElement, CONTAINER_SELECTOR)
        const container = this.containers.find((c) => c.element === containerElement)
        this.sourceContainer = container ?? null

        if (container?.isDragEnabled) {
          this._waitForDragStart(event)
            .then(() => {
              // stop the drag creating a selection
              window.getSelection()?.removeAllRanges()
              // set up the drag details
              this._initiateDrag(event)
            })
            .catch((reason: { isCanceled?: boolean }) => {
              if (!reason.isCanceled) {
                throw reason
              }
            })
        }
      }
    }
  }

  _onMouseMove(event: MouseEvent) {
    event.preventDefault()

    if (this.draggableInfo) {
      this.draggableInfo.mousePosition.x = event.clientX
      this.draggableInfo.mousePosition.y = event.clientY

      this._handleDrag(event)
    }
  }

  _onMouseUp() {
    const drag = this._activeDrag
    if (drag) {
      let success = false
      let sourceHandled = false
      const dropTarget = drag.overContainer

      if (dropTarget) {
        const result = dropTarget.onDrop(drag.draggableInfo, drag.overDroppableElem, drag.overDroppablePosition)
        if (typeof result === 'boolean') {
          success = result
        } else {
          success = result.success
          sourceHandled = result.sourceHandled ?? false
        }
      }

      this.containers.forEach((container) => {
        // the sourceHandled report belongs to the drop target alone — every
        // other container must still remove its source on a successful drop
        container.onDropEnd(drag.draggableInfo, success, sourceHandled && container === dropTarget)
      })
    }

    // dispose the drag and any drag preview element
    this._resetDrag()
  }

  // cancel drag on escape
  _onKeyDown(event: KeyboardEvent) {
    if (this.isDragging && event.key === 'Escape') {
      this._resetDrag()
    }
  }

  // private -----------------------------------------------------------------

  // called when we detect a mousedown event on a draggable element. Sets
  // up temporary event handlers for mousemove, mouseup, and drag. If
  // sufficient movement is detected before the mouse is released and we don't
  // detect a native drag event then the promise will resolve. Mouseup or drag
  // events will cancel the promise which will result in a rejection with {isCanceled: true}
  async _waitForDragStart(startEvent: MouseEvent) {
    const moveThreshold = 1

    // if we somehow already have a waiting promise, cancel it and keep the new one
    if (this._waitForDragStartPromise) {
      this.eventEmitter.emit('drag-start-canceled')
      this._waitForDragStartPromise = null
    }

    const onMove = (event: MouseEvent) => {
      const currentX = event.clientX
      const currentY = event.clientY

      if (
        Math.abs(startEvent.clientX - currentX) > moveThreshold ||
        Math.abs(startEvent.clientY - currentY) > moveThreshold
      ) {
        this.eventEmitter.emit('drag-start-conditions-met')
      }
    }

    const onUp = () => {
      this.eventEmitter.emit('drag-start-canceled')
    }

    const onHtmlDrag = () => {
      this.eventEmitter.emit('drag-start-canceled')
    }

    const waitForDragStart = () => {
      document.addEventListener('mousemove', onMove, { passive: false })
      document.addEventListener('mouseup', onUp, { passive: false })
      document.addEventListener('drag', onHtmlDrag, { passive: false })

      return new Promise<void>((resolve, reject) => {
        const conditionsMet = () => {
          this.eventEmitter.removeListener('drag-start-canceled', canceled)
          resolve()
        }

        const canceled = () => {
          this.eventEmitter.removeListener('drag-start-conditions-met', conditionsMet)
          reject({ isCanceled: true })
        }

        this.eventEmitter.once('drag-start-conditions-met', conditionsMet)
        this.eventEmitter.once('drag-start-canceled', canceled)
      })
    }

    const promise = waitForDragStart()
    this._waitForDragStartPromise = promise.finally(() => {
      this._waitForDragStartPromise = null

      document.removeEventListener('mousemove', onMove)
      document.removeEventListener('mouseup', onUp)
      document.removeEventListener('drag', onHtmlDrag)
    })

    return this._waitForDragStartPromise
  }

  // called once drag start conditions have been met, `startEvent` is the initial mousedown event
  _initiateDrag(startEvent: MouseEvent) {
    this.isDragging = true
    applyUserSelect(document.body, 'none')

    if (!this.sourceContainer) {
      this._resetDrag()
      return
    }

    const initialDraggableInfo = this.sourceContainer.getDraggableInfo(this.grabbedElement)

    if (!initialDraggableInfo) {
      this._resetDrag()
      return
    }

    // append the drop indicator if it doesn't already exist - we append to
    // the editor's element rather than body so it needs to be re-appended
    // each time a drag is initiated in a new editor instance
    this._appendDropIndicator()

    const draggableInfo: DraggableInfo = {
      ...initialDraggableInfo,
      element: this.grabbedElement,
      mousePosition: {
        x: startEvent.clientX,
        y: startEvent.clientY,
      },
    }

    // one object owns everything this drag creates — its listeners included —
    // so reset is disposal rather than a field-nulling checklist
    const activeDrag = new ActiveDrag({
      draggableInfo,
      listeners: {
        onMouseMove: (event) => this._onMouseMove(event),
        onMouseUp: () => this._onMouseUp(),
        onKeyDown: (event) => this._onKeyDown(event),
      },
    })
    this._activeDrag = activeDrag

    this.containers.forEach((container) => {
      container.onDragStart(draggableInfo)
    })

    // style the dragged element
    if (draggableInfo.element) {
      draggableInfo.element.style.opacity = '0.5'
    }

    // create the drag preview element and cache its position to avoid costly
    // getBoundingClientRect calls in the mousemove handler
    const dragPreview = this.sourceContainer.createDragPreviewElement(draggableInfo)
    if (dragPreview) {
      this._dragPreviewContainerElement?.appendChild(dragPreview.element)
      const dragPreviewElementRect = dragPreview.element.getBoundingClientRect()
      activeDrag.dragPreviewInfo = {
        element: dragPreview.element,
        dispose: dragPreview.dispose,
        positionX: dragPreviewElementRect.x,
        positionY: dragPreviewElementRect.y,
      }
    } else {
      this._resetDrag()
      return
    }

    // start drag preview element following the mouse
    requestAnimationFrame(this._rafUpdateDragPreviewElementPosition)

    // let the scroll handler select the scrollable element
    this.scrollHandler.dragStart(draggableInfo)

    // prevent the pointer showing the text caret over text content whilst dragging
    document.querySelectorAll<HTMLElement>('[data-inkling="editor"] [data-lexical-editor]').forEach((el) => {
      el.style.setProperty('cursor', 'default', 'important')
    })

    // prevent hover effects showing whilst dragging
    this._setHoverSuppression(true)

    this._handleDrag()
  }

  _setHoverSuppression(suppress: boolean) {
    const editorRoot =
      this.editorContainerElement?.closest('[data-inkling="editor"]') ||
      document.querySelector('[data-inkling="editor"]')
    if (editorRoot) {
      if (suppress) {
        editorRoot.setAttribute('data-inkling-dragging', 'true')
      } else {
        editorRoot.removeAttribute('data-inkling-dragging')
      }
    }
  }

  // called when mouse moves whilst a drag is in progress
  _handleDrag(_event?: MouseEvent) {
    const drag = this._activeDrag
    if (!drag || !this._dragPreviewContainerElement) {
      return
    }
    const { draggableInfo } = drag

    // hide the drag preview element so that it's not picked up by elementFromPoint
    // when determining the target element under the mouse
    this._dragPreviewContainerElement.hidden = true
    const target = document.elementFromPoint(draggableInfo.mousePosition.x, draggableInfo.mousePosition.y)
    draggableInfo.target = target instanceof HTMLElement ? target : null
    this._dragPreviewContainerElement.hidden = false

    this.scrollHandler.dragMove(draggableInfo)

    const overContainerElem = getParent(target, CONTAINER_SELECTOR)
    let overDroppableElem: Element | null = getParent(target, DROPPABLE_SELECTOR)

    // it's possible for the mouse to be over a "dead" area when dragging over
    // the position indicator, in this case we want to prevent a parent
    // container's droppable from being picked up
    if (!overContainerElem || !overContainerElem.contains(overDroppableElem)) {
      overDroppableElem = null
    }

    const currentOverDroppableElem = drag.overDroppableElem
    const isLeavingContainer = drag.overContainerElem !== null && overContainerElem !== drag.overContainerElem
    const isLeavingDroppable = currentOverDroppableElem !== null && overDroppableElem !== currentOverDroppableElem
    const isOverContainer = overContainerElem !== null && overContainerElem !== drag.overContainerElem

    if (isLeavingContainer && drag.overContainer) {
      drag.overContainer.onDragLeaveContainer(draggableInfo)
      drag.overContainer = null
      drag.overContainerElem = null
      this._hideDropIndicator()
    }

    if (isOverContainer) {
      const container = this.containers.find((c) => c.element === overContainerElem)
      if (!drag.overContainer && container) {
        container.onDragEnterContainer(draggableInfo)
      }

      drag.overContainer = container ?? null
      drag.overContainerElem = overContainerElem
    }

    if (isLeavingDroppable && drag.overContainer && currentOverDroppableElem) {
      drag.overContainer.onDragLeaveDroppable(currentOverDroppableElem)
      drag.overDroppableElem = null
    }

    if (overDroppableElem instanceof HTMLElement) {
      // get position within the droppable
      const rect = overDroppableElem.getBoundingClientRect()
      const inTop = draggableInfo.mousePosition.y < rect.y + rect.height / 2
      const inLeft = draggableInfo.mousePosition.x < rect.x + rect.width / 2
      const position: DroppablePosition = `${inTop ? 'top' : 'bottom'}-${inLeft ? 'left' : 'right'}`

      if (!drag.overDroppableElem && drag.overContainer) {
        drag.overContainer.onDragEnterDroppable(overDroppableElem, position)
      }

      if (overDroppableElem !== drag.overDroppableElem || position !== drag.overDroppablePosition) {
        drag.overDroppableElem = overDroppableElem
        drag.overDroppablePosition = position
        if (drag.overContainer) {
          drag.overContainer.onDragOverDroppable(overDroppableElem, position)
        }

        // container.getIndicatorPosition returns false if the drop is not allowed
        const indicatorPosition = drag.overContainer?.getIndicatorPosition(draggableInfo, overDroppableElem, position)
        if (indicatorPosition) {
          draggableInfo.insertIndex = indicatorPosition.insertIndex
          this._showDropIndicator()
        } else {
          this._hideDropIndicator()
        }
      }
    }
  }

  _updateDragPreviewElementPosition() {
    if (this.isDragging) {
      requestAnimationFrame(this._rafUpdateDragPreviewElementPosition)
    }

    const drag = this._activeDrag
    if (drag?.dragPreviewInfo) {
      const { dragPreviewInfo, draggableInfo } = drag
      const left = dragPreviewInfo.positionX * -1 + draggableInfo.mousePosition.x
      const top = dragPreviewInfo.positionY * -1 + draggableInfo.mousePosition.y
      dragPreviewInfo.element.style.transform = `translate3d(${left}px, ${top}px, 0)`
    }
  }

  // position the drop indicator relative to the current droppable.
  // The visual position is derived from the current droppable and its quadrant.
  _showDropIndicator() {
    const dropIndicator = this._dropIndicator
    const drag = this._activeDrag
    if (!dropIndicator || !drag) {
      return
    }

    // reset everything except insertIndex before re-displaying indicator
    this._hideDropIndicator({ clearInsertIndex: false })

    const droppable = drag.overDroppableElem
    const position = drag.overDroppablePosition
    if (!droppable || !position) {
      return
    }

    const parent = dropIndicator.parentElement
    if (!parent) {
      return
    }

    const parentRect = parent.getBoundingClientRect()
    const lastLeft = parseInt(dropIndicator.style.left, 10) || 0
    const lastTop = parseInt(dropIndicator.style.top, 10) || 0

    const newWidth = droppable.offsetWidth
    const newHeight = 4
    let newLeft = droppable.offsetLeft
    let newTop = position.startsWith('top') ? droppable.offsetTop - 2 : droppable.offsetTop + droppable.offsetHeight - 2

    newLeft -= parentRect.left
    newTop -= parentRect.top

    // if indicator hasn't moved, keep it showing, otherwise wait for
    // the transform transitions to almost finish before re-positioning
    // and showing
    // NOTE: +- 1px is due to sub-pixel positioning of droppables
    if (newTop >= lastTop - 1 && newTop <= lastTop + 1 && newLeft >= lastLeft - 1 && newLeft <= lastLeft + 1) {
      dropIndicator.style.opacity = '1'
    } else {
      dropIndicator.style.opacity = '0'

      drag.dropIndicatorTimeout = setTimeout(() => {
        dropIndicator.style.width = `${newWidth}px`
        dropIndicator.style.height = `${newHeight}px`
        dropIndicator.style.left = `${newLeft}px`
        dropIndicator.style.top = `${newTop}px`
        dropIndicator.style.opacity = '1'
      }, 150)
    }
  }

  _hideDropIndicator({ clearInsertIndex = true }: { clearInsertIndex?: boolean } = {}) {
    const drag = this._activeDrag

    // make sure the indicator isn't shown due to a running timeout
    if (drag?.dropIndicatorTimeout) {
      clearTimeout(drag.dropIndicatorTimeout)
      drag.dropIndicatorTimeout = null
    }

    // clear droppable insert index unless instructed not to (eg, when
    // resetting the display before re-positioning the indicator)
    if (clearInsertIndex && drag) {
      delete drag.draggableInfo.insertIndex
    }

    // hide drop indicator
    if (this._dropIndicator) {
      this._dropIndicator.style.opacity = '0'
    }
  }

  _resetDrag() {
    this.eventEmitter.emit('drag-start-canceled')
    this._hideDropIndicator()

    this.scrollHandler.dragStop()

    if (this.grabbedElement) {
      this.grabbedElement.style.opacity = ''
    }

    this.isDragging = false
    this.grabbedElement = null
    this.sourceContainer = null

    // disposal owns the whole per-drag teardown: listeners, indicator
    // timeout, drag preview (element removal + producer dispose hook)
    const activeDrag = this._activeDrag
    this._activeDrag = null
    activeDrag?.dispose()

    this.containers.forEach((container) => {
      container.onDragEnd()
    })

    this._setHoverSuppression(false)

    applyUserSelect(document.body, '')
    document.querySelectorAll<HTMLElement>('[data-inkling="editor"] [data-lexical-editor]').forEach((el) => {
      el.style.cursor = ''
    })
  }

  _appendDropIndicator() {
    let dropIndicator = document.querySelector<HTMLElement>(`#${DROP_INDICATOR_ID}`)
    if (!dropIndicator) {
      dropIndicator = document.createElement('div')
      dropIndicator.id = DROP_INDICATOR_ID
      // "rounded-full bg-green" kept as classes so Tailwind picks up usage
      dropIndicator.className = 'rounded-full bg-green'
      dropIndicator.style.position = 'absolute'
      dropIndicator.style.opacity = '0'
      dropIndicator.style.width = '4px'
      dropIndicator.style.height = '0'
      dropIndicator.style.zIndex = String(DROP_INDICATOR_ZINDEX)
      dropIndicator.style.pointerEvents = 'none'

      if (this.editorContainerElement) {
        this.editorContainerElement.appendChild(dropIndicator)
      }
    }

    this._dropIndicator = dropIndicator
  }

  _removeDropIndicator() {
    this._dropIndicator?.remove()
  }

  _appendDragPreviewContainerElement() {
    if (!this._dragPreviewContainerElement && this.editorContainerElement) {
      const dragPreviewContainerElement = document.createElement('div')
      dragPreviewContainerElement.id = INKLING_CONTAINER_ID
      dragPreviewContainerElement.style.position = 'fixed'
      dragPreviewContainerElement.style.width = '100%'
      dragPreviewContainerElement.style.zIndex = String(INKLING_ZINDEX)

      this.editorContainerElement.appendChild(dragPreviewContainerElement)

      this._dragPreviewContainerElement = dragPreviewContainerElement
    }
  }

  _removeDragPreviewContainerElement() {
    this._dragPreviewContainerElement?.remove()
  }

  // the grab (mousedown) listener is the handler's only permanent listener;
  // the per-drag move/release/escape listeners live on ActiveDrag
  _addGrabListeners() {
    this._addEventListener('mousedown', this._onMouseDown, { passive: false })
  }

  _removeGrabListeners() {
    this._removeEventListener('mousedown')
  }

  _addEventListener<K extends keyof DocumentEventMap>(
    e: K,
    method: (event: DocumentEventMap[K]) => void,
    options?: AddEventListenerOptions | boolean,
  ) {
    if (!this._eventHandlers[e]) {
      const handler = method.bind(this) as EventListener
      this._eventHandlers[e] = { handler, options }
      document.addEventListener(e, handler, options)
    }
  }

  _removeEventListener<K extends keyof DocumentEventMap>(e: K) {
    const entry = this._eventHandlers[e]
    if (entry) {
      document.removeEventListener(e, entry.handler)
      delete this._eventHandlers[e]
    }
  }
}
