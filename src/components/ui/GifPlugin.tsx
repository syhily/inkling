import type { NodeKey } from 'lexical'

import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext'
import React from 'react'

import GifSelector from '@/components/ui/GifSelector'
import InklingHostIntegrationContext from '@/context/InklingHostIntegrationContext'
import { DELETE_CARD_COMMAND } from '@/plugins/behaviour/commands'
import { INSERT_FROM_GIF_COMMAND } from '@/plugins/InklingSelectorPlugin'
import { getGifProviderConfig, useGif, type GifProviderConfig } from '@/utils/services/gif'

interface GifPluginProps {
  nodeKey: NodeKey
}

const GifPlugin = ({ nodeKey }: GifPluginProps) => {
  const { cardConfig } = React.useContext(InklingHostIntegrationContext)
  const providerConfig = getGifProviderConfig(cardConfig)

  // a host can enable the GIF menu item with a config object whose keys are
  // all missing (e.g. `{ tenor: {} }`), which resolves to no provider
  if (!providerConfig) {
    return null
  }

  return <GifPluginSelector nodeKey={nodeKey} providerConfig={providerConfig} />
}

const GifPluginSelector = ({ nodeKey, providerConfig }: { nodeKey: NodeKey; providerConfig: GifProviderConfig }) => {
  const gifHook = useGif({ config: providerConfig })
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

  const insertImageToNode = async (image: { src: string; width: number; height: number }) => {
    editor.dispatchCommand(INSERT_FROM_GIF_COMMAND, image)
  }

  return (
    <GifSelector
      provider={providerConfig.provider}
      onClickOutside={onClickOutside}
      onGifInsert={insertImageToNode}
      {...gifHook}
    />
  )
}

export default GifPlugin
