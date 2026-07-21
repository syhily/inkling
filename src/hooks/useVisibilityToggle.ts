import { $getNodeByKey, type LexicalEditor, type NodeKey } from 'lexical'

import type { CardConfig } from '@/context/InklingHostIntegrationContext'
import type { Visibility } from '@/nodes/base/utils/visibility'

import { GeneratedDecoratorNodeBase } from '@/nodes/base'
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

// The hook's structural card view (paired with the recorded write-seam
// exception below): Html is the only visibility-bearing card, and the tests
// drive a plain-object double, so the field is spelled out structurally
// rather than narrowed through `$isHtmlNode`.
type VisibilityCardNode = GeneratedDecoratorNodeBase & { visibility?: Visibility }

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

  // This hook intentionally bypasses the $updateCardNode write seam: its tests drive the
  // hook with a structural test double (a plain-object `$getNodeByKey` mock), so the
  // seam's `$isHtmlNode` instanceof narrowing would never match. See CONTEXT.md,
  // "Card write seam" for the recorded exception.
  editor.getEditorState().read(() => {
    const htmlNode = $getNodeByKey(nodeKey)
    if (!htmlNode) {
      return
    }
    currentVisibility = (htmlNode as VisibilityCardNode).visibility
  })

  const visibilityData = parseVisibilityToToggles(currentVisibility)
  const visibilityOptions = getVisibilityOptions(currentVisibility, { isStripeEnabled, showWeb, showEmail })

  return {
    isVisibilityEnabled,
    visibilityData,
    visibilityOptions,
    toggleVisibility: (type: string, key: string, value: boolean) => {
      editor.update(() => {
        const node = $getNodeByKey(nodeKey)
        if (!node) {
          return
        }
        const newVisibilityOptions = structuredClone(
          getVisibilityOptions((node as VisibilityCardNode).visibility, {
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
        const nodeWithVisibility = node as GeneratedDecoratorNodeBase & { visibility: Visibility }
        nodeWithVisibility.visibility = serializeOptionsToVisibility(
          newVisibilityOptions,
          nodeWithVisibility.visibility,
        )
      })
    },
  }
}
