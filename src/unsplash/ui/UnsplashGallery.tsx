import React, { ReactNode, RefObject } from 'react'

import UnsplashImage from '@/unsplash/ui/UnsplashImage'
import UnsplashZoomed from '@/unsplash/ui/UnsplashZoomed'
import { InsertImageFn, Photo, SelectImgFn } from '@/unsplash/UnsplashTypes'

interface MasonryColumnProps {
  children: ReactNode
}

interface UnsplashGalleryColumnsProps {
  columns?: Photo[][] | []
  insertImage: InsertImageFn
  selectImg: SelectImgFn
  zoomed?: Photo | null
}

interface GalleryLayoutProps {
  children?: ReactNode
  galleryRef: RefObject<HTMLDivElement | null>
  isLoading?: boolean
  zoomed?: Photo | null
}

interface UnsplashGalleryProps extends GalleryLayoutProps {
  error?: string | null
  dataset?: Photo[][] | []
  selectImg: SelectImgFn
  insertImage: InsertImageFn
}

const UnsplashGalleryLoading: React.FC = () => {
  return (
    <div
      className="inset-y-0 left-0 absolute flex w-full items-center justify-center overflow-hidden pb-[8vh]"
      data-inkling-loader
    >
      <div className="animate-spin before:bg-grey-800 border-black/10 relative inline-block size-[50px] rounded-full border before:z-10 before:mt-[7px] before:block before:size-[7px] before:rounded-full"></div>
    </div>
  )
}

export const MasonryColumn: React.FC<MasonryColumnProps> = (props) => {
  return <div className="mr-6 basis-0 last-of-type:mr-0 flex grow flex-col justify-start">{props.children}</div>
}

const UnsplashGalleryColumns: React.FC<UnsplashGalleryColumnsProps> = (props) => {
  if (!props?.columns) {
    return null
  }

  return props?.columns.map((array, index) => (
    <MasonryColumn key={array[0]?.id ?? `empty-${index}`}>
      {array.map((payload: Photo) => (
        <UnsplashImage
          key={payload.id}
          alt={payload.alt_description}
          height={payload.height}
          insertImage={props?.insertImage}
          likes={payload.likes}
          links={payload.links}
          payload={payload}
          selectImg={props?.selectImg}
          srcUrl={payload.urls.regular}
          urls={payload.urls}
          user={payload.user}
          width={payload.width}
          zoomed={props?.zoomed || null}
        />
      ))}
    </MasonryColumn>
  ))
}

const GalleryLayout: React.FC<GalleryLayoutProps> = (props) => {
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

const UnsplashGallery: React.FC<UnsplashGalleryProps> = ({
  zoomed,
  error,
  galleryRef,
  isLoading,
  dataset,
  selectImg,
  insertImage,
}) => {
  if (zoomed) {
    return (
      <GalleryLayout galleryRef={galleryRef} zoomed={zoomed}>
        <UnsplashZoomed
          alt={zoomed.alt_description}
          height={zoomed.height}
          insertImage={insertImage}
          likes={zoomed.likes}
          links={zoomed.links}
          payload={zoomed}
          selectImg={selectImg}
          srcUrl={zoomed.urls.regular}
          urls={zoomed.urls}
          user={zoomed.user}
          width={zoomed.width}
          zoomed={zoomed}
        />
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
    <GalleryLayout galleryRef={galleryRef} isLoading={isLoading} zoomed={zoomed}>
      <UnsplashGalleryColumns columns={dataset} insertImage={insertImage} selectImg={selectImg} zoomed={zoomed} />
    </GalleryLayout>
  )
}

export default UnsplashGallery
