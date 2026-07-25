import { CARD_WRAPPER_NODES } from '@/nodes/cards/card-wrappers'
import { deriveCardNodes } from '@/nodes/cards/derive-card-nodes'
import { EDITOR_BASE_NODES } from '@/nodes/DefaultNodes'

// Cards eligible for the email editor, from their declarations; declaration
// order reproduces the pre-refactor card run below.
const CARDS = deriveCardNodes(CARD_WRAPPER_NODES, 'emailEditor')

/**
 * Node set for the email editor. Slimmed down version of the default nodes exempting those that aren't meant for email.
 */
const EMAIL_EDITOR_NODES = [
  // Shared base run (identical to the default editor's)
  ...EDITOR_BASE_NODES,

  // Cards for email
  ...CARDS.map((card) => card.node),
]

export default EMAIL_EDITOR_NODES
