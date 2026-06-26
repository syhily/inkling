import React, { useState } from 'react'

import PlusIcon from '@/assets/icons/plus.svg?react'
import { Tooltip } from '@/components/ui/Tooltip'
import { useClickOutside } from '@/hooks/useClickOutside'
import { usePreviousFocus } from '@/hooks/usePreviousFocus'

interface ColorOptionButton {
  name: string
  label?: string
  color?: string
}

interface ColorOptionButtonsProps {
  buttons?: ColorOptionButton[]
  selectedName?: string
  onClick: (name: string) => void
}

export function ColorOptionButtons({ buttons = [], selectedName, onClick }: ColorOptionButtonsProps) {
  const [isOpen, setIsOpen] = useState(false)
  const componentRef = React.useRef<HTMLDivElement | null>(null)

  const selectedButton = buttons.find((button) => button.name === selectedName)

  // Close the swatch popover when clicking outside of it
  useClickOutside(isOpen, componentRef, () => setIsOpen(false))

  return (
    <div ref={componentRef} className="relative">
      <button
        className={`size-6 relative cursor-pointer rounded-full ${selectedName ? 'p-[2px]' : 'border-grey-200 dark:border-grey-800 border'}`}
        data-testid="color-options-button"
        type="button"
        onClick={() => setIsOpen(!isOpen)}
      >
        {selectedName && (
          <div
            className="inset-0 absolute rounded-full bg-clip-content p-[3px]"
            style={{
              background:
                'conic-gradient(hsl(360,100%,50%),hsl(315,100%,50%),hsl(270,100%,50%),hsl(225,100%,50%),hsl(180,100%,50%),hsl(135,100%,50%),hsl(90,100%,50%),hsl(45,100%,50%),hsl(0,100%,50%))',
              WebkitMask: 'linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)',
              WebkitMaskComposite: 'xor',
              mask: 'linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)',
              maskComposite: 'exclude',
            }}
          />
        )}
        <span
          className={`${selectedButton?.color || ''} border-white dark:border-grey-950 block size-full rounded-full border-2`}
        ></span>
      </button>

      {/* Color options popover */}
      {isOpen && (
        <div
          className="-right-3 mb-2 rounded-lg bg-white px-3 py-2 shadow dark:bg-grey-900 absolute bottom-full z-10"
          data-testid="color-options-popover"
        >
          <div className="flex">
            <ul className="rounded-md font-sans text-md font-normal text-white flex w-full items-center justify-between">
              {buttons.map((button: ColorOptionButton) => {
                const { label, name, color } = button
                return name !== 'image' ? (
                  <ColorButton
                    key={`${name}-${label}`}
                    color={color}
                    data-testid={`color-options-${name}-button`}
                    label={label}
                    name={name}
                    selectedName={selectedName}
                    onClick={(title) => {
                      onClick(title)
                      setIsOpen(false)
                    }}
                  />
                ) : (
                  <li
                    key="background-image"
                    className={`mb-0 flex size-[3rem] cursor-pointer items-center justify-center rounded-full border-2 ${selectedName === name ? 'border-green' : 'border-transparent'}`}
                    data-testid="background-image-color-button"
                    onClick={() => onClick(name)}
                  >
                    <span className="size-6 border-black/5 flex items-center justify-center rounded-full border border-1">
                      <PlusIcon className="size-3 stroke-grey-700 dark:stroke-grey-500 dark:group-hover:stroke-grey-100 stroke-2" />
                    </span>
                  </li>
                )
              })}
            </ul>
          </div>
        </div>
      )}
    </div>
  )
}

interface ColorButtonProps {
  onClick: (name: string) => void
  label?: string
  name: string
  color?: string
  selectedName?: string
}

export function ColorButton({ onClick, label, name, color, selectedName }: ColorButtonProps) {
  const isActive = name === selectedName

  const { handleMousedown, handleClick } = usePreviousFocus(onClick as (name?: string) => void, name)
  return (
    <li className="mb-0">
      <button
        aria-label={label}
        className={`group size-6 relative flex cursor-pointer items-center justify-center rounded-full border-2 ${isActive ? 'border-green' : 'border-transparent'}`}
        data-testid={`color-picker-${name}`}
        type="button"
        onClick={handleClick}
        onMouseDown={handleMousedown}
      >
        <span className={`${color} size-[1.8rem] rounded-full border`}></span>
        <Tooltip label={label} />
      </button>
    </li>
  )
}
