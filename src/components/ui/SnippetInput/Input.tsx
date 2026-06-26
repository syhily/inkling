import CloseIcon from '@/assets/icons/inkling-close.svg?react'

export const Input = ({
  value,
  onChange,
  onClear,
  onKeyDown,
}: {
  value?: string
  onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void
  onClear?: () => void
  onKeyDown?: (e: React.KeyboardEvent) => void
}) => {
  return (
    <div className="m-0 gap-1 rounded-lg bg-white font-sans text-md font-normal text-black shadow-md dark:bg-grey-950 relative flex items-center justify-evenly">
      <input
        autoComplete="off"
        autoFocus={true}
        className={`bg-white py-1 pl-3 pr-9 font-normal leading-loose text-grey-900 selection:bg-grey/40 dark:bg-grey-950 dark:text-grey-100 dark:placeholder:text-grey-800 mb-[1px] h-auto w-full ${value ? 'rounded-t rounded-b-none' : 'rounded'}`}
        data-testid="snippet-name"
        placeholder="Snippet name"
        value={value ?? ''}
        data-1p-ignore
        onChange={onChange}
        onKeyDown={onKeyDown}
      />
      <button aria-label="Close" className="right-3 absolute cursor-pointer" type="button" onClick={onClear}>
        <CloseIcon className="size-3 text-grey stroke-2" />
      </button>
    </div>
  )
}
