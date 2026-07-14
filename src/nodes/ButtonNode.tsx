import { createCommand } from 'lexical'

import ButtonCardIcon from '@/assets/icons/inkling-card-type-button.svg?react'
import InklingCardWrapper from '@/components/InklingCardWrapper'
import { ButtonNode as BaseButtonNode } from '@/nodes/base'
import { ButtonNodeComponent } from '@/nodes/ButtonNodeComponent'

export const INSERT_BUTTON_COMMAND = createCommand('INSERT_BUTTON_COMMAND')

interface ButtonDataset {
  [key: string]: unknown
}

export class ButtonNode extends BaseButtonNode {
  static cardMenu = [
    {
      label: 'Button',
      desc: 'Call-to-action button',
      Icon: ButtonCardIcon,
      insertCommand: INSERT_BUTTON_COMMAND,
      insertParams: {},
      matches: ['button', 'btn'],
      priority: 16,
      shortcut: '/button',
    },
  ]

  constructor(dataset: ButtonDataset = {}, key?: string) {
    // oxlint-disable-next-line typescript/no-explicit-any
    super(dataset as Partial<Record<string, unknown>>, key)
  }

  getIcon() {
    return ButtonCardIcon
  }

  decorate() {
    return (
      <InklingCardWrapper nodeKey={this.getKey()} width="regular">
        <ButtonNodeComponent
          alignment={this.alignment ?? 'center'}
          buttonText={this.buttonText ?? ''}
          buttonUrl={this.buttonUrl ?? ''}
          nodeKey={this.getKey()}
        />
      </InklingCardWrapper>
    )
  }
}

export const $createButtonNode = (dataset?: ButtonDataset): ButtonNode => {
  return new ButtonNode(dataset)
}

export function $isButtonNode(node: unknown): node is ButtonNode {
  return node instanceof ButtonNode
}
