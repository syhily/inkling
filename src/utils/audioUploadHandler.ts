import { $getNodeByKey, type LexicalEditor, type NodeKey } from 'lexical'

import { GeneratedDecoratorNodeBase } from '@/nodes/base'
import { getAudioMetadata } from '@/utils/getAudioMetadata'
import prettifyFileName from '@/utils/prettifyFileName'
import { revokePreviewUrl } from '@/utils/revokePreviewUrl'

type UploadFn = (files: FileList | File[]) => Promise<Array<{ url?: string }> | undefined>

export const audioUploadHandler = async (
  files: FileList | File[] | null,
  nodeKey: NodeKey,
  editor: LexicalEditor,
  upload: UploadFn,
): Promise<void> => {
  if (!files) {
    return
  }

  // read file into an object URL so we can grab extra metadata
  const objectURL = URL.createObjectURL(files[0])

  try {
    // perform the actual upload
    const result = await upload(files)
    const fileSrc = result?.[0]?.url

    if (!fileSrc) {
      return
    }

    // grab basic metadata from the file directly
    const filename = files[0].name
    const title = prettifyFileName(filename)

    const mimeType = files[0].type
    const { duration } = await getAudioMetadata(objectURL)

    await editor.update(() => {
      const node = $getNodeByKey(nodeKey)
      if (node) {
        const n = node as GeneratedDecoratorNodeBase
        n.duration = duration
        n.src = fileSrc
        n.mimeType = mimeType
        n.title = title
      }
    })
  } finally {
    revokePreviewUrl(objectURL)
  }

  return
}
