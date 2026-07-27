import type { MathData } from '@/nodes/base/nodes/math/MathNode'

import { assembleCardNodeOnce } from '@/nodes/assemble-card-node'
import { mathDeclaration } from '@/nodes/cards/math.declaration'

export { $isMathNode } from '@/nodes/base/nodes/math/MathNode'
export { INSERT_MATH_COMMAND } from '@/nodes/cards/card-commands'

export type MathNodeDataset = MathData

/**
 * The registered class is assembled from the card declaration;
 * `$isMathNode` is canonical on the base node. `$createMathNode` keeps
 * constructing the assembled class so the declaration's spec statics are
 * initialized.
 */
export const MathNode = assembleCardNodeOnce(mathDeclaration)
export type MathNode = InstanceType<typeof MathNode>

export function $createMathNode(dataset: MathNodeDataset): MathNode {
  return new MathNode(dataset)
}
