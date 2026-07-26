import { createCommand } from 'lexical'

import { defineCard, type DecoratorNodeProperty, generateDecoratorNode } from '@/'

export const INSERT_MUSIC_PLAYER_COMMAND = createCommand('INSERT_MUSIC_PLAYER_COMMAND')

const musicPlayerProperties = [{ name: 'src', default: '' }] as const satisfies readonly DecoratorNodeProperty[]

// The host-side base node, built through the same generateDecoratorNode entry
// the built-in cards use — a stub defaultRenderFn keeps the exportDOM
// contract honest without vendoring a renderer.
const BaseMusicPlayerNode = generateDecoratorNode({
  nodeType: 'musicPlayer',
  properties: musicPlayerProperties,
  defaultRenderFn: (_, context) => {
    const document = context.createDocument()

    const element = document.createElement('div')
    element.className = 'inkling-music-player-card'
    return { element, type: 'outer' as const }
  },
})

function MusicPlayerCard() {
  return (
    <div className="flex h-24 items-center justify-center rounded-md border border-grey-200 bg-grey-50 font-sans text-sm text-grey-600 dark:border-grey-800 dark:bg-grey-900 dark:text-grey-300">
      Music player
    </div>
  )
}

// A host card (CONTEXT.md: "host card") declared through the public seam:
// this single defineCard call registers the assembled node class, the slash
// menu entry, the insert command, the decorate render, and the toolbar label.
// Runs at module top level, before the composer mounts.
export const musicPlayer = defineCard({
  nodeType: 'musicPlayer',
  baseNode: BaseMusicPlayerNode,
  insert: { command: INSERT_MUSIC_PLAYER_COMMAND },
  menu: [
    { label: 'Music', labelKey: 'music', icon: 'audio', command: INSERT_MUSIC_PLAYER_COMMAND, matches: ['music'] },
  ],
  toolbarLabel: 'music-player',
  render: () => <MusicPlayerCard />,
})
