import type { Meta, StoryObj } from '@storybook/react'

import GifSelector, { type GifSelectorProps } from '@/components/ui/GifSelector'
import { getGifProviderConfig, useGif, type GifProviderConfig } from '@/utils/services/gif'

import { tenorConfig } from '../../../demo/utils/gifConfig'

const meta = {
  title: 'File Selectors/Gif',
  component: GifSelector,
  parameters: {
    status: {
      type: 'Functional',
    },
  },
  args: {
    onGifInsert: () => {},
    onClickOutside: () => {},
    updateSearch: () => {},
    columns: [],
    isLoading: false,
    isLazyLoading: false,
    error: null,
    changeColumnCount: () => {},
    loadNextPage: () => {},
    gifs: [],
    provider: 'tenor',
  },
} satisfies Meta<typeof GifSelector>
export default meta

type Story = StoryObj<typeof meta>

function GifSelectorStory(args: GifSelectorProps) {
  const config = getGifProviderConfig({ tenor: tenorConfig ?? undefined })
  if (!config) {
    return null
  }
  return <GifSelectorWithConfig args={args} config={config} />
}

function GifSelectorWithConfig({ args, config }: { args: GifSelectorProps; config: GifProviderConfig }) {
  const gifHook = useGif({ config })

  return <GifSelector {...gifHook} {...args} />
}

export const Base: Story = {
  render: (args) => <GifSelectorStory {...args} />,
}

export const Loading: Story = {
  args: {
    isLoading: true,
    isLazyLoading: false,
  },
  render: (args) => <GifSelectorStory {...args} />,
}

export const LazyLoading: Story = {
  args: {
    isLoading: true,
    isLazyLoading: true,
    loadNextPage: () => {},
  },
  render: (args) => <GifSelectorStory {...args} />,
}

export const ErrorCommon: Story = {
  args: {
    error: 'common',
  },
  render: (args) => <GifSelectorStory {...args} />,
}

export const ErrorInvalidKey: Story = {
  args: {
    error: 'invalid_key',
  },
  render: (args) => <GifSelectorStory {...args} />,
}

export const ErrorSpecific: Story = {
  args: {
    error: 'Something went wrong',
  },
  render: (args) => <GifSelectorStory {...args} />,
}
