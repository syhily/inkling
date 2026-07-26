import { $isListNode, ListNode } from '@lexical/list'
import {
  $createHeadingNode,
  $createQuoteNode,
  $isHeadingNode,
  HeadingNode,
  QuoteNode,
  type HeadingTagType,
} from '@lexical/rich-text'
import { $setBlocksType } from '@lexical/selection'
import { $getNearestNodeOfType } from '@lexical/utils'
import {
  $createParagraphNode,
  $getSelection,
  $isRangeSelection,
  FORMAT_TEXT_COMMAND,
  type LexicalEditor,
} from 'lexical'
import React from 'react'

import { ToolbarMenu, ToolbarMenuItem, ToolbarMenuSeparator, type ToolbarIconName } from '@/components/ui/ToolbarMenu'
import InklingHostIntegrationContext from '@/context/InklingHostIntegrationContext'
import { useInklingLabels } from '@/hooks/useInklingLabels'
import { $createAsideNode } from '@/nodes/AsideNode'
import { getSelectedNode } from '@/utils/getSelectedNode'
import { isNestedEditor } from '@/utils/lexical-internals'
import { altOrOption, ctrlOrCmdSymbol, ctrlOrSymbol } from '@/utils/shortcutSymbols'

// the block types the toolbar tracks — only membership is read, so this is a
// Set, not a label map
const blockTypeNames: ReadonlySet<string> = new Set([
  'bullet',
  'check',
  'code',
  'h1',
  'h2',
  'h3',
  'h4',
  'h5',
  'h6',
  'number',
  'paragraph',
  'quote',
  'extended-quote',
  'aside',
])

function quoteIcon(blockType = ''): ToolbarIconName {
  if (blockType.endsWith('quote')) {
    return 'quoteOne'
  } else if (blockType.endsWith('aside')) {
    return 'quoteTwo'
  } else {
    return 'quote'
  }
}

interface FormatToolbarProps {
  editor: LexicalEditor
  isSnippetsEnabled?: boolean
  isLinkSelected?: boolean
  onLinkClick?: () => void
  onSnippetClick?: () => void
  hiddenFormats?: string[]
}

export default function FormatToolbar({
  editor,
  isSnippetsEnabled,
  isLinkSelected,
  onLinkClick,
  onSnippetClick,
  hiddenFormats = [],
}: FormatToolbarProps) {
  const [isBold, setIsBold] = React.useState(false)
  const [isItalic, setIsItalic] = React.useState(false)
  const [blockType, setBlockType] = React.useState<string>('paragraph')
  const {
    cardConfig: { createSnippet },
  } = React.useContext(InklingHostIntegrationContext)
  const labels = useInklingLabels()

  let hideHeading = false
  if (!editor.hasNodes([HeadingNode])) {
    hideHeading = true
  }

  let hideQuotes = false
  if (!editor.hasNodes([QuoteNode])) {
    hideQuotes = true
  }

  let hideSnippets = !isSnippetsEnabled || !createSnippet // don't show snippet toolbar if we can't create them
  if (isNestedEditor(editor)) {
    hideSnippets = true
  }

  let hideBold = false
  if (hiddenFormats.includes('bold')) {
    hideBold = true
  }

  const updateState = React.useCallback(() => {
    editor.getEditorState().read(() => {
      // Should not to pop up the floating toolbar when using IME input
      if (editor.isComposing()) {
        return
      }

      const selection = $getSelection()
      if (!$isRangeSelection(selection)) {
        return
      }
      // update text format
      setIsBold(selection.hasFormat('bold'))
      setIsItalic(selection.hasFormat('italic'))

      const anchorNode = getSelectedNode(selection)
      const element = anchorNode.getKey() === 'root' ? anchorNode : anchorNode.getTopLevelElementOrThrow()
      const elementKey = element.getKey()
      const elementDOM = editor.getElementByKey(elementKey)

      if (elementDOM !== null) {
        if ($isListNode(element)) {
          const parentList = $getNearestNodeOfType(anchorNode, ListNode)
          const type = parentList ? parentList.getListType() : element.getListType()
          setBlockType(type)
        } else {
          const type = $isHeadingNode(element) ? element.getTag() : element.getType()

          if (blockTypeNames.has(type)) {
            setBlockType(type)
          }
        }
      }
    })
  }, [editor])

  React.useEffect(() => {
    updateState()

    return editor.registerUpdateListener(() => {
      updateState()
    })
  }, [editor, updateState])

  const formatParagraph = () => {
    if (blockType !== 'paragraph') {
      editor.update(() => {
        const selection = $getSelection()

        if ($isRangeSelection(selection)) {
          $setBlocksType(selection, () => $createParagraphNode())
        }
      })
    }
  }

  const formatHeading = (headingSize: HeadingTagType) => {
    if (blockType !== headingSize) {
      editor.update(() => {
        const selection = $getSelection()

        if ($isRangeSelection(selection)) {
          $setBlocksType(selection, () => $createHeadingNode(headingSize))
        }
      })
    }
  }

  const formatQuote = () => {
    editor.update(() => {
      const selection = $getSelection()

      if ($isRangeSelection(selection)) {
        if (blockType.endsWith('quote')) {
          $setBlocksType(selection, () => $createAsideNode())
        } else if (blockType.endsWith('aside')) {
          $setBlocksType(selection, () => $createParagraphNode())
        } else {
          $setBlocksType(selection, () => $createQuoteNode())
        }
      }
    })
  }

  return (
    <ToolbarMenu>
      <ToolbarMenuItem
        data-inkling-toolbar-button="bold"
        hide={hideBold}
        icon="bold"
        isActive={isBold}
        label={labels['toolbar.bold']}
        shortcutKeys={[ctrlOrCmdSymbol(), 'B']}
        onClick={() => editor.dispatchCommand(FORMAT_TEXT_COMMAND, 'bold')}
      />
      <ToolbarMenuItem
        data-inkling-toolbar-button="italic"
        icon="italic"
        isActive={isItalic}
        label={labels['toolbar.emphasize']}
        shortcutKeys={[ctrlOrCmdSymbol(), 'I']}
        onClick={() => editor.dispatchCommand(FORMAT_TEXT_COMMAND, 'italic')}
      />
      <ToolbarMenuItem
        data-inkling-toolbar-button="h2"
        hide={hideHeading}
        icon="headingTwo"
        isActive={blockType === 'h2'}
        label={labels['toolbar.heading2']}
        shortcutKeys={[ctrlOrSymbol(), altOrOption(), '2']}
        onClick={() => (blockType === 'h2' ? formatParagraph() : formatHeading('h2'))}
      />
      <ToolbarMenuItem
        data-inkling-toolbar-button="h3"
        hide={hideHeading}
        icon="headingThree"
        isActive={blockType === 'h3'}
        label={labels['toolbar.heading3']}
        shortcutKeys={[ctrlOrSymbol(), altOrOption(), '3']}
        onClick={() => (blockType === 'h3' ? formatParagraph() : formatHeading('h3'))}
      />
      <ToolbarMenuSeparator hide={hideQuotes} />
      <ToolbarMenuItem
        data-inkling-toolbar-button="quote"
        hide={hideQuotes}
        icon={quoteIcon(blockType)}
        isActive={blockType.endsWith('quote') || blockType.endsWith('aside')}
        label={labels['toolbar.quote']}
        shortcutKeys={[ctrlOrSymbol(), 'Q']}
        onClick={formatQuote}
      />

      <ToolbarMenuItem
        data-inkling-toolbar-button="link"
        icon="link"
        isActive={!!isLinkSelected}
        label={labels['toolbar.link']}
        shortcutKeys={[ctrlOrCmdSymbol(), 'K']}
        onClick={onLinkClick}
      />

      <ToolbarMenuSeparator hide={hideSnippets} />
      <ToolbarMenuItem
        data-inkling-toolbar-button="snippet"
        hide={hideSnippets}
        icon="snippet"
        isActive={false}
        label={labels['toolbar.saveAsSnippet']}
        onClick={onSnippetClick}
      />
    </ToolbarMenu>
  )
}
