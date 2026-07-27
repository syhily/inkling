import type { NodeKey } from 'lexical'

import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext'
import React from 'react'

import type { FileUploader } from '@/context/InklingHostIntegrationContext'
import type { UseFileDragAndDropResult } from '@/hooks/useFileDragAndDrop'
import type { TriggerFileDialogCardNode } from '@/hooks/useTriggerFileDialog'
import type { UploadFn } from '@/utils/upload-intent'

import InklingHostIntegrationContext from '@/context/InklingHostIntegrationContext'
import useFileDragAndDrop from '@/hooks/useFileDragAndDrop'
import { useInitialFileUpload } from '@/hooks/useInitialFileUpload'
import { useTriggerFileDialog } from '@/hooks/useTriggerFileDialog'

// Media-card upload wiring — the one owner of the per-channel skeleton the
// media cards used to hand-copy: the host uploader for one media kind, the
// file-drag handler, the initial-file kickoff, the insert-time file-dialog
// trigger, the hidden-input ref, and the change-event adapter. Per-card
// variance arrives as data: the card's intent call (`onFiles`, told which
// of the three sources fired — the input reset policies diverge per
// source), the initial-file readiness guard, the dialog trigger, and the
// drag-disabled gate. A card with several upload channels (audio's
// thumbnail, video's custom thumbnail) composes one hook per channel; the
// card's own intent calls stay with the card.

export type MediaUploadKind = 'image' | 'video' | 'audio' | 'file' | 'mediaThumbnail'
export type MediaUploader = ReturnType<FileUploader['useFileUpload']>

/** Which entry point fired: the hidden input, a file drop, or the initial file. */
export type MediaUploadSource = 'input' | 'drop' | 'initial'

export interface UseMediaCardUploadOptions {
  kind: MediaUploadKind
  nodeKey: NodeKey
  /** The card-node type guard the dialog trigger narrows with (e.g. `$isImageNode`). */
  guard: (node: unknown) => boolean
  /** The card's intent call, given the channel's upload fn and the firing source. */
  onFiles: (files: FileList | File[] | null, upload: UploadFn, source: MediaUploadSource) => unknown
  /** Insert-time initial file (media cards constructed from a paste/drop). */
  initialFile?: File | null
  /** The card's own initial-file kickoff guard, as data (image `!src`, video `!isLoading`, …). Defaults to ready. */
  isReady?: (uploader: MediaUploader) => boolean
  /** Open the picker on insert (the card's transient flag). */
  triggerFileDialog?: boolean
  /** Disable the drag handler (audio's thumbnail channel gates on edit mode). */
  dragDisabled?: boolean
}

export interface UseMediaCardUploadResult {
  uploader: MediaUploader
  fileInputRef: React.RefObject<HTMLInputElement | null>
  dragHandler: UseFileDragAndDropResult
  onFileChange: (files: FileList | File[] | null) => void
  /** The intent runner itself — for out-of-band sources (image's data-URL migration uses 'initial'). */
  runFiles: (files: FileList | File[] | null, source: MediaUploadSource) => void
  mimeTypes: string[] | undefined
}

export function useMediaCardUpload({
  kind,
  nodeKey,
  guard,
  onFiles,
  initialFile,
  isReady,
  triggerFileDialog,
  dragDisabled = false,
}: UseMediaCardUploadOptions): UseMediaCardUploadResult {
  const [editor] = useLexicalComposerContext()
  const { fileUploader } = React.useContext(InklingHostIntegrationContext)
  // host-provided hook seam: the composer contract requires useFileUpload to
  // be identity-stable for the editor's lifetime, so this call is the same
  // function every render (the compiler cannot verify context provenance)
  // oxlint-disable-next-line react/react-compiler -- host-provided hook; identity is a composer contract
  const uploader = fileUploader.useFileUpload(kind)
  const fileInputRef = React.useRef<HTMLInputElement | null>(null)

  const runFiles = React.useCallback(
    (files: FileList | File[] | null, source: MediaUploadSource) => {
      onFiles(files, uploader.upload, source)
    },
    [onFiles, uploader.upload],
  )

  const dragHandler = useFileDragAndDrop({
    handleDrop: (files) => runFiles(files, 'drop'),
    disabled: dragDisabled,
  })

  useInitialFileUpload({
    initialFile,
    isReady: isReady?.(uploader) ?? true,
    run: (file) => runFiles([file], 'initial'),
  })

  useTriggerFileDialog({
    editor,
    nodeKey,
    guard: guard as (node: unknown) => node is TriggerFileDialogCardNode,
    fileInputRef,
    triggerFileDialog,
  })

  const onFileChange = React.useCallback(
    (files: FileList | File[] | null) => {
      if (!files || files.length === 0) {
        return
      }
      runFiles(files, 'input')
    },
    [runFiles],
  )

  // a mediaThumbnail channel picks image files (the audio/video thumbnail
  // inputs), matching the cards' historical `fileTypes.image` lookups
  const fileTypesKey = kind === 'mediaThumbnail' ? 'image' : kind
  return {
    uploader,
    fileInputRef,
    dragHandler,
    onFileChange,
    runFiles,
    mimeTypes: fileUploader.fileTypes?.[fileTypesKey]?.mimeTypes,
  }
}
