import {
  CONTAINER_DATA_ATTR,
  DRAGGABLE_DATA_ATTR,
  DROPPABLE_DATA_ATTR,
  INKLING_ZINDEX,
} from '@/utils/draggable/draggable-constants'

// registerContainer options (plan 047 step 4): three honest groups replacing
// one flat bag whose index signature let `isDragEnabled` ride unnamed.
// Absent optional callbacks are filled with no-ops by the constructor, so
// DragDropHandler keeps calling container.onDragStart(...) etc. untouched.
export interface ContainerDraggableConfig {
  draggableSelector: string
  getDraggableInfo: (draggableElement: HTMLElement | null) => DraggableInfo | false
  createDragPreviewElement?: (draggableInfo: DraggableInfo) => HTMLElement | undefined
  isDragEnabled?: boolean
}

export interface ContainerDroppableConfig {
  droppableSelector: string
  getIndicatorPosition: (
    draggableInfo: DraggableInfo,
    droppableElem: HTMLElement | null,
    position: DroppablePosition,
  ) => { insertIndex: number; element: HTMLElement } | false
  onDrop: (draggableInfo: DraggableInfo, droppable: HTMLElement | null, position: DroppablePosition | null) => boolean
  onDragEnterContainer?: (draggableInfo: DraggableInfo) => void
  onDragEnterDroppable?: (droppable: HTMLElement, position: DroppablePosition) => void
  onDragOverDroppable?: (droppable: HTMLElement, position: DroppablePosition) => void
  onDragLeaveDroppable?: (droppable: HTMLElement) => void
  onDragLeaveContainer?: (draggableInfo: DraggableInfo) => void
}

export interface ContainerLifecycleHandlers {
  onDragStart?: (draggableInfo: DraggableInfo) => void
  onDragEnd?: () => void
  onDropEnd?: (draggableInfo: DraggableInfo, success: boolean) => void
}

export interface ContainerDragHandlers {
  draggable: ContainerDraggableConfig
  droppable: ContainerDroppableConfig
  lifecycle?: ContainerLifecycleHandlers
}

export interface DraggableInfo {
  type?: string
  cardName?: string
  element: HTMLElement | null
  target: HTMLElement | null
  source: HTMLElement | null
  mousePosition: { x: number; y: number }
  insertIndex?: number
  dataset: Record<string, string | number | undefined>
  [key: string]: unknown
}

export type DroppablePosition = 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right'

const noop = () => {}

export class DragDropContainer {
  element!: HTMLElement
  draggables!: HTMLElement[]
  droppables!: HTMLElement[]
  isDragEnabled = true
  draggableSelector!: string
  droppableSelector!: string
  onDragStart!: NonNullable<ContainerLifecycleHandlers['onDragStart']>
  onDragEnterContainer!: NonNullable<ContainerDroppableConfig['onDragEnterContainer']>
  onDragEnterDroppable!: NonNullable<ContainerDroppableConfig['onDragEnterDroppable']>
  onDragOverDroppable!: NonNullable<ContainerDroppableConfig['onDragOverDroppable']>
  onDragLeaveDroppable!: NonNullable<ContainerDroppableConfig['onDragLeaveDroppable']>
  onDragLeaveContainer!: NonNullable<ContainerDroppableConfig['onDragLeaveContainer']>
  onDragEnd!: NonNullable<ContainerLifecycleHandlers['onDragEnd']>
  onDrop!: ContainerDroppableConfig['onDrop']
  onDropEnd!: NonNullable<ContainerLifecycleHandlers['onDropEnd']>
  getDraggableInfo!: ContainerDraggableConfig['getDraggableInfo']
  getIndicatorPosition!: ContainerDroppableConfig['getIndicatorPosition']
  _createDragPreviewElement?: ContainerDraggableConfig['createDragPreviewElement']

  constructor(element: HTMLElement, options: ContainerDragHandlers) {
    const { draggable, droppable, lifecycle } = options

    if (draggable.createDragPreviewElement) {
      this._createDragPreviewElement = draggable.createDragPreviewElement
    }

    // assemble the flat members the handler calls, filling absent optional
    // callbacks with no-ops
    Object.assign(this, {
      element,
      draggables: [],
      droppables: [],
      isDragEnabled: draggable.isDragEnabled ?? true,
      draggableSelector: draggable.draggableSelector,
      getDraggableInfo: draggable.getDraggableInfo,
      droppableSelector: droppable.droppableSelector,
      getIndicatorPosition: droppable.getIndicatorPosition,
      onDrop: droppable.onDrop,
      onDragEnterContainer: droppable.onDragEnterContainer ?? noop,
      onDragEnterDroppable: droppable.onDragEnterDroppable ?? noop,
      onDragOverDroppable: droppable.onDragOverDroppable ?? noop,
      onDragLeaveDroppable: droppable.onDragLeaveDroppable ?? noop,
      onDragLeaveContainer: droppable.onDragLeaveContainer ?? noop,
      onDragStart: lifecycle?.onDragStart ?? noop,
      onDragEnd: lifecycle?.onDragEnd ?? noop,
      onDropEnd: lifecycle?.onDropEnd ?? noop,
    })

    element.dataset[CONTAINER_DATA_ATTR] = 'true'

    this.refresh()
  }

  // override these via constructor options
  enableDrag() {
    this.isDragEnabled = true
    this.element.dataset[CONTAINER_DATA_ATTR] = 'true'
    this.refresh()
  }

  disableDrag() {
    this.isDragEnabled = false
    delete this.element.dataset[CONTAINER_DATA_ATTR]
    this.refresh()
  }

  // TODO: allow configuration for drag preview element creation
  // builds an element that is attached to the mouse pointer when dragging.
  // currently grabs the first <img> and uses that but should be configurable:
  // - a selector for which element in the draggable to copy
  // - a function to hand off element creation to the consumer
  createDragPreviewElement(draggableInfo: DraggableInfo): HTMLElement | undefined {
    let dragPreviewElement: HTMLElement | undefined

    if (typeof this._createDragPreviewElement === 'function') {
      dragPreviewElement = this._createDragPreviewElement(draggableInfo)
    }

    if (!dragPreviewElement && (draggableInfo.type === 'image' || draggableInfo.cardName === 'image')) {
      const image = draggableInfo.element?.querySelector('img') as HTMLImageElement | null
      if (image) {
        const aspectRatio = image.width / image.height
        let width = 0
        let height = 0

        // max drag preview image size is 200px in either dimension
        if (image.width > image.height) {
          width = 200
          height = 200 / aspectRatio
        } else {
          width = 200 * aspectRatio
          height = 200
        }

        const img = document.createElement('img')
        img.width = width
        img.height = height
        img.id = 'inkling-drag-drop-preview'
        img.src = image.src
        img.style.position = 'absolute'
        img.style.top = '0'
        img.style.left = `-${width}px`
        img.style.zIndex = String(INKLING_ZINDEX)
        img.style.willChange = 'transform'
        dragPreviewElement = img
      }
    }

    if (dragPreviewElement) {
      return dragPreviewElement
    }

    return undefined
  }

  // used to add data attributes to any draggable/droppable elements. This is
  // for more efficient lookup through DOM by the drag-drop-handler service
  refresh() {
    // remove all data attributes for currently held draggable/droppable elements
    this.draggables.forEach((draggable) => {
      delete draggable.dataset[DRAGGABLE_DATA_ATTR]
    })
    this.droppables.forEach((droppable) => {
      delete droppable.dataset[DROPPABLE_DATA_ATTR]
    })

    // re-populate draggable/droppable arrays
    this.draggables = []
    this.droppables = []
    if (this.isDragEnabled) {
      this.element.querySelectorAll(this.draggableSelector).forEach((draggable) => {
        if (draggable instanceof HTMLElement) {
          draggable.dataset[DRAGGABLE_DATA_ATTR] = 'true'
          this.draggables.push(draggable)
        }
      })
      this.element.querySelectorAll(this.droppableSelector).forEach((droppable) => {
        if (droppable instanceof HTMLElement) {
          droppable.dataset[DROPPABLE_DATA_ATTR] = 'true'
          this.droppables.push(droppable)
        }
      })
    }
  }
}
