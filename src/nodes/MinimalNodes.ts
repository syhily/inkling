import { LinkNode } from '@lexical/link'

import { ExtendedTextNode, TKNode, extendedTextNodeReplacement } from '@/nodes/base'

const MINIMAL_NODES = [ExtendedTextNode, extendedTextNodeReplacement, LinkNode, TKNode]

export default MINIMAL_NODES
