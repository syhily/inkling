import type React from 'react'

import TrashIcon from '@/assets/icons/inkling-trash.svg?react'
import FileUploadIcon from '@/assets/icons/inkling-upload-fill.svg?react'
import { ProgressBar } from '@/components/ui/ProgressBar'

function FileUploading({ progress }: { progress?: number }) {
  const progressStyle = {
    width: `${progress?.toFixed(0)}%`,
  }

  return (
    <div className="h-full border border-transparent">
      <div className="border-grey/20 bg-grey-50 dark:bg-grey-900 relative flex h-[120px] items-center justify-center border before:pb-[12.5%]">
        <div className="flex w-full items-center justify-center overflow-hidden">
          <ProgressBar style={progressStyle} />
        </div>
      </div>
    </div>
  )
}

export function BackgroundImagePicker({
  onFileChange,
  backgroundImageSrc,
  type,
  handleClearBackgroundImage,
  fileInputRef,
  openFilePicker,
  isUploading,
  progress,
}: {
  // oxlint-disable-next-line typescript/no-explicit-any
  onFileChange?: (e: any) => void
  backgroundImageSrc?: string
  type?: string
  handleClearBackgroundImage?: () => void
  fileInputRef?: React.RefObject<HTMLInputElement>
  openFilePicker?: () => void
  isUploading?: boolean
  progress?: number
}) {
  if (isUploading) {
    return <FileUploading progress={progress} />
  }
  return (
    <>
      <form onChange={onFileChange}>
        <input ref={fileInputRef} accept="image/*" hidden={true} name="image-input" type="file" />
      </form>
      {type === 'image' && (
        <div className="w-full">
          <div className="relative">
            <div className="flex w-full items-center justify-center">
              {backgroundImageSrc ? (
                <>
                  <div className="group mb-4 rounded-md relative w-full">
                    <div className="inset-0 rounded-md from-black/0 via-black/5 to-black/30 absolute bg-gradient-to-t opacity-0 transition-all group-hover:opacity-100"></div>
                    <div className="right-5 top-5 absolute flex opacity-0 transition-all group-hover:opacity-100">
                      <button
                        className="h-8 w-9 rounded-md bg-white/90 hover:bg-white pointer-events-auto flex cursor-pointer items-center justify-center transition-all"
                        type="button"
                        onClick={handleClearBackgroundImage}
                      >
                        <TrashIcon className="size-5 fill-grey-900 stroke-[3px] transition-all ease-linear group-hover:scale-105" />
                      </button>
                    </div>
                    <img
                      alt="backgroundHeaderImage"
                      className="max-h-64 rounded-md w-full object-cover"
                      data-testid="image-picker-background"
                      src={backgroundImageSrc}
                    />
                  </div>
                </>
              ) : (
                <button
                  className="group rounded-md border-grey-100 bg-grey-50 dark:border-grey-800 dark:bg-grey-900 flex h-[120px] w-full cursor-pointer flex-col items-center justify-center border"
                  type="button"
                  onClick={openFilePicker}
                >
                  <FileUploadIcon className="size-5 fill-grey-700 stroke-[3px] transition-all ease-linear group-hover:scale-105" />
                  <span className="px-1 font-medium text-grey-700 text-[1.35rem]">
                    Click to upload background image
                  </span>
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  )
}
