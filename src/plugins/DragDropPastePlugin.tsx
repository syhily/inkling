import type { BaseSelection, LexicalEditor } from 'lexical'

import { $insertDataTransferForRichText } from '@lexical/clipboard'
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext'
import { DRAG_DROP_PASTE } from '@lexical/rich-text'
import { $getRoot, $getSelection, COMMAND_PRIORITY_HIGH, COMMAND_PRIORITY_LOW, DROP_COMMAND } from 'lexical'
import React from 'react'

import type { FileUploader } from '@/context/InklingHostIntegrationContext'

import InklingHostIntegrationContext from '@/context/InklingHostIntegrationContext'
import { INSERT_MEDIA_COMMAND, MIME_TEXT_HTML } from '@/plugins/behaviour/clipboard-protocol'
import { getEditorCardNodes } from '@/utils/getEditorCardNodes'

interface ProcessedFile {
  type: string | undefined
  file: File
}

function isMimeType(file: File, acceptableMimeTypes: Record<string, string[]>): string | undefined {
  const mimeType = file.type
  const key = Object.keys(acceptableMimeTypes).find((k) => acceptableMimeTypes[k].includes(mimeType))
  return key
}

function processMediaFiles(files: File[], acceptableMimeTypes: Record<string, string[]>): ProcessedFile[] {
  const processed: ProcessedFile[] = []
  for (const file of files) {
    const type = isMimeType(file, acceptableMimeTypes)
    if (type) {
      processed.push({ type, file })
    }
  }
  return processed
}

function getListOfAcceptableMimeTypes(
  editor: LexicalEditor,
  uploadFileTypes: FileUploader['fileTypes'],
): { acceptableMimeTypes: Record<string, string[]> } {
  const acceptableMimeTypes: Record<string, string[]> = {}
  for (const [nodeType, card] of getEditorCardNodes(editor)) {
    if (card.uploadType) {
      acceptableMimeTypes[nodeType] = uploadFileTypes?.[card.uploadType]?.mimeTypes ?? []
    }
  }
  return {
    acceptableMimeTypes,
  }
}

function DragDropPastePlugin() {
  const [editor] = useLexicalComposerContext()
  const { fileUploader } = React.useContext(InklingHostIntegrationContext)

  const handleFileUpload = React.useCallback(
    (files: File[]): void => {
      if (!fileUploader) {
        return
      }

      const { acceptableMimeTypes } = getListOfAcceptableMimeTypes(editor, fileUploader.fileTypes)
      const processed = processMediaFiles(files, acceptableMimeTypes)
      processed.forEach((item) => {
        editor.dispatchCommand(INSERT_MEDIA_COMMAND, item)
      })
    },
    [editor, fileUploader],
  )

  // override the default Lexical drop handler because we always want to insert
  // where the selection was left rather than where the drop happened (matches mobiledoc editor)
  React.useEffect(() => {
    return editor.registerCommand(
      DROP_COMMAND,
      (event) => {
        if (!event.dataTransfer) {
          return false
        }
        const files = Array.from(event.dataTransfer.files)

        if (files.length > 0) {
          event.preventDefault()
          event.stopPropagation()
          editor.dispatchCommand(DRAG_DROP_PASTE, files)
          return true
        }

        return false
      },
      COMMAND_PRIORITY_HIGH,
    )
  }, [editor])

  // prevent drag over moving the cursor - our drops use the original selection
  // rather than the drop location
  React.useEffect(() => {
    const rootElement = editor.getRootElement()
    const handleDragOver = (event: DragEvent) => {
      const target = event.target as HTMLElement | null
      if (!event.dataTransfer || target?.closest('[data-inkling-card]')) {
        return
      }

      event.stopPropagation()
      event.preventDefault()
    }

    const handleDragLeave = (event: DragEvent) => {
      event.preventDefault()
    }

    const handleDrop = (event: DragEvent) => {
      // handle image drop from a browser window
      const { dataTransfer } = event
      if (!dataTransfer) {
        return
      }
      const html = dataTransfer.getData(MIME_TEXT_HTML)
      if (html) {
        event.preventDefault()

        editor.update(() => {
          editor.focus()
          let selection = $getSelection()
          if (!selection) {
            $getRoot().selectEnd()
            selection = $getSelection()
          }
          $insertDataTransferForRichText(dataTransfer, selection as BaseSelection, editor)
        })
      }
    }

    if (!rootElement) {
      return
    }

    rootElement.addEventListener('dragover', handleDragOver)
    rootElement.addEventListener('dragleave', handleDragLeave)
    rootElement.addEventListener('drop', handleDrop)

    return () => {
      rootElement.removeEventListener('dragover', handleDragOver)
      rootElement.removeEventListener('dragleave', handleDragLeave)
      rootElement.removeEventListener('drop', handleDrop)
    }
  }, [editor])

  React.useEffect(() => {
    return editor.registerCommand(
      DRAG_DROP_PASTE,
      (files) => {
        editor.focus()
        handleFileUpload(files)
        return false
      },
      COMMAND_PRIORITY_LOW,
    )
  }, [editor, handleFileUpload])

  return null
}

export default DragDropPastePlugin
