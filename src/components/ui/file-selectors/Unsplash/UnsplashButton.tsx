import DownloadIcon from '@/assets/icons/inkling-download.svg?react'
import UnsplashHeartIcon from '@/assets/icons/inkling-unsplash-heart.svg?react'

const BUTTON_ICONS: Record<string, typeof UnsplashHeartIcon> = {
  heart: UnsplashHeartIcon,
  download: DownloadIcon,
}

function UnsplashButton({
  icon,
  label,
  ...props
}: {
  icon?: keyof typeof BUTTON_ICONS
  label?: string
  [key: string]: unknown
}) {
  const Icon = BUTTON_ICONS[icon as keyof typeof BUTTON_ICONS]

  return (
    <a
      className="h-8 rounded-md bg-white px-3 py-2 font-sans text-sm font-medium leading-6 text-grey-700 ease-in-out first-of-type:mr-3 flex shrink-0 cursor-pointer items-center opacity-90 transition-all hover:opacity-100"
      type="button"
      onClick={(e) => e.stopPropagation()}
      {...props}
    >
      {icon && <Icon className={`size-4 fill-red stroke-[3px] ${label && 'mr-1'}`} />}
      {label && <span>{label}</span>}
    </a>
  )
}

export default UnsplashButton
