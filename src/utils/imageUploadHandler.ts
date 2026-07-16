import { type EditorState, type LexicalEditor, type NodeKey } from 'lexical'

import { $isImageNode, $updateCardNode } from '@/nodes/base'
import { getImageDimensions } from '@/utils/getImageDimensions'
import { revokePreviewUrl } from '@/utils/revokePreviewUrl'

type UploadFn = (files: FileList | File[]) => Promise<Array<{ url?: string }> | undefined>

export const imageUploadHandler = async (
  files: FileList | File[] | null,
  nodeKey: NodeKey,
  editor: LexicalEditor,
  upload: UploadFn,
): Promise<void> => {
  if (!files) {
    return
  }

  // show preview via an object URL whilst upload is in progress
  const previewUrl = URL.createObjectURL(files[0])

  try {
    await editor.update(() => {
      $updateCardNode(nodeKey, $isImageNode, (node) => {
        node.previewSrc = previewUrl
      })
    })

    // use the local object URL to grab metadata
    const { width, height } = await getImageDimensions(previewUrl)

    // perform the actual upload
    const result = await upload(files)
    const imageSrc = result?.[0]?.url

    // replace preview URL with real URL and set image metadata
    await editor.update(() => {
      $updateCardNode(nodeKey, $isImageNode, (node) => {
        node.width = width
        node.height = height
        node.src = imageSrc ?? ''
        node.previewSrc = null
      })
    })
  } finally {
    revokePreviewUrl(previewUrl)
  }

  return
}

export interface BackgroundImageUploadResult {
  imageSrc: string | undefined
  width: number
  height: number
}

export const backgroundImageUploadHandler = async (
  files: FileList | File[] | null,
  upload: UploadFn,
): Promise<BackgroundImageUploadResult | undefined> => {
  if (!files) {
    return
  }
  const result = await upload(files)
  const imageSrc = result?.[0]?.url

  if (!imageSrc) {
    return undefined
  }

  const { width, height } = await getImageDimensions(imageSrc)

  return {
    imageSrc,
    width,
    height,
  }
}

// EditorState import retained for tree-shake visibility
export type { EditorState }
