import clsx from 'clsx'

import ImgBgIcon from '@/assets/icons/inkling-img-bg.svg?react'
import { Tooltip } from '@/components/ui/Tooltip'

export const ImageUploadSwatch = ({
  showBackgroundImage,
  onClickHandler,
  dataTestId,
}: {
  showBackgroundImage?: boolean
  onClickHandler?: () => void
  dataTestId?: string
}) => {
  return (
    <button
      className={clsx(
        `group size-6 border-grey-300 bg-grey-100 text-black relative flex shrink-0 items-center justify-center rounded-full border`,
        showBackgroundImage && 'outline-green outline outline-2',
      )}
      data-testid={dataTestId}
      title="Image"
      type="button"
      onClick={onClickHandler}
    >
      <ImgBgIcon className="size-[1.4rem]" />
      <Tooltip label="Image" />
    </button>
  )
}
