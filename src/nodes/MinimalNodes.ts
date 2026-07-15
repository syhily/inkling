import { LinkNode } from '@lexical/link'

// Deep imports (not the `@/nodes/base` barrel): the barrel derives its node
// set from the card declarations, and declarations reference MINIMAL_NODES in
// their `nestedEditors` specs — importing the barrel here would close a cycle.
import { ExtendedTextNode, extendedTextNodeReplacement } from '@/nodes/base/nodes/ExtendedTextNode'
import { TKNode } from '@/nodes/base/nodes/TKNode'

const MINIMAL_NODES = [ExtendedTextNode, extendedTextNodeReplacement, LinkNode, TKNode]

export default MINIMAL_NODES
