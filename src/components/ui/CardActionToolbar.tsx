import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext'
import { $getNodeByKey, type NodeKey } from 'lexical'
import React from 'react'

import { ActionToolbar } from '@/components/ui/ActionToolbar'
import { SnippetCreateToolbar } from '@/components/ui/SnippetCreateToolbar'
import { ToolbarMenu, ToolbarMenuItem, ToolbarMenuSeparator, type ToolbarIconName } from '@/components/ui/ToolbarMenu'
import InklingHostIntegrationContext from '@/context/InklingHostIntegrationContext'
import { useCardSelection } from '@/hooks/useCardSelection'
import { useInklingLabels } from '@/hooks/useInklingLabels'
import { getCardToolbarLabel } from '@/nodes/cards/card-toolbar-labels'
import { EDIT_CARD_COMMAND } from '@/plugins/behaviour/commands'

export type CardToolbarItem =
  | { kind: 'edit'; dataTestId?: string }
  | { kind: 'snippet' }
  | { kind: 'separator'; hide?: boolean }
  | {
      kind: 'custom'
      icon: ToolbarIconName
      label: string
      onClick: (event: React.MouseEvent) => void
      isActive?: boolean
      hide?: boolean
      dataTestId?: string
    }

export interface CardActionToolbarProps {
  nodeKey: NodeKey
  // extra per-card gate on the menu toolbar (populated checks, drag states);
  // defaults to true
  visibleWhen?: boolean
  // when false the menu toolbar stays up while the card is editing
  // (bookmark, gallery, image); defaults to true
  hideWhileEditing?: boolean
  // defaults to [edit, separator, snippet]
  items?: CardToolbarItem[]
  // extra content rendered inside the menu toolbar before the menu itself
  // (image's UploadFileInput)
  beforeMenu?: React.ReactNode
}

const DEFAULT_ITEMS: CardToolbarItem[] = [{ kind: 'edit' }, { kind: 'separator' }, { kind: 'snippet' }]

// the card's toolbar name — both blocks render
// data-inkling-card-toolbar={label} (a live CSS/e2e selector contract). The
// label is resolved from the card declaration by the node's own type — the
// same path data-inkling-card takes — so it cannot drift from the card it
// annotates (the historical "signup" header label).
export function useCardToolbarLabel(nodeKey: NodeKey): string | undefined {
  const [editor] = useLexicalComposerContext()

  let label: string | undefined
  editor.getEditorState().read(() => {
    label = getCardToolbarLabel($getNodeByKey(nodeKey)?.getType() ?? '')
  })
  return label
}

export function CardActionToolbar({
  nodeKey,
  visibleWhen = true,
  hideWhileEditing = true,
  items = DEFAULT_ITEMS,
  beforeMenu,
}: CardActionToolbarProps) {
  const [editor] = useLexicalComposerContext()
  const { cardConfig } = React.useContext(InklingHostIntegrationContext)
  const labels = useInklingLabels()
  const isSelected = useCardSelection((state) => state.selectedCardKey === nodeKey)
  const isEditing = useCardSelection((state) => state.selectedCardKey === nodeKey && state.isEditingCard)
  const [showSnippetToolbar, setShowSnippetToolbar] = React.useState<boolean>(false)
  const toolbarLabel = useCardToolbarLabel(nodeKey)

  const handleEdit = (event: React.MouseEvent): void => {
    event.preventDefault()
    event.stopPropagation()
    editor.dispatchCommand(EDIT_CARD_COMMAND, { cardKey: nodeKey })
  }

  // separators default to the snippet gate: they exist to separate the
  // snippet item, so they share its visibility unless a card overrides them
  let separatorCount = 0
  const renderItem = (item: CardToolbarItem): React.ReactNode => {
    switch (item.kind) {
      case 'edit':
        return (
          <ToolbarMenuItem
            key="edit"
            dataTestId={item.dataTestId}
            icon="edit"
            isActive={false}
            label={labels['toolbar.edit']}
            onClick={handleEdit}
          />
        )
      case 'snippet':
        return (
          <ToolbarMenuItem
            key="snippet"
            dataTestId="create-snippet"
            hide={!cardConfig.createSnippet}
            icon="snippet"
            isActive={false}
            label={labels['toolbar.saveAsSnippet']}
            onClick={() => setShowSnippetToolbar(true)}
          />
        )
      case 'separator':
        separatorCount += 1
        return (
          <ToolbarMenuSeparator key={`separator-${separatorCount}`} hide={item.hide ?? !cardConfig.createSnippet} />
        )
      case 'custom':
        return (
          <ToolbarMenuItem
            key={`custom-${item.label}`}
            dataTestId={item.dataTestId}
            hide={item.hide}
            icon={item.icon}
            isActive={item.isActive ?? false}
            label={item.label}
            onClick={item.onClick}
          />
        )
    }
  }

  return (
    <>
      <ActionToolbar data-inkling-card-toolbar={toolbarLabel} isVisible={showSnippetToolbar}>
        <SnippetCreateToolbar nodeKey={nodeKey} onClose={() => setShowSnippetToolbar(false)} />
      </ActionToolbar>

      <ActionToolbar
        data-inkling-card-toolbar={toolbarLabel}
        isVisible={isSelected && !(hideWhileEditing && isEditing) && !showSnippetToolbar && visibleWhen}
      >
        {beforeMenu}
        <ToolbarMenu>{items.map(renderItem)}</ToolbarMenu>
      </ActionToolbar>
    </>
  )
}
