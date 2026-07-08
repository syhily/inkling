import type { Meta, StoryObj } from '@storybook/react'

import { GalleryLayout, MasonryColumn } from '@/components/ui/file-selectors/Unsplash/UnsplashGallery'
import UnsplashImage from '@/components/ui/file-selectors/Unsplash/UnsplashImage'
import UnsplashSelector from '@/components/ui/file-selectors/Unsplash/UnsplashSelector'
import UnsplashZoomed from '@/components/ui/file-selectors/Unsplash/UnsplashZoomed'

const meta = {
  title: 'File Selectors/Unsplash',
  component: UnsplashImage,
  parameters: {
    status: {
      type: 'functional',
    },
  },
} satisfies Meta<typeof UnsplashImage>
export default meta

type Story = StoryObj<typeof meta>

const galleryImageArgs = {
  zoomed: undefined,
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

export const Gallery: Story = {
  args: galleryImageArgs,
  render: (args) => (
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
  ),
}

const payload = {
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

export const Zoomed: Story = {
  args: {
    payload,
    zoomed: payload,
    insertImage: () => {},
    selectImg: () => {},
  },
  render: (args) => (
    <div className="w-full">
      <UnsplashSelector>
        <GalleryLayout>
          <UnsplashZoomed {...args} />
        </GalleryLayout>
      </UnsplashSelector>
    </div>
  ),
}
