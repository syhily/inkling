import type { Meta, StoryFn } from '@storybook/react'

import AudioCardIcon from '@/assets/icons/inkling-card-type-audio.svg?react'
import BookmarkCardIcon from '@/assets/icons/inkling-card-type-bookmark.svg?react'
import ButtonCardIcon from '@/assets/icons/inkling-card-type-button.svg?react'
import CalloutCardIcon from '@/assets/icons/inkling-card-type-callout.svg?react'
import DividerCardIcon from '@/assets/icons/inkling-card-type-divider.svg?react'
import FileCardIcon from '@/assets/icons/inkling-card-type-file.svg?react'
import GalleryCardIcon from '@/assets/icons/inkling-card-type-gallery.svg?react'
import GifCardIcon from '@/assets/icons/inkling-card-type-gif.svg?react'
import HeaderCardIcon from '@/assets/icons/inkling-card-type-header.svg?react'
import HtmlCardIcon from '@/assets/icons/inkling-card-type-html.svg?react'
import ImageCardIcon from '@/assets/icons/inkling-card-type-image.svg?react'
import NftCardIcon from '@/assets/icons/inkling-card-type-nft.svg?react'
import ToggleCardIcon from '@/assets/icons/inkling-card-type-toggle.svg?react'
import TwitterCardIcon from '@/assets/icons/inkling-card-type-twitter.svg?react'
import UnsplashCardIcon from '@/assets/icons/inkling-card-type-unsplash.svg?react'
import VideoCardIcon from '@/assets/icons/inkling-card-type-video.svg?react'
import { CardMenu, CardMenuItem, CardMenuSection, CardSnippetItem } from '@/components/ui/CardMenu'

export default {
  title: 'Components/Card menu',
  component: CardMenu,
  subcomponents: { CardMenuSection, CardMenuItem, CardSnippetItem },
  render: (args) => (
    <CardMenu {...args}>
      <CardMenuSection label="Primary" />
      <CardMenuItem desc="Upload, or embed with /image [url]" Icon={ImageCardIcon} label="Image" />
      <CardMenuItem desc="Insert a raw HTML card" Icon={HtmlCardIcon} label="HTML" />
      <CardMenuItem desc="Create an image gallery" Icon={GalleryCardIcon} label="Gallery" />
      <CardMenuItem desc="Insert a dividing line" Icon={DividerCardIcon} label="Divider" />
      <CardMenuItem desc="Embed a link as a visual bookmark" Icon={BookmarkCardIcon} label="Bookmark" />
      <CardMenuItem desc="Add a button to your post" Icon={ButtonCardIcon} label="Button" />
      <CardMenuItem desc="Info boxes that stand out" Icon={CalloutCardIcon} label="Callout" />
      <CardMenuItem desc="Search and embed gifs" Icon={GifCardIcon} label="GIF" />
      <CardMenuItem desc="Add collapsible content" Icon={ToggleCardIcon} label="Toggle" />
      <CardMenuItem desc="Upload and play a video" Icon={VideoCardIcon} label="Video" />
      <CardMenuItem desc="Upload and play an audio file" Icon={AudioCardIcon} label="Audio" />
      <CardMenuItem desc="Upload a downloadable file" Icon={FileCardIcon} label="File" />
      <CardMenuItem desc="Add a bold section header" Icon={HeaderCardIcon} label="Header" />
      <CardMenuSection label="Embed" />
      <CardMenuItem desc="/twitter [tweet url]" Icon={TwitterCardIcon} label="Twitter" />
      <CardMenuItem desc="/unsplash [search-term or url]" Icon={UnsplashCardIcon} label="Unsplash" />
      <CardMenuItem desc="/nft [opensea url]" Icon={NftCardIcon} label="NFT" />
      <CardMenuSection label="Snippets" />
      <CardSnippetItem label="Snippet one" />
      <CardSnippetItem label="Snippet two" />
    </CardMenu>
  ),
} as Meta<typeof CardMenu>

const Template: StoryFn<typeof CardMenu> = (args) => <CardMenu {...args} />

export const Default = Template.bind({})
Default.args = {
  menu: new Map([
    [
      'Primary',
      [
        { label: 'Image', desc: 'Upload, or embed with /image [url]', Icon: ImageCardIcon },
        { label: 'HTML', desc: 'Insert a raw HTML card', Icon: HtmlCardIcon },
        { label: 'Gallery', desc: 'Create an image gallery', Icon: GalleryCardIcon },
        { label: 'Divider', desc: 'Insert a dividing line', Icon: DividerCardIcon },
        { label: 'Bookmark', desc: 'Embed a link as a visual bookmark', Icon: BookmarkCardIcon },
        { label: 'Button', desc: 'Add a button to your post', Icon: ButtonCardIcon },
        { label: 'Callout', desc: 'Info boxes that stand out', Icon: CalloutCardIcon },
        { label: 'GIF', desc: 'Search and embed gifs', Icon: GifCardIcon },
        { label: 'Toggle', desc: 'Add collapsible content', Icon: ToggleCardIcon },
        { label: 'Video', desc: 'Upload and play a video', Icon: VideoCardIcon },
        { label: 'Audio', desc: 'Upload and play an audio file', Icon: AudioCardIcon },
        { label: 'File', desc: 'Upload a downloadable file', Icon: FileCardIcon },
        { label: 'Header', desc: 'Add a bold section header', Icon: HeaderCardIcon },
      ],
    ],
    [
      'Embed',
      [
        { label: 'Twitter', desc: '/twitter [tweet url]', Icon: TwitterCardIcon },
        { label: 'Unsplash', desc: '/unsplash [search-term or url]', Icon: UnsplashCardIcon },
        { label: 'NFT', desc: '/nft [opensea url]', Icon: NftCardIcon },
      ],
    ],
    [
      'Snippets',
      [
        { type: 'snippet', label: 'Snippet one' },
        { type: 'snippet', label: 'Snippet two' },
      ],
    ],
  ]),
}
