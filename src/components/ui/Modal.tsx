import CloseIcon from '@/assets/icons/inkling-close.svg?react'
import Portal from '@/components/ui/Portal'

export function Modal({
  isOpen,
  onClose,
  children,
}: {
  isOpen?: boolean
  onClose: () => void
  children?: React.ReactNode
}) {
  const controlByKeys = (event: React.KeyboardEvent) => {
    event.stopPropagation()
    event.preventDefault()

    if (event.key === 'Escape') {
      onClose()
    }
  }

  if (!isOpen) {
    return null
  }

  return (
    <Portal>
      <div
        className="left-0 top-0 fixed z-40 flex size-full items-start justify-center overflow-auto"
        role="dialog"
        aria-modal
        onKeyDown={controlByKeys}
      >
        <div className="inset-0 bg-black fixed z-40 h-[100vh] opacity-60" onClick={onClose}></div>
        <div className="my-8 rounded-lg bg-white drop-shadow-2xl dark:bg-black relative z-50 w-full max-w-[550px]">
          <button aria-label="Close dialog" className="right-6 top-6 absolute cursor-pointer" type="button" autoFocus>
            <CloseIcon className="size-4 text-grey-400 stroke-2" onClick={onClose} />
          </button>
          {children}
        </div>
      </div>
    </Portal>
  )
}
