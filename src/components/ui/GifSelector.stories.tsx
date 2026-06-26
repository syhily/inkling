import type { Meta, StoryFn } from '@storybook/react'

import GifSelector, { type GifSelectorProps } from '@/components/ui/GifSelector'
import { getGifProviderConfig, useGif, type UseGifResult } from '@/utils/services/gif'

import { tenorConfig } from '../../../demo/utils/gifConfig'

const story: Meta<typeof GifSelector> = {
  title: 'File Selectors/Gif',
  component: GifSelector,
  parameters: {
    status: {
      type: 'Functional',
    },
  },
}
export default story

const Template: StoryFn<GifSelectorProps> = (args: GifSelectorProps) => {
  const config = getGifProviderConfig({ tenor: tenorConfig ?? undefined })
  const gifHook = useGif({ config: config! })

  return <GifSelector {...(gifHook as UseGifResult)} {...args} />
}

Template.args = {
  onGifInsert: () => {},
  onClickOutside: () => {},
  provider: 'tenor',
}

export const Base = Template.bind({})
Base.args = {
  config: tenorConfig,
}

export const Loading = Template.bind({})
Loading.args = {
  config: tenorConfig,
  isLoading: true,
  isLazyLoading: false,
}

export const LazyLoading = Template.bind({})
LazyLoading.args = {
  config: tenorConfig,
  isLoading: true,
  isLazyLoading: true,
  loadNextPage: () => {},
}

export const ErrorCommon = Template.bind({})
ErrorCommon.args = {
  config: tenorConfig,
  error: 'common',
}

export const ErrorInvalidKey = Template.bind({})
ErrorInvalidKey.args = {
  config: tenorConfig,
  error: 'invalid_key',
}

export const ErrorSpecific = Template.bind({})
ErrorSpecific.args = {
  config: tenorConfig,
  error: 'Something went wrong',
}
