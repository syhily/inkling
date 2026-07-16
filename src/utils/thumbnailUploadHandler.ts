import { $getNodeByKey, type LexicalEditor, type NodeKey } from 'lexical'

import { $isAudioNode, $updateCardNode } from '@/nodes/base'

type UploadFn = (
  files: FileList | File[],
  options?: { formData?: Record<string, string> },
) => Promise<Array<{ url?: string }> | undefined>

export const thumbnailUploadHandler = async (
  files: FileList | File[] | null,
  nodeKey: NodeKey,
  editor: LexicalEditor,
  upload: UploadFn,
): Promise<void> => {
  if (!files) {
    return
  }

  let mediaSrc = ''

  editor.getEditorState().read(() => {
    const node = $getNodeByKey(nodeKey)
    if ($isAudioNode(node)) {
      mediaSrc = node.src
    }
  })

  const uploadResult = await upload(files, { formData: { url: mediaSrc } })

  const thumbnailSrc = uploadResult?.[0]?.url

  await editor.update(() => {
    if (thumbnailSrc) {
      $updateCardNode(nodeKey, $isAudioNode, (node) => {
        node.thumbnailSrc = thumbnailSrc
      })
    }
  })

  return
}
