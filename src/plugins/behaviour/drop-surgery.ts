import { $createNodeSelection, $getNearestNodeFromDOMNode, $getNodeByKey, $setSelection, type NodeKey } from 'lexical'

import { $createImageNode, type ImageNode, type ImageNodeDataset } from '@/nodes/ImageNode'

// Drop surgery — the headless $-surgeries behind DragDropReorderPlugin. The
// reorder rules (@/utils/draggable/reorder-rules) own the drop decisions
// (allowance, insertIndex derivation, drop-time verification); this module
// owns applying a resolved drop to the editor tree: relocating a dragged
// card, inserting a gallery-dragged image, and the source-removal policy for
// cross-card drops. The plugin keeps the DOM/selector glue, the handler
// lifecycle, and the DropResult mapping — rules decide, surgeries apply.
//
// The $-functions must run inside editor.update()/editor.read().

/**
 * Moves the dragged card to the resolved drop slot: before the droppable at
 * `insertIndex`, or after the last droppable when the index runs past the end
 * of the document. Clears the selection so no toolbar pops back up over the
 * moved card and the caret is not left stranded somewhere else in the
 * document. Returns false — leaving the tree untouched — when the node key
 * no longer resolves.
 */
export function $relocateCard(nodeKey: NodeKey | undefined, droppables: HTMLElement[], insertIndex: number): boolean {
  const draggedNode = nodeKey ? $getNodeByKey(nodeKey) : null
  if (!draggedNode) {
    return false
  }

  if (insertIndex >= droppables.length) {
    // drop at end of document
    const targetNode = $getNearestNodeFromDOMNode(droppables[droppables.length - 1])
    if (targetNode) {
      targetNode.insertAfter(draggedNode)
    }
  } else {
    const targetNode = $getNearestNodeFromDOMNode(droppables[insertIndex])
    if (targetNode) {
      targetNode.insertBefore(draggedNode)
    }
  }

  // clear selection so we don't show any toolbars immediately and the cursor
  // isn't left stranded somewhere else in the document
  $setSelection(null)
  return true
}

/**
 * Inserts a new image card built from the dragged image's dataset before the
 * droppable at `insertIndex` and selects it (images can be dragged out of a
 * gallery). Returns the created node, or null when the slot does not resolve
 * to a node — the drop still counts as handled, so the caller's result
 * mapping does not branch on this.
 */
export function $insertDraggedImage(
  dataset: ImageNodeDataset,
  droppables: HTMLElement[],
  insertIndex: number,
): ImageNode | null {
  const targetNode = $getNearestNodeFromDOMNode(droppables[insertIndex])
  if (!targetNode) {
    return null
  }

  const imageNode = $createImageNode(dataset)
  targetNode.insertBefore(imageNode)

  // select the newly inserted image card
  const nodeSelection = $createNodeSelection()
  nodeSelection.add(imageNode.getKey())
  $setSelection(nodeSelection)
  return imageNode
}

/**
 * The source-removal policy for cross-card drops: the dragged card's source
 * node is removed only when the drop succeeded in another container (success
 * without sourceHandled) — a same-container reorder reports sourceHandled,
 * and a failed drop removes nothing.
 */
export function shouldRemoveDropSource(
  draggableType: string | undefined,
  success: boolean,
  sourceHandled: boolean,
): boolean {
  return !sourceHandled && success && draggableType === 'card'
}

/**
 * Removes the dragged card's source node after a cross-card drop. Returns
 * false when the key no longer resolves.
 */
export function $removeDropSource(nodeKey: NodeKey | undefined): boolean {
  const cardNode = nodeKey ? $getNodeByKey(nodeKey) : null
  if (!cardNode) {
    return false
  }
  cardNode.remove(false)
  return true
}
