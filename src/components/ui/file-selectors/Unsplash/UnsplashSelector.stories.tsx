import type { Meta, StoryFn } from '@storybook/react'

import { GalleryLayout, MasonryColumn } from '@/components/ui/file-selectors/Unsplash/UnsplashGallery'
import UnsplashImage from '@/components/ui/file-selectors/Unsplash/UnsplashImage'
import UnsplashSelector from '@/components/ui/file-selectors/Unsplash/UnsplashSelector'
import UnsplashZoomed from '@/components/ui/file-selectors/Unsplash/UnsplashZoomed'

// oxlint-disable-next-line typescript/no-explicit-any
const story: Meta<any> = {
  title: 'File Selectors/Unsplash',
  component: UnsplashSelector,
  parameters: {
    status: {
      type: 'functional',
    },
  },
}
export default story

// oxlint-disable-next-line typescript/no-explicit-any
const GalleryTemplate: StoryFn<any> = (args) => {
  return (
    <div className="inkling-prose">
      <div className="my-8 mx-auto w-full min-w-[initial]">
        <UnsplashSelector>
          <GalleryLayout>
            <MasonryColumn>
              <UnsplashImage {...args} />
              <UnsplashImage {...args} />
              <UnsplashImage {...args} />
              <UnsplashImage {...args} />
              <UnsplashImage {...args} />
              <UnsplashImage {...args} />
            </MasonryColumn>
            <MasonryColumn>
              <UnsplashImage {...args} />
              <UnsplashImage {...args} />
              <UnsplashImage {...args} />
              <UnsplashImage {...args} />
              <UnsplashImage {...args} />
              <UnsplashImage {...args} />
            </MasonryColumn>
            <MasonryColumn>
              <UnsplashImage {...args} />
              <UnsplashImage {...args} />
              <UnsplashImage {...args} />
              <UnsplashImage {...args} />
              <UnsplashImage {...args} />
              <UnsplashImage {...args} />
            </MasonryColumn>
          </GalleryLayout>
        </UnsplashSelector>
      </div>
    </div>
  )
}

export const Gallery = GalleryTemplate.bind({})

Gallery.args = {
  zoomed: false,
  isLoading: false,
  selectImg: () => {},
  insertImage: () => {},
  closeModal: () => {},
  srcUrl:
    'https://images.unsplash.com/photo-1670171336566-6f08f1fbf648?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=MnwxMTc3M3wwfDF8YWxsfDJ8fHx8fHwyfHwxNjcwMjI0MDg4&ixlib=rb-4.0.3&q=80&w=1080',
  alt: 'alt text here',
  links: {
    download: 'https://unsplash.com/photos/OudVFouGJmM/download?ixid=MnwxMTc3M3wwfDF8YWxsfDJ8fHx8fHwyfHwxNjcwMjI0MDg4',
    html: 'https://unsplash.com/photos/OudVFouGJmM',
    download_location:
      'https://api.unsplash.com/photos/OudVFouGJmM/download?ixid=MnwxMTc3M3wwfDF8YWxsfDJ8fHx8fHwyfHwxNjcwMjI0MDg4',
  },
  likes: 69,
  user: {
    name: 'John Doe',
    profile_image: {
      small:
        'https://images.unsplash.com/profile-1600184424687-de96bd61fa67image?ixlib=rb-4.0.3&crop=faces&fit=crop&w=32&h=32',
    },
  },
  urls: {
    regular:
      'https://images.unsplash.com/photo-1670171336566-6f08f1fbf648?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=MnwxMTc3M3wwfDF8YWxsfDJ8fHx8fHwyfHwxNjcwMjI0MDg4&ixlib=rb-4.0.3&q=80&w=1080',
  },
  height: 500,
  width: 500,
}

// oxlint-disable-next-line typescript/no-explicit-any
const ZoomedTemplate: StoryFn<any> = (args) => {
  return (
    <div className="w-full">
      <UnsplashSelector>
        <GalleryLayout {...args}>
          <UnsplashZoomed {...args} />
        </GalleryLayout>
      </UnsplashSelector>
    </div>
  )
}

export const Zoomed = ZoomedTemplate.bind({})

Zoomed.args = {
  zoomed: true,
  isLoading: false,
  payload: {
    srcUrl:
      'https://images.unsplash.com/photo-1670171336566-6f08f1fbf648?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=MnwxMTc3M3wwfDF8YWxsfDJ8fHx8fHwyfHwxNjcwMjI0MDg4&ixlib=rb-4.0.3&q=80&w=1080',
    alt: 'alt text here',
    links: {
      download:
        'https://unsplash.com/photos/OudVFouGJmM/download?ixid=MnwxMTc3M3wwfDF8YWxsfDJ8fHx8fHwyfHwxNjcwMjI0MDg4',
      html: 'https://unsplash.com/photos/OudVFouGJmM',
      download_location:
        'https://api.unsplash.com/photos/OudVFouGJmM/download?ixid=MnwxMTc3M3wwfDF8YWxsfDJ8fHx8fHwyfHwxNjcwMjI0MDg4',
    },
    likes: 69,
    user: {
      name: 'John Doe',
      profile_image: {
        small:
          'https://images.unsplash.com/profile-1600184424687-de96bd61fa67image?ixlib=rb-4.0.3&crop=faces&fit=crop&w=32&h=32',
      },
    },
    urls: {
      regular:
        'https://images.unsplash.com/photo-1670171336566-6f08f1fbf648?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=MnwxMTc3M3wwfDF8YWxsfDJ8fHx8fHwyfHwxNjcwMjI0MDg4&ixlib=rb-4.0.3&q=80&w=1080',
    },
    height: 500,
    width: 500,
  },
}
