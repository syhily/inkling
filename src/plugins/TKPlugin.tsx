import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext'
import { type LexicalEditor, TextNode } from 'lexical'
import { useCallback, useContext, useEffect, useState } from 'react'
import { createPortal } from 'react-dom'

import CardContext from '@/context/CardContext'
import { useTKHandle, useTKHandleState } from '@/context/TKHandleContext'
import { useInklingTextEntity } from '@/hooks/useInklingTextEntity'
import { $createTKNode, ExtendedTextNode, TKNode } from '@/nodes/base'
import { resolveTkIndicatorPosition } from '@/plugins/behaviour/tk-indicator'
import { getTKMatch } from '@/plugins/behaviour/tk-matcher'
import { $selectTkFromIndicator, applyTkHoverHighlight, registerTkNodeTracking } from '@/plugins/behaviour/tk-tracking'
import { getEditorTheme } from '@/utils/lexical-internals'

function TKIndicator({
  editor,
  rootElement,
  parentKey,
  nodeKeys,
}: {
  editor: LexicalEditor
  rootElement: HTMLElement
  parentKey: string
  nodeKeys: string[]
}) {
  const theme = getEditorTheme(editor)
  // EditorThemeClasses ends in an upstream [key: string]: any index signature,
  // so annotate the custom keys at the boundary before consuming them
  const tk: string | undefined = theme.tk
  const tkHighlighted: string | undefined = theme.tkHighlighted
  const tkClasses = tk?.split(' ') || []
  const tkHighlightClasses = tkHighlighted?.split(' ') || []

  const containingElement = editor.getElementByKey(parentKey)

  // position element relative to the TK Node containing element
  const calculatePosition = useCallback(() => {
    if (!containingElement) {
      return resolveTkIndicatorPosition(null, null)
    }

    const positioningElement = containingElement.querySelector('[data-inkling-card]') || containingElement

    return resolveTkIndicatorPosition(rootElement.getBoundingClientRect(), positioningElement.getBoundingClientRect())
  }, [rootElement, containingElement])

  const [position, setPosition] = useState(calculatePosition())

  // set up an observer to reposition the indicator when the TK node containing
  // element moves relative to the root element
  useEffect(() => {
    if (!containingElement) {
      return
    }
    const observer = new ResizeObserver(() => setPosition(calculatePosition()))

    observer.observe(rootElement)
    observer.observe(containingElement)

    return () => {
      observer.disconnect()
    }
  }, [rootElement, containingElement, calculatePosition])

  if (!containingElement) {
    return null
  }

  // select the TK node when the indicator is clicked,
  // cycle selection through associated TK nodes when clicked multiple times
  // (the surgery is headless in tk-tracking; the component keeps the DOM event)
  const onClick = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()

    editor.update(() => {
      $selectTkFromIndicator(editor, parentKey, nodeKeys)
    })
  }

  const toggleHighlightClasses = (isHighlighted: boolean) => {
    applyTkHoverHighlight(editor, parentKey, nodeKeys, { tkClasses, tkHighlightClasses }, isHighlighted)
  }

  const onMouseEnter = () => {
    toggleHighlightClasses(true)
  }

  const onMouseLeave = () => {
    toggleHighlightClasses(false)
  }

  const style = {
    top: `${position.top}px`,
    right: `${position.right}px`,
  }

  return (
    <div
      className="absolute cursor-pointer p-1 text-2xs font-medium text-grey-600"
      data-testid="tk-indicator"
      style={style}
      onClick={onClick}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
    >
      TK
    </div>
  )
}

export default function TKPlugin() {
  const [editor] = useLexicalComposerContext()
  const tkHandle = useTKHandle()
  const tkNodeMap = useTKHandleState((state) => state.tkNodeMap)
  const { nodeKey: parentEditorNodeKey } = useContext(CardContext)

  useEffect(() => {
    if (!editor.hasNodes([TKNode])) {
      throw new Error('TKPlugin: TKNode not registered on editor')
    }

    // clean up editor when it is destroyed - ensures counts are up to date
    // when a nested-editor-containing card is deleted
    return () => {
      tkHandle.removeEditor(editor.getKey())
    }
  }, [editor, tkHandle])

  useEffect(() => {
    return registerTkNodeTracking(editor, tkHandle, parentEditorNodeKey)
  }, [editor, tkHandle, parentEditorNodeKey])

  const createTKNode = useCallback((textNode: TextNode): TKNode => {
    return $createTKNode(textNode.getTextContent())
  }, [])

  const nodeType = editor.hasNode(ExtendedTextNode) ? ExtendedTextNode : TextNode

  useInklingTextEntity(getTKMatch, TKNode, createTKNode, nodeType)

  // we only want to render TK indicators for the top level editor
  if (parentEditorNodeKey) {
    return null
  }

  const editorRoot = editor.getRootElement()
  const editorRootParent = editor.getRootElement()?.parentElement

  if (!editorRootParent) {
    return null
  }

  const TKIndicators = Object.entries(tkNodeMap)
    .map(([parentKey, nodeKeys]) => {
      const parentContainer = editor.getElementByKey(parentKey)

      if (!parentContainer) {
        return false
      }

      return (
        <TKIndicator
          key={parentKey}
          editor={editor}
          nodeKeys={nodeKeys}
          parentKey={parentKey}
          rootElement={editorRoot!}
        />
      )
    })
    .filter(Boolean)

  return createPortal(TKIndicators, editorRootParent)
}
