// Drag-start session — the headless grab → movement-threshold → start/cancel
// state machine behind DragDropHandler's drag initiation, mirroring the
// floating panel's createDragSession. A mousedown on a draggable begins a
// session: the press becomes a drag once the pointer travels past
// DRAG_START_THRESHOLD from the grab point, and is cancelled when the pointer
// is released or a native HTML drag begins first. Every DOM consequence sits
// behind injected ports — the temporary listener set and the start/cancel
// resolution — so the threshold policy is synchronously unit-testable.
// DragDropHandler owns the ports (document listeners, drag initiation).

/** Distance in px the pointer must travel from the grab point before a press becomes a drag. */
export const DRAG_START_THRESHOLD = 1

export interface DragSessionPoint {
  x: number
  y: number
}

/** The temporary listeners a pending session needs, handed to the listen port. */
export interface DragStartSessionListeners {
  /** Pointer moved to point. */
  move: (point: DragSessionPoint) => void
  /** Pointer released before the threshold was crossed. */
  release: () => void
  /** A native HTML drag began before the threshold was crossed. */
  nativeDrag: () => void
}

export interface DragStartSessionPorts {
  /** Attach the session's temporary listeners; returns their detach. */
  listen: (listeners: DragStartSessionListeners) => () => void
  /** The press crossed the start threshold — it is now a drag. */
  onStart: () => void
  /** The press ended before crossing the threshold. */
  onCancel?: () => void
}

export interface DragStartSession {
  /** Feed a pointer position; starts the drag once past the threshold. */
  move: (point: DragSessionPoint) => void
  /** End the session before it started (release, native drag, reset, a newer grab). */
  cancel: () => void
  /** Whether the session is still waiting for its start threshold. */
  isPending: () => boolean
}

/**
 * Headless drag-start session: grab point in, threshold policy, then exactly
 * one resolution — onStart or onCancel — with the listeners detached either
 * way. The owner feeds it pointer positions and owns every DOM consequence.
 */
export function createDragStartSession(
  grab: DragSessionPoint,
  { listen, onStart, onCancel }: DragStartSessionPorts,
): DragStartSession {
  let pending = true

  const finish = (started: boolean) => {
    if (!pending) {
      return
    }
    pending = false
    detach()
    if (started) {
      onStart()
    } else {
      onCancel?.()
    }
  }

  const move = (point: DragSessionPoint) => {
    if (Math.abs(grab.x - point.x) > DRAG_START_THRESHOLD || Math.abs(grab.y - point.y) > DRAG_START_THRESHOLD) {
      finish(true)
    }
  }

  const cancel = () => finish(false)

  // the listeners can only fire once listen has returned, so `detach` is
  // always assigned by the time finish runs
  const detach = listen({ move, release: cancel, nativeDrag: cancel })

  return {
    move,
    cancel,
    isPending: () => pending,
  }
}
