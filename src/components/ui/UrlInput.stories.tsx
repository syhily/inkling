import type { Meta, StoryFn } from '@storybook/react'

import { UrlInput } from '@/components/ui/UrlInput'

// oxlint-disable-next-line typescript/no-explicit-any
const story: Meta<any> = {
  title: 'Generic/URL Input',
  component: UrlInput,
  parameters: {
    status: {
      type: 'uiReady',
    },
  },
}
export default story

// oxlint-disable-next-line typescript/no-explicit-any
const Template: StoryFn<any> = (args) => (
  <div className="w-[740px]">
    <div className="p-4">
      <UrlInput {...args} />
    </div>
    <div className="dark bg-black p-4">
      <UrlInput {...args} />
    </div>
  </div>
)

export const Empty = Template.bind({})
Empty.args = {
  value: '',
  onChange: () => {},
}

export const Loading = Template.bind({})
Loading.args = {
  value: 'https://inkling.local/',
  onChange: () => {},
  isLoading: true,
}

export const Placeholder = Template.bind({})
Placeholder.args = {
  value: '',
  onChange: () => {},
  placeholder: 'Enter a URL to add content...',
}

export const Populated = Template.bind({})
Populated.args = {
  value: 'https://sampleurl.com',
  onChange: () => {},
}

export const Error = Template.bind({})
Error.args = {
  value: 'thisisntaurl',
  hasError: true,
  onChange: () => {},
  handleRetry: () => {},
  handlePasteAsLink: () => {},
}
