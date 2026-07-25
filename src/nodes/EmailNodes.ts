import { AsideNode } from '@/nodes/AsideNode'
import { ExtendedQuoteNode, extendedQuoteNodeReplacement } from '@/nodes/base'
import { CARD_WRAPPER_NODES } from '@/nodes/cards/card-wrappers'
import { deriveCardNodes } from '@/nodes/cards/derive-card-nodes'
import { EDITOR_BASE_NODES } from '@/nodes/DefaultNodes'

// Cards eligible for the email renderer, from their declarations.
const CARD_NODES = deriveCardNodes(CARD_WRAPPER_NODES, 'emailRenderer').map((card) => card.node)

// The email renderer shares the editor base run except the extended-quote
// pair and the aside card — it keeps plain quotes and has no aside surface.
const EXCLUDED_BASE_NODES: ReadonlySet<unknown> = new Set([ExtendedQuoteNode, extendedQuoteNodeReplacement, AsideNode])

// No `ensureLexicalNodeOwnMethods` call here: the one wrapper that needs it
// (AsideNode) is covered where EDITOR_BASE_NODES is defined, and the rest of
// the set declares its own statics natively.
const EMAIL_NODES = [...EDITOR_BASE_NODES.filter((entry) => !EXCLUDED_BASE_NODES.has(entry)), ...CARD_NODES]

export default EMAIL_NODES
