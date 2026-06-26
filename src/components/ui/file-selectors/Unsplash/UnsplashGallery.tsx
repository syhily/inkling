import type React from 'react'

import type { UnsplashImagePayload } from '@/components/ui/file-selectors/Unsplash/types'

import UnsplashImage from '@/components/ui/file-selectors/Unsplash/UnsplashImage'
import UnsplashZoomed from '@/components/ui/file-selectors/Unsplash/UnsplashZoomed'

function UnsplashGalleryLoading() {
  return (
    <div
      className="inset-y-0 left-0 absolute flex w-full items-center justify-center overflow-hidden pb-[8vh]"
      data-inkling-loader
    >
      <div className="animate-spin border-black/10 before:bg-grey-800 relative inline-block size-[50px] rounded-full border before:z-10 before:mt-[7px] before:block before:size-[7px] before:rounded-full"></div>
    </div>
  )
}

export function MasonryColumn(props: { children?: React.ReactNode }) {
  return <div className="mr-6 basis-0 last-of-type:mr-0 flex grow flex-col justify-start">{props.children}</div>
}

export function UnsplashGalleryColumns(props: {
  columns?: UnsplashImagePayload[][]
  insertImage?: (data: UnsplashImagePayload) => void
  selectImg?: (data: UnsplashImagePayload | null) => void
  zoomed?: UnsplashImagePayload
}) {
  if (!props?.columns) {
    return null
  }

  return props?.columns.map((array: UnsplashImagePayload[], index: number) => (
    // oxlint-disable-next-line react/no-array-index-key
    <MasonryColumn key={index}>
      {array.map((payload: UnsplashImagePayload) => (
        <UnsplashImage
          key={payload.id}
          alt={payload.alt_description}
          height={payload.height}
          insertImage={props?.insertImage}
          likes={payload.likes}
          links={payload.links}
          payload={payload}
          selectImg={props?.selectImg}
          srcUrl={payload.urls?.regular}
          urls={payload.urls}
          user={payload.user}
          width={payload.width}
          zoomed={props?.zoomed}
        />
      ))}
    </MasonryColumn>
  ))
}

export function GalleryLayout(props: {
  galleryRef?: React.Ref<HTMLDivElement>
  zoomed?: UnsplashImagePayload
  isLoading?: boolean
  dataset?: UnsplashImagePayload[][]
  children?: React.ReactNode
}) {
  return (
    <div className="relative h-full overflow-hidden" data-inkling-unsplash-gallery>
      <div
        ref={props.galleryRef}
        className={`px-20 flex size-full justify-center overflow-auto ${props?.zoomed ? 'pb-10' : ''}`}
        data-inkling-unsplash-gallery-scrollref
      >
        {props.children}
        {props?.isLoading && <UnsplashGalleryLoading />}
      </div>
    </div>
  )
}

function UnsplashGallery({
  zoomed,
  error,
  galleryRef,
  isLoading,
  dataset,
  selectImg,
  insertImage,
}: {
  zoomed?: UnsplashImagePayload
  error?: string
  galleryRef?: React.Ref<HTMLDivElement>
  isLoading?: boolean
  dataset?: UnsplashImagePayload[][]
  selectImg?: (data: UnsplashImagePayload | null) => void
  insertImage?: (data: UnsplashImagePayload) => void
}) {
  if (zoomed) {
    return (
      <GalleryLayout galleryRef={galleryRef} zoomed={zoomed}>
        <UnsplashZoomed insertImage={insertImage} payload={zoomed} selectImg={selectImg} zoomed={zoomed} />
      </GalleryLayout>
    )
  }

  if (error) {
    return (
      <GalleryLayout galleryRef={galleryRef} zoomed={zoomed}>
        <div className="flex h-full flex-col items-center justify-center">
          <h1 className="mb-4 text-2xl font-bold">Error</h1>
          <p className="text-lg font-medium">{error}</p>
        </div>
      </GalleryLayout>
    )
  }

  return (
    <GalleryLayout dataset={dataset} galleryRef={galleryRef} isLoading={isLoading} zoomed={zoomed}>
      <UnsplashGalleryColumns columns={dataset} insertImage={insertImage} selectImg={selectImg} zoomed={zoomed} />
    </GalleryLayout>
  )
}

export default UnsplashGallery
