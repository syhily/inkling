import type { NodeKey } from 'lexical'

import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext'
import { $getNodeByKey } from 'lexical'
import React from 'react'

import type { ImageNodeDataset } from '@/nodes/ImageNode'

import LibrarySelector from '@/components/ui/LibrarySelector'
import InklingHostIntegrationContext, {
  type ImageLibrarySettings,
  type LibraryImageItem,
} from '@/context/InklingHostIntegrationContext'
import { useLibraryBrowser } from '@/hooks/useLibraryBrowser'
import { DELETE_CARD_COMMAND } from '@/plugins/behaviour/commands'
import { INSERT_FROM_LIBRARY_COMMAND } from '@/plugins/InklingSelectorPlugin'

/**
 * The only field-mapping point of the library flow (docs/kobato-fit-plan.md
 * C8 §3.4): library item → insert dataset. The three host-schema keys are
 * included only when present; the stock image declaration silently ignores
 * them (its property set is fixed), and they persist only when the host
 * declares them as properties on its own card declaration.
 */
export function toImageDataset(item: LibraryImageItem): ImageNodeDataset {
  return {
    src: item.src,
    alt: item.alt ?? '',
    width: item.width ?? null,
    height: item.height ?? null,
    ...(item.thumbhash !== undefined && { thumbhash: item.thumbhash }),
    ...(item.storagePath !== undefined && { storagePath: item.storagePath }),
    ...(item.imageId !== undefined && { imageId: item.imageId }),
  }
}

interface LibraryPluginProps {
  nodeKey: NodeKey
}

// The image-library selector overlay, mounted as the placeholder node's
// transient `selector` component (the GifPlugin precedent): the overlay is
// open while the node exists; Escape / click-outside delete the placeholder.
const LibraryPlugin = ({ nodeKey }: LibraryPluginProps) => {
  const { cardConfig } = React.useContext(InklingHostIntegrationContext)
  const imageLibrary = cardConfig.imageLibrary

  // the menu entry is gated on the same config key, so an absent library
  // config means there is nothing to browse — render nothing
  if (!imageLibrary) {
    return null
  }

  return <LibraryPluginSelector nodeKey={nodeKey} imageLibrary={imageLibrary} />
}

const LibraryPluginSelector = ({ nodeKey, imageLibrary }: { nodeKey: NodeKey; imageLibrary: ImageLibrarySettings }) => {
  const browser = useLibraryBrowser({ search: imageLibrary.search })
  const [editor] = useLexicalComposerContext()

  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        editor.dispatchCommand(DELETE_CARD_COMMAND, { cardKey: nodeKey })
      }
    }

    window.addEventListener('keydown', handleKeyDown)

    return () => {
      window.removeEventListener('keydown', handleKeyDown)
    }

    // We only do this for init
    // oxlint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const onClickOutside = () => {
    editor.dispatchCommand(DELETE_CARD_COMMAND, { cardKey: nodeKey })
  }

  const onPick = (item: LibraryImageItem) => {
    // a host upload UX resolves asynchronously and can land after the picker
    // was cancelled (Escape / click-outside deleted the placeholder) — the
    // insert surgery replaces the placeholder, so there is nothing to do
    // once it is gone
    const placeholderExists = editor.getEditorState().read(() => $getNodeByKey(nodeKey) !== null)
    if (!placeholderExists) {
      return
    }
    editor.dispatchCommand(INSERT_FROM_LIBRARY_COMMAND, toImageDataset(item))
  }

  const onUpload = imageLibrary.upload
    ? async () => {
        // the host owns the whole upload UX; its resolution is the selection
        // (undefined = cancelled — the picker stays open)
        const item = await imageLibrary.upload?.()
        if (item) {
          onPick(item)
        }
      }
    : undefined

  return <LibrarySelector browser={browser} onClickOutside={onClickOutside} onPick={onPick} onUpload={onUpload} />
}

export default LibraryPlugin
