import PlayIcon from '@/assets/icons/inkling-play.svg?react'
import UnmuteIcon from '@/assets/icons/inkling-unmute.svg?react'

interface MediaPlayerProps {
  type?: string
  duration?: string
  theme?: 'light' | 'dark'
  [key: string]: unknown
}

export function MediaPlayer({ type, duration, theme, ...args }: MediaPlayerProps) {
  return (
    <div className="py-2 mt-auto flex w-full items-center" {...args}>
      <PlayIcon className={`mr-2 size-[1.4rem] ${theme === 'light' ? 'fill-white' : 'fill-black dark:fill-white'}`} />
      <div
        className={`font-sans text-sm font-medium mb-[1px] ${theme === 'light' ? 'text-white/60' : 'text-black/50 dark:text-white/50'} `}
      >
        <span className={`${theme === 'light' ? 'text-white' : 'text-black dark:text-white'}`}>0:00 </span>/{' '}
        <span data-testid="media-duration">{duration}</span>
      </div>
      {/* <input type="range" max="100" value="0" className="relative grow bg-transparent mx-1" /> */}
      <div
        className={`mx-2 h-1 rounded relative grow ${theme === 'light' ? 'bg-white/40' : 'bg-grey/30 dark:bg-white/40'}`}
      >
        <button
          className="left-0 size-4 border-grey/50 bg-white shadow absolute top-[-6px] rounded-full border"
          type="button"
        ></button>
      </div>
      <button
        className={`mr-4 px-1 font-sans text-sm font-medium mb-[1px] ${theme === 'light' ? 'text-white' : 'text-current'}`}
        type="button"
      >
        1&#215;
      </button>
      <button type="button">
        <UnmuteIcon className={`${theme === 'light' ? 'fill-white' : 'fill-black dark:fill-black'}`} />
      </button>
      <div
        className={`ml-1 h-1 rounded relative w-[80px] ${theme === 'light' ? 'bg-white/40' : 'bg-grey/30 dark:bg-white/40'}`}
      >
        <div
          className={`left-0 h-1 rounded absolute w-[60%] ${theme === 'light' ? 'bg-white' : 'bg-black dark:bg-white'}`}
        ></div>
        <button
          className="size-4 border-grey/50 bg-white shadow absolute top-[-6px] left-[55%] rounded-full border"
          type="button"
        ></button>
      </div>
    </div>
  )
}
