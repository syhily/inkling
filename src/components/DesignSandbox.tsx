import '@/styles/index.css'
import React, { useState } from 'react'

import AddIcon from '@/assets/icons/inkling-add.svg?react'
import BoldIcon from '@/assets/icons/inkling-bold.svg?react'
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
import SnippetCardIcon from '@/assets/icons/inkling-card-type-snippet.svg?react'
import ToggleCardIcon from '@/assets/icons/inkling-card-type-toggle.svg?react'
import TwitterCardIcon from '@/assets/icons/inkling-card-type-twitter.svg?react'
import UnsplashCardIcon from '@/assets/icons/inkling-card-type-unsplash.svg?react'
import VideoCardIcon from '@/assets/icons/inkling-card-type-video.svg?react'
import GalleryPlaceholderIcon from '@/assets/icons/inkling-gallery-placeholder.svg?react'
import HeadingTwoIcon from '@/assets/icons/inkling-heading-2.svg?react'
import HeadingThreeIcon from '@/assets/icons/inkling-heading-3.svg?react'
import ImgFullIcon from '@/assets/icons/inkling-img-full.svg?react'
import ImgPlaceholderIcon from '@/assets/icons/inkling-img-placeholder.svg?react'
import ImgRegularIcon from '@/assets/icons/inkling-img-regular.svg?react'
import ImgWideIcon from '@/assets/icons/inkling-img-wide.svg?react'
import ItalicIcon from '@/assets/icons/inkling-italic.svg?react'
import LinkIcon from '@/assets/icons/inkling-link.svg?react'
import QuoteIcon from '@/assets/icons/inkling-quote.svg?react'
import ReplaceIcon from '@/assets/icons/inkling-replace.svg?react'
import SnippetIcon from '@/assets/icons/inkling-snippet.svg?react'
import PlusIcon from '@/assets/icons/plus.svg?react'

const DesignSandbox = () => {
  return (
    <div className="inkling-lexical">
      <ComponentTitle label="Text toolbar" />
      <TextToolbar />

      <ComponentTitle label="Image toolbar" />
      <ImageToolbar />

      <ComponentTitle label="Gallery toolbar" />
      <GalleryToolbar />

      <ComponentTitle label="Plus menu" />
      <PlusButton />

      <ComponentTitle label="Card menu" />
      <CardMenu />

      <ComponentTitle label="Divider card" />
      <div className="relative max-w-[740px]">
        <DividerCard />
      </div>

      <ComponentTitle label="Code block" />
      <div className="relative max-w-[740px]">
        <CodeBlock />
      </div>

      <ComponentTitle label="Image card" />
      <div className="relative max-w-[740px]">
        <ImageCard />
      </div>

      <ComponentTitle label="Gallery card" />
      <div className="relative max-w-[1172px]">
        <GalleryCard />
      </div>
    </div>
  )

  /* Component title
    /* ---------------------------------------------------------- */

  function ComponentTitle({ label }: { label: string }) {
    return <h3 className="mb-4 mt-20 text-xl font-bold first-of-type:mt-8">{label}</h3>
  }

  /* Floating toolbar
    /* ---------------------------------------------------------- */

  function TextToolbar() {
    return (
      <div className="max-w-fit">
        <ul className="m-0 rounded bg-black px-1 py-0 font-sans text-md font-normal text-white flex items-center justify-evenly">
          <ToolbarItem Icon={BoldIcon} label="Format text as bold" />
          <ToolbarItem Icon={ItalicIcon} label="Format text as italics" />
          <ToolbarItem Icon={HeadingTwoIcon} label="Toggle heading 1" />
          <ToolbarItem Icon={HeadingThreeIcon} label="Toggle heading 2" />
          <ToolbarSeparator />
          <ToolbarItem Icon={QuoteIcon} label="Toggle blockquote" />
          <ToolbarItem Icon={LinkIcon} label="Insert link" />
          <ToolbarSeparator />
          <ToolbarItem Icon={SnippetIcon} label="Save as snippet" />
        </ul>
      </div>
    )
  }

  function ImageToolbar() {
    return (
      <div className="max-w-fit">
        <ul className="m-0 rounded bg-black px-1 py-0 font-sans text-md font-normal text-white flex items-center justify-evenly">
          <ToolbarItem Icon={ImgRegularIcon} label="Set image to regular" />
          <ToolbarItem Icon={ImgWideIcon} label="Set image to wide" />
          <ToolbarItem Icon={ImgFullIcon} label="Set image to full" />
          <ToolbarSeparator />
          <ToolbarItem Icon={LinkIcon} label="Insert link" />
          <ToolbarItem Icon={ReplaceIcon} label="Replace image" />
          <ToolbarSeparator />
          <ToolbarItem Icon={SnippetIcon} label="Save as snippet" />
        </ul>
      </div>
    )
  }

  function GalleryToolbar() {
    return (
      <div className="max-w-fit">
        <ul className="m-0 rounded bg-black px-1 py-0 font-sans text-md font-normal text-white flex items-center justify-evenly">
          <ToolbarItem Icon={AddIcon} label="Add image" />
          <ToolbarSeparator />
          <ToolbarItem Icon={SnippetIcon} label="Save as snippet" />
        </ul>
      </div>
    )
  }

  function ToolbarItem({
    label,
    Icon,
    ...props
  }: {
    label: string
    Icon: React.ComponentType<React.SVGProps<SVGSVGElement>>
    [key: string]: unknown
  }) {
    return (
      <li className="m-0 p-0 first:m-0 flex" {...props}>
        <div className="size-9 flex items-center justify-center">
          <Icon className="fill-white" />
        </div>
      </li>
    )
  }

  function ToolbarSeparator() {
    return <li className="m-0 mx-1 h-5 bg-grey-900 w-px"></li>
  }

  /* Plus button
    /* ---------------------------------------------------------- */

  function PlusButton() {
    return (
      <button
        aria-label="Add a card"
        className="group size-7 border-grey bg-white hover:border-grey-900 md:size-9 relative flex cursor-pointer items-center justify-center rounded-full border transition-all ease-linear"
        type="button"
      >
        <PlusIcon className="size-4 stroke-grey-800 group-hover:stroke-grey-900 stroke-2" />
      </button>
    )
  }

  /* Card menu
    /* ---------------------------------------------------------- */

  function CardMenu() {
    return (
      <div className="m-0 mb-3 rounded-lg bg-white p-0 text-sm shadow z-[9999999] max-h-[376px] w-[312px] flex-col overflow-y-auto bg-clip-padding">
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
        <CardSnippetItem Icon={SnippetCardIcon} label="A random snippet" />
      </div>
    )
  }

  function CardMenuSection({ label, ...props }: { label: string; [key: string]: unknown }) {
    return (
      <div
        className="mb-2 px-4 pt-3 text-2xs font-medium text-grey flex shrink-0 flex-col justify-center tracking-[.06rem] uppercase"
        style={{ minWidth: 'calc(100% - 3.2rem)' }}
        {...props}
      >
        {label}
      </div>
    )
  }

  function CardMenuItem({
    label,
    desc,
    Icon,
    ...props
  }: {
    label: string
    desc: string
    Icon: React.ComponentType<React.SVGProps<SVGSVGElement>>
    [key: string]: unknown
  }) {
    return (
      <div
        className="px-4 py-2 text-grey-800 hover:bg-grey-100 flex cursor-pointer flex-row items-center border border-transparent"
        {...props}
      >
        <div className="flex items-center">
          <Icon className="size-7" />
        </div>
        <div className="flex flex-col">
          <div className="m-0 ml-4 font-normal text-grey-900 truncate text-[1.3rem] leading-[1.333em] tracking-[.02rem]">
            {label}
          </div>
          <div className="m-0 ml-4 text-2xs font-normal text-grey truncate leading-[1.333em] tracking-[.02rem]">
            {desc}
          </div>
        </div>
      </div>
    )
  }

  function CardSnippetItem({
    label,
    Icon,
    ...props
  }: {
    label: string
    Icon: React.ComponentType<React.SVGProps<SVGSVGElement>>
    [key: string]: unknown
  }) {
    return (
      <div
        className="px-4 py-2 text-grey-800 hover:bg-grey-100 flex cursor-pointer flex-row items-center border border-transparent"
        {...props}
      >
        <div className="flex items-center">
          <Icon className="size-7" />
        </div>
        <div className="flex flex-col">
          <div className="m-0 ml-4 font-normal text-grey-900 truncate text-[1.3rem] leading-[1.333em] tracking-[.02rem]">
            {label}
          </div>
        </div>
      </div>
    )
  }

  /* Divider card
    /* ---------------------------------------------------------- */

  function DividerCard() {
    return (
      <div>
        <hr className="border-grey-300 block h-[1px] border-0 border-t" />
      </div>
    )
  }

  /* Code block
    /* ---------------------------------------------------------- */

  function CodeBlock() {
    return (
      <div className="border-green border-2">
        <div className="rounded bg-grey-50 px-3 py-2">
          <textarea className="bg-grey-50 font-mono w-full resize-none text-[1.7rem]" />
        </div>
        <CaptionEditor placeholder="Type caption for code block (optional)" />
      </div>
    )
  }

  /* Image card
    /* ---------------------------------------------------------- */

  function ImageCard() {
    const [isActive, setActive] = useState(false)
    const [altText, setAltText] = useState(false)

    const toggleActive = () => {
      setActive(!isActive)
    }

    const toggleAltText = (e: React.MouseEvent) => {
      e.stopPropagation()
      setAltText(!altText)
    }

    if (isActive) {
      return (
        <div
          className={`border border-transparent ${isActive ? 'shadow-[0_0_0_2px_#30cf43]' : 'hover:shadow-[0_0_0_1px_#30cf43]'}`}
          onClick={toggleActive}
        >
          <MediaPlaceholder desc="Click to select an image" Icon={ImgPlaceholderIcon} />
          <CaptionEditor placeholder="Type caption for image (optional)" />
          <button
            className={`bottom-0 right-0 m-3 rounded px-1 font-normal leading-7 tracking-wide absolute cursor-pointer border text-[1.3rem] transition-all duration-100 ${altText ? 'border-green bg-green text-white' : 'border-grey text-grey'} `}
            type="button"
            onClick={(e) => toggleAltText(e)}
          >
            Alt
          </button>
        </div>
      )
    }
    return (
      <div
        className={`border border-transparent ${isActive ? 'shadow-[0_0_0_2px_#30cf43]' : 'hover:shadow-[0_0_0_1px_#30cf43]'}`}
        onClick={toggleActive}
      >
        <MediaPlaceholder desc="Click to select an image" Icon={ImgPlaceholderIcon} />
      </div>
    )
  }

  function MediaPlaceholder({
    desc,
    Icon,
    ...props
  }: {
    desc: string
    Icon: React.ComponentType<React.SVGProps<SVGSVGElement>>
    [key: string]: unknown
  }) {
    return (
      <div className="relative">
        <figure className="cursor-pointer border border-transparent" {...props}>
          <div className="h-100 border-grey-100 bg-grey-50 relative flex items-center justify-center border before:pb-[62.5%]">
            <button className="group p-20 flex flex-col items-center justify-center" type="button">
              <Icon className="size-32 opacity-80 transition-all ease-linear group-hover:scale-105 group-hover:opacity-100" />
              <p className="mt-4 text-sm font-normal text-grey-700 group-hover:text-grey-800">{desc}</p>
            </button>
          </div>
        </figure>
        <form>
          <input accept="image/*" hidden={true} name="image" type="file" />
        </form>
      </div>
    )
  }

  function CaptionEditor({ placeholder }: { placeholder: string }) {
    return (
      <input
        className="not-inkling-prose p-2 font-sans text-sm font-normal tracking-wide text-grey-900 w-full text-center"
        placeholder={placeholder}
      />
    )
  }

  /* Gallery card
    /* ---------------------------------------------------------- */

  function GalleryCard() {
    return (
      <div className="border-green border-2">
        <MediaPlaceholder desc="Click to select up to 9 images" Icon={GalleryPlaceholderIcon} />
        <CaptionEditor placeholder="Type caption for gallery (optional)" />
      </div>
    )
  }
}

export default DesignSandbox
