import PlusIcon from '@/assets/icons/plus.svg?react'

export function PlusButton({ onClick }: { onClick?: () => void }) {
  return (
    <div className="xs:left-[-66px] absolute top-[-2px] left-[-32px]" data-inkling-plus-button>
      <button
        aria-label="Add a card"
        className="group size-7 border-grey hover:border-grey-800 dark:border-grey-800 dark:hover:border-grey-400 md:size-9 relative flex cursor-pointer items-center justify-center rounded-full border transition-all ease-linear"
        type="button"
        onClick={onClick}
      >
        <PlusIcon className="size-4 stroke-grey-800 dark:stroke-grey-300 stroke-2" />
      </button>
    </div>
  )
}

export function PlusMenu({ children }: { children?: React.ReactNode }) {
  return (
    <div className="absolute left-[-16px]" data-inkling-plus-menu>
      {children}
    </div>
  )
}
