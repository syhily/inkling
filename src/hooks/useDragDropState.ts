import type { DragDropHandleState } from '@/plugins/behaviour/dragDropHandle'

import { useDragDropHandleState } from '@/context/DragDropHandleContext'

// Render-only subscription to the per-composer drag-drop handle (plan 047).
// useSyncExternalStore compares snapshots with Object.is, so a subscriber
// re-renders only when its selected slice changes — keep selectors returning
// primitives or stable references (state => state.handler,
// state => state.containerElement), not fresh objects.
export function useDragDropState<T>(selector: (state: DragDropHandleState) => T): T {
  return useDragDropHandleState(selector)
}
