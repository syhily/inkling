import type { Meta, StoryObj } from '@storybook/react'

import GifSelector, { type GifSelectorProps } from '@/components/ui/GifSelector'
import { getGifProviderConfig, useGif, type UseGifResult } from '@/utils/services/gif'

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
    config: tenorConfig,
  },
} satisfies Meta<typeof GifSelector>
export default meta

type Story = StoryObj<typeof meta>

function GifSelectorStory(args: GifSelectorProps) {
  const config = getGifProviderConfig({ tenor: tenorConfig ?? undefined })
  const gifHook = useGif({ config: config! })

  return <GifSelector {...(gifHook as UseGifResult)} {...args} />
}

export const Base: Story = {
  args: {
    config: tenorConfig,
  },
  render: (args) => <GifSelectorStory {...args} />,
}

export const Loading: Story = {
  args: {
    config: tenorConfig,
    isLoading: true,
    isLazyLoading: false,
  },
  render: (args) => <GifSelectorStory {...args} />,
}

export const LazyLoading: Story = {
  args: {
    config: tenorConfig,
    isLoading: true,
    isLazyLoading: true,
    loadNextPage: () => {},
  },
  render: (args) => <GifSelectorStory {...args} />,
}

export const ErrorCommon: Story = {
  args: {
    config: tenorConfig,
    error: 'common',
  },
  render: (args) => <GifSelectorStory {...args} />,
}

export const ErrorInvalidKey: Story = {
  args: {
    config: tenorConfig,
    error: 'invalid_key',
  },
  render: (args) => <GifSelectorStory {...args} />,
}

export const ErrorSpecific: Story = {
  args: {
    config: tenorConfig,
    error: 'Something went wrong',
  },
  render: (args) => <GifSelectorStory {...args} />,
}
