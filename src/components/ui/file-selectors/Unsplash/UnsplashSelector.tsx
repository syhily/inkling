import type React from 'react'

import UnsplashIcon from '@/assets/icons/inkling-card-type-unsplash.svg?react'
import CloseIcon from '@/assets/icons/inkling-close.svg?react'
import SearchIcon from '@/assets/icons/inkling-search.svg?react'

function UnsplashSelector({
  closeModal,
  handleSearch,
  children,
  galleryRef,
}: {
  closeModal?: () => void
  handleSearch?: (e: React.ChangeEvent<HTMLInputElement>) => void
  children?: React.ReactNode // oxlint-disable-next-line typescript/no-explicit-any
  galleryRef?: React.Ref<any>
}) {
  return (
    <>
      <div className="inset-0 bg-black fixed z-40 h-[100vh] opacity-60"></div>
      <div
        ref={galleryRef}
        className="not-inkling-prose inset-8 rounded-lg bg-white shadow-xl fixed z-50 overflow-hidden"
        data-inkling-modal="unsplash"
      >
        <button className="right-6 top-6 absolute cursor-pointer" type="button">
          <CloseIcon
            className="size-4 text-grey-400 stroke-2"
            data-inkling-modal-close-button
            onClick={() => closeModal?.()}
          />
        </button>
        <div className="flex h-full flex-col">
          <header className="px-20 py-10 flex shrink-0 items-center justify-between">
            <h1 className="gap-2 font-sans text-3xl font-bold text-black flex items-center">
              <UnsplashIcon className="mb-1" />
              Unsplash
            </h1>
            <div className="max-w-sm relative w-full">
              <SearchIcon className="left-4 size-4 -translate-y-2 text-grey-700 absolute top-1/2" />
              <input
                className="h-10 border-grey-300 pl-10 pr-8 font-sans text-md font-normal text-black focus:border-grey-400 w-full rounded-full border focus-visible:outline-none"
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
