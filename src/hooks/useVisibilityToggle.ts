import { $getNodeByKey, type LexicalEditor, type NodeKey } from 'lexical'

import type { CardConfig } from '@/context/InklingComposerContext'
import type { Visibility } from '@/nodes/base/utils/visibility'

import { $isHtmlNode, $updateCardNode } from '@/nodes/base'
import {
  VISIBILITY_SETTINGS,
  getVisibilityOptions,
  parseVisibilityToToggles,
  serializeOptionsToVisibility,
  type VisibilityToggles,
  type VisibilityOption,
} from '@/utils/visibility'

export interface UseVisibilityToggleResult {
  isVisibilityEnabled: boolean
  visibilityData: VisibilityToggles
  visibilityOptions: VisibilityOption[]
  toggleVisibility: (type: string, key: string, value: boolean) => void
}

export const useVisibilityToggle = (
  editor: LexicalEditor,
  nodeKey: NodeKey,
  cardConfig: CardConfig,
): UseVisibilityToggleResult => {
  const isStripeEnabled = !!cardConfig?.stripeEnabled
  const visibilitySetting = cardConfig?.visibilitySettings ?? VISIBILITY_SETTINGS.WEB_AND_EMAIL
  const isVisibilityEnabled = visibilitySetting !== VISIBILITY_SETTINGS.NONE
  const showWeb =
    visibilitySetting === VISIBILITY_SETTINGS.WEB_AND_EMAIL || visibilitySetting === VISIBILITY_SETTINGS.WEB_ONLY
  const showEmail =
    visibilitySetting === VISIBILITY_SETTINGS.WEB_AND_EMAIL || visibilitySetting === VISIBILITY_SETTINGS.EMAIL_ONLY

  let currentVisibility: Visibility | undefined

  editor.getEditorState().read(() => {
    const htmlNode = $getNodeByKey(nodeKey)
    if ($isHtmlNode(htmlNode)) {
      currentVisibility = htmlNode.visibility
    }
  })

  const visibilityData = parseVisibilityToToggles(currentVisibility)
  const visibilityOptions = getVisibilityOptions(currentVisibility, { isStripeEnabled, showWeb, showEmail })

  return {
    isVisibilityEnabled,
    visibilityData,
    visibilityOptions,
    toggleVisibility: (type: string, key: string, value: boolean) => {
      editor.update(() => {
        $updateCardNode(nodeKey, $isHtmlNode, (node) => {
          const newVisibilityOptions = structuredClone(
            getVisibilityOptions(node.visibility, {
              isStripeEnabled,
              showWeb,
              showEmail,
            }),
          )
          const toggle = newVisibilityOptions.find((g) => g.key === type)?.toggles?.find((t) => t.key === key)
          if (!toggle) {
            return
          }

          toggle.checked = value
          node.visibility = serializeOptionsToVisibility(newVisibilityOptions, node.visibility)
        })
      })
    },
  }
}
