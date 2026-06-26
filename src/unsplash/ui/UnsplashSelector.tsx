import { ChangeEvent, FunctionComponent, ReactNode } from 'react'

import UnsplashIcon from '@/unsplash/assets/inkling-card-type-unsplash.svg?react'
import CloseIcon from '@/unsplash/assets/inkling-close.svg?react'
import SearchIcon from '@/unsplash/assets/inkling-search.svg?react'

interface UnsplashSelectorProps {
  closeModal: () => void
  handleSearch: (e: ChangeEvent<HTMLInputElement>) => void
  children: ReactNode
}

const UnsplashSelector: FunctionComponent<UnsplashSelectorProps> = ({ closeModal, handleSearch, children }) => {
  return (
    <>
      <div className="inset-0 bg-black fixed z-40 h-[100vh] opacity-60"></div>
      <div
        className="not-inkling-prose inset-8 rounded bg-white shadow-xl fixed z-50 overflow-hidden"
        data-inkling-modal="unsplash"
      >
        <button className="right-6 top-6 absolute cursor-pointer" type="button">
          <CloseIcon
            className="text-grey-400 size-4 stroke-2"
            data-inkling-modal-close-button
            onClick={() => closeModal()}
          />
        </button>
        <div className="flex h-full flex-col">
          <header className="px-20 py-10 flex shrink-0 items-center justify-between">
            <h1 className="gap-2 font-sans text-3xl font-bold text-black flex items-center">
              <UnsplashIcon className="mb-1" />
              Unsplash
            </h1>
            <div className="max-w-sm relative w-full">
              <SearchIcon className="text-grey-700 left-4 size-4 -translate-y-2 absolute top-1/2" />
              <input
                className="border-grey-300 focus:border-grey-400 h-10 pl-10 pr-8 font-sans text-md font-normal text-black w-full rounded-full border border-solid focus-visible:outline-none"
                placeholder="Search free high-resolution photos"
                autoFocus
                data-inkling-unsplash-search
                onChange={handleSearch}
              />
            </div>
          </header>
          {children}
        </div>
      </div>
    </>
  )
}

export default UnsplashSelector
