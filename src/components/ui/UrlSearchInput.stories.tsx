import type { Meta, StoryObj } from '@storybook/react'

import { UrlSearchInput } from '@/components/ui/UrlSearchInput'

const meta = {
  title: 'Generic/Searchable URL Input',
  component: UrlSearchInput,
  parameters: {
    status: {
      type: 'uiReady',
    },
  },
} satisfies Meta<typeof UrlSearchInput>
export default meta

type Story = StoryObj<typeof meta>

const baseArgs = {
  handleUrlChange: () => {},
  handleUrlSubmit: () => {},
  handlePasteAsLink: () => {},
  handleRetry: () => {},
  handleClose: () => {},
  searchLinks: () => Promise.resolve(undefined),
}

export const Empty: Story = {
  args: {
    ...baseArgs,
    value: '',
  },
  render: (args) => (
    <div className="w-[740px]">
      <div className="p-4">
        <UrlSearchInput {...args} />
      </div>
      <div className="dark bg-black p-4">
        <UrlSearchInput {...args} />
      </div>
    </div>
  ),
}

export const Loading: Story = {
  args: {
    ...baseArgs,
    value: 'https://inkling.local/',
    isLoading: true,
  },
  render: (args) => (
    <div className="w-[740px]">
      <div className="p-4">
        <UrlSearchInput {...args} />
      </div>
      <div className="dark bg-black p-4">
        <UrlSearchInput {...args} />
      </div>
    </div>
  ),
}

export const Placeholder: Story = {
  args: {
    ...baseArgs,
    value: '',
    placeholder: 'Enter a URL to add content...',
  },
  render: (args) => (
    <div className="w-[740px]">
      <div className="p-4">
        <UrlSearchInput {...args} />
      </div>
      <div className="dark bg-black p-4">
        <UrlSearchInput {...args} />
      </div>
    </div>
  ),
}

export const Populated: Story = {
  args: {
    ...baseArgs,
    value: 'https://sampleurl.com',
  },
  render: (args) => (
    <div className="w-[740px]">
      <div className="p-4">
        <UrlSearchInput {...args} />
      </div>
      <div className="dark bg-black p-4">
        <UrlSearchInput {...args} />
      </div>
    </div>
  ),
}

export const Error: Story = {
  args: {
    ...baseArgs,
    value: 'thisisntaurl',
    hasError: true,
  },
  render: (args) => (
    <div className="w-[740px]">
      <div className="p-4">
        <UrlSearchInput {...args} />
      </div>
      <div className="dark bg-black p-4">
        <UrlSearchInput {...args} />
      </div>
    </div>
  ),
}
