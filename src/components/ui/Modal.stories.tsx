import type { Meta, StoryFn } from '@storybook/react'

import { useState } from 'react'

import { Modal } from '@/components/ui/Modal'

// oxlint-disable-next-line typescript/no-explicit-any
const story: Meta<any> = {
  title: 'Generic/Modal',
  component: Modal,
  parameters: {
    status: {
      type: 'functional',
    },
  },
}
export default story

// oxlint-disable-next-line typescript/no-explicit-any
const Template: StoryFn<any> = (args) => {
  const [isOpen, setOpen] = useState(false)

  const openModal = () => setOpen(true)
  const closeModal = () => setOpen(false)

  return (
    <div className="relative mt-[2px] ml-[66px]">
      <button type="button" onClick={openModal}>
        Open modal
      </button>

      <Modal isOpen={isOpen} onClose={closeModal}>
        <div className="p-8">
          <h1>Headline</h1>
          Some content
        </div>
      </Modal>
    </div>
  )
}

export const Default = Template.bind({})
