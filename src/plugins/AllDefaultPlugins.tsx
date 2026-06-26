import { ListPlugin } from '@lexical/react/LexicalListPlugin'

import AtLinkPlugin from '@/plugins/AtLinkPlugin'
import { AudioPlugin } from '@/plugins/AudioPlugin'
import { BookmarkPlugin } from '@/plugins/BookmarkPlugin'
import { ButtonPlugin } from '@/plugins/ButtonPlugin'
import { CalloutPlugin } from '@/plugins/CalloutPlugin'
import { CardMenuPlugin } from '@/plugins/CardMenuPlugin'
import EmEnDashPlugin from '@/plugins/EmEnDashPlugin'
import { EmojiPickerPlugin } from '@/plugins/EmojiPickerPlugin'
import { FilePlugin } from '@/plugins/FilePlugin'
import { GalleryPlugin } from '@/plugins/GalleryPlugin'
import { HeaderPlugin } from '@/plugins/HeaderPlugin'
import HorizontalRulePlugin from '@/plugins/HorizontalRulePlugin'
import HtmlPlugin from '@/plugins/HtmlPlugin'
import ImagePlugin from '@/plugins/ImagePlugin'
import InklingSelectorPlugin from '@/plugins/InklingSelectorPlugin'
import { InklingSnippetPlugin } from '@/plugins/InklingSnippetPlugin'
import { TogglePlugin } from '@/plugins/TogglePlugin'
import { VideoPlugin } from '@/plugins/VideoPlugin'

export const AllDefaultPlugins = () => {
  return (
    <>
      {/* Lexical Plugins */}
      <ListPlugin /> {/* adds indent/outdent/remove etc support */}
      {/* <TabIndentationPlugin /> tab/shift+tab triggers indent/outdent */}
      {/* Inkling Plugins */}
      <CardMenuPlugin />
      <InklingSnippetPlugin />
      <InklingSelectorPlugin /> {/* Gif/Unsplash selectors */}
      <EmojiPickerPlugin />
      <AtLinkPlugin />
      {/* Card Plugins */}
      <AudioPlugin />
      <ImagePlugin />
      <GalleryPlugin />
      <VideoPlugin />
      <EmEnDashPlugin />
      <HorizontalRulePlugin />
      <CalloutPlugin />
      <HtmlPlugin />
      <FilePlugin />
      <ButtonPlugin />
      <TogglePlugin />
      <HeaderPlugin />
      <BookmarkPlugin />
    </>
  )
}

export default AllDefaultPlugins
