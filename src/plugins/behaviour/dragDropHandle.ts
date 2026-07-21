import type { DragDropHandler } from '@/utils/draggable/DragDropHandler'

// Editor-side handle for the per-top-level-composer drag-drop channel
// (plan 047). Owns the DragDropHandler instance, the editor container
// element, and the isDragging flag so card drag hooks and card chrome read
// them synchronously instead of relying on a context value mutated by
// DragDropReorderPlugin and on mount order. Fed at mount by
// InklingComposableEditor (containerElement) and DragDropReorderPlugin
// (handler; isDragging on drag start/end); React subscribes render-only via
// useDragDropState. One instance per top-level composer (created in
// InklingComposer) — nested composers share the top-level handle, exactly as
// the shared context value worked before.

export interface DragDropHandleState {
  containerElement: HTMLElement | null
  handler: DragDropHandler | null
  isDragging: boolean
}

export type DragDropHandleListener = (state: DragDropHandleState) => void

export interface DragDropHandle {
  getState: () => DragDropHandleState
  setState: (partial: Partial<DragDropHandleState>) => void
  subscribe: (listener: DragDropHandleListener) => () => void
}

export function createDragDropHandle(): DragDropHandle {
  let state: DragDropHandleState = { containerElement: null, handler: null, isDragging: false }
  const listeners = new Set<DragDropHandleListener>()

  return {
    getState: () => state,

    setState: (partial) => {
      const next = { ...state, ...partial }
      if (
        next.containerElement === state.containerElement &&
        next.handler === state.handler &&
        next.isDragging === state.isDragging
      ) {
        return
      }
      state = next
      for (const listener of listeners) {
        listener(state)
      }
    },

    subscribe: (listener) => {
      listeners.add(listener)
      return () => {
        listeners.delete(listener)
      }
    },
  }
}
