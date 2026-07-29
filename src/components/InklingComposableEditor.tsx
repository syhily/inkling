import '@/styles/index.css'
import type { Transformer } from '@lexical/markdown'
import type { EditorState, SerializedEditorState } from 'lexical'

import { useCollaborationContext } from '@lexical/react/LexicalCollaborationContext'
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext'
import { ContentEditable } from '@lexical/react/LexicalContentEditable'
import { HistoryPlugin } from '@lexical/react/LexicalHistoryPlugin'
import { LinkPlugin } from '@lexical/react/LexicalLinkPlugin'
import { OnChangePlugin } from '@lexical/react/LexicalOnChangePlugin'
import { RichTextPlugin } from '@lexical/react/LexicalRichTextPlugin'
import React from 'react'

import type { ExternalControlAPI } from '@/plugins/ExternalControlPlugin'

import InklingErrorBoundary from '@/components/InklingErrorBoundary'
import { EditorPlaceholder } from '@/components/ui/EditorPlaceholder'
import { useDragDropHandle } from '@/context/DragDropHandleContext'
import InklingUiPrefsContext from '@/context/InklingUiPrefsContext'
import { useSharedEditorStateContext } from '@/context/SharedEditorStateContext'
import { type HiddenFormat } from '@/plugins/behaviour/format-toolbar'
import DragDropPastePlugin from '@/plugins/DragDropPastePlugin'
import DragDropReorderPlugin from '@/plugins/DragDropReorderPlugin'
import { ExternalControlPlugin } from '@/plugins/ExternalControlPlugin'
import FloatingToolbarPlugin from '@/plugins/FloatingToolbarPlugin'
import InklingBehaviourPlugin from '@/plugins/InklingBehaviourPlugin'
import { InklingBlurPlugin } from '@/plugins/InklingBlurPlugin'
import { InklingFocusPlugin } from '@/plugins/InklingFocusPlugin'
import MarkdownPastePlugin from '@/plugins/MarkdownPastePlugin'
import MarkdownShortcutPlugin from '@/plugins/MarkdownShortcutPlugin'
import RestrictContentPlugin from '@/plugins/RestrictContentPlugin'
import TKPlugin from '@/plugins/TKPlugin'
import { getParentEditor } from '@/utils/lexical-internals'

export interface InklingComposableEditorProps {
  onChange?: (editorState: SerializedEditorState) => void
  onBlur?: () => void
  onFocus?: () => void
  markdownTransformers?: readonly Transformer[]
  registerAPI?: (api: ExternalControlAPI | null) => void
  cursorDidExitAtTop?: () => void
  children?: React.ReactNode
  // ReactElement, not ReactNode: upstream RichTextPlugin's placeholder
  // contract is Element | ((isEditable) => Element | null) — widening the
  // prop past it would fail at that boundary instead of here
  placeholder?: React.ReactElement
  singleParagraph?: boolean
  placeholderText?: string
  placeholderClassName?: string
  className?: string
  readOnly?: boolean
  isDragEnabled?: boolean
  inheritStyles?: boolean
  isSnippetsEnabled?: boolean
  hiddenFormats?: HiddenFormat[]
  useDefaultClasses?: boolean
  dataTestId?: string
  /** Keep text alignment (`format`) instead of stripping it; set on surfaces that expose alignment controls. */
  alignment?: boolean
}

const InklingComposableEditor = ({
  onChange,
  onBlur,
  onFocus,
  markdownTransformers,
  registerAPI,
  cursorDidExitAtTop,
  children,
  placeholder,
  singleParagraph,
  placeholderText,
  placeholderClassName = '',
  className = '',
  readOnly = false,
  isDragEnabled = true,
  inheritStyles = false,
  isSnippetsEnabled = true,
  hiddenFormats = [],
  useDefaultClasses = true,
  dataTestId,
  alignment,
}: InklingComposableEditorProps) => {
  const { historyState, onChange: sharedOnChange } = useSharedEditorStateContext()
  const [editor] = useLexicalComposerContext()
  const { isCollabActive } = useCollaborationContext()
  const { darkMode, isTKEnabled } = React.useContext(InklingUiPrefsContext)
  const dragDropHandle = useDragDropHandle()

  const parentEditor = getParentEditor(editor)
  const isNested = parentEditor !== null
  const isDragReorderEnabled = isDragEnabled && !readOnly && !isNested

  const _onChange = React.useCallback(
    (editorState: EditorState) => {
      if (sharedOnChange) {
        // sharedOnChange is called for the main editor and nested editors, we want to
        // make sure we don't accidentally serialize only the contents of the nested
        // editor so we need to use the parent editor when it exists
        const primaryEditorState = (parentEditor || editor).getEditorState()
        const json = primaryEditorState.toJSON()
        sharedOnChange(json)
      }

      if (onChange) {
        // onChange is only called for this current editor instance, allowing for
        // per-editor onChange handlers
        const json = editorState.toJSON()
        onChange(json)
      }
    },
    [onChange, sharedOnChange, editor, parentEditor],
  )

  // local ref for InklingBehaviourPlugin; the same wrapper element feeds the
  // drag-drop handle so the reorder plugin and the card drag hooks can reach
  // it without a shared mutable context ref. useCallback keeps the ref
  // identity stable so React attaches it once instead of on every render.
  const editorContainerRef = React.useRef<HTMLElement | null>(null)
  const onWrapperRef = React.useCallback(
    (wrapperElem: HTMLElement | null) => {
      if (!isNested) {
        editorContainerRef.current = wrapperElem
        dragDropHandle.setState({ containerElement: wrapperElem })
      }
    },
    [isNested, dragDropHandle],
  )

  // we need an element reference for the container element that
  // any floating elements in plugins will be rendered inside
  const [floatingAnchorElem, setFloatingAnchorElem] = React.useState<HTMLDivElement | null>(null)
  const onContentEditableRef = (_floatingAnchorElem: HTMLDivElement | null) => {
    if (_floatingAnchorElem !== null) {
      setFloatingAnchorElem(_floatingAnchorElem)
    }
  }

  return (
    <div
      ref={onWrapperRef}
      className={`${useDefaultClasses ? 'inkling-lexical' : ''} ${inheritStyles ? 'inkling-inherit-styles' : ''} ${darkMode ? 'dark' : ''} ${className}`}
      data-inkling-dnd-disabled={!isDragEnabled}
      data-testid={dataTestId}
    >
      <RichTextPlugin
        contentEditable={
          <div ref={onContentEditableRef} data-inkling="editor">
            <ContentEditable className={useDefaultClasses ? 'inkling-prose' : ''} readOnly={readOnly} />
          </div>
        }
        ErrorBoundary={InklingErrorBoundary}
        placeholder={placeholder || <EditorPlaceholder className={placeholderClassName} text={placeholderText} />}
      />
      <LinkPlugin />
      <OnChangePlugin ignoreHistoryMergeTagChange={false} ignoreSelectionChange={true} onChange={_onChange} />
      {!isCollabActive && <HistoryPlugin externalHistoryState={historyState} />}{' '}
      {/* adds undo/redo, in multiplayer that's handled by yjs */}
      <InklingBehaviourPlugin
        containerElem={editorContainerRef}
        cursorDidExitAtTop={cursorDidExitAtTop}
        isNested={isNested}
        alignment={alignment}
      />
      <MarkdownShortcutPlugin transformers={markdownTransformers} />
      {floatingAnchorElem && (
        <FloatingToolbarPlugin
          anchorElem={floatingAnchorElem}
          hiddenFormats={hiddenFormats}
          isSnippetsEnabled={isSnippetsEnabled}
        />
      )}
      <DragDropPastePlugin />
      {registerAPI ? <ExternalControlPlugin registerAPI={registerAPI} /> : null}
      {isDragReorderEnabled && <DragDropReorderPlugin />}
      {singleParagraph && <RestrictContentPlugin paragraphs={1} />}
      {onBlur && <InklingBlurPlugin onBlur={onBlur} />}
      {onFocus && <InklingFocusPlugin onFocus={onFocus} />}
      <MarkdownPastePlugin />
      {isTKEnabled && <TKPlugin />}
      {children}
    </div>
  )
}

export default InklingComposableEditor
