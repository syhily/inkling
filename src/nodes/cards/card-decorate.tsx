import type { LexicalNode } from 'lexical'
import type { ReactNode } from 'react'

import type { AudioNode } from '@/nodes/AudioNode'
import type { BookmarkNode } from '@/nodes/BookmarkNode'
import type { ButtonNode } from '@/nodes/ButtonNode'
import type { CalloutNode } from '@/nodes/CalloutNode'
import type { DecorateTargetSpec } from '@/nodes/cards/card-declaration'
import type { CodeBlockNode } from '@/nodes/CodeBlockNode'
import type { FileNode } from '@/nodes/FileNode'
import type { GalleryNode } from '@/nodes/GalleryNode'
import type { HeaderNode } from '@/nodes/HeaderNode'
import type { HorizontalRuleNode } from '@/nodes/HorizontalRuleNode'
import type { HtmlNode } from '@/nodes/HtmlNode'
import type { ImageNode } from '@/nodes/ImageNode'
import type { ToggleNode } from '@/nodes/ToggleNode'
import type { VideoNode } from '@/nodes/VideoNode'

import HtmlIndicatorIcon from '@/assets/icons/inkling-indicator-html.svg?react'
import { HorizontalRuleCard } from '@/components/ui/cards/HorizontalRuleCard'
import { AudioNodeComponent } from '@/nodes/AudioNodeComponent'
import { normalizeCardWidth } from '@/nodes/base/utils/card-widths'
import { BookmarkNodeComponent } from '@/nodes/BookmarkNodeComponent'
import { ButtonNodeComponent } from '@/nodes/ButtonNodeComponent'
import { CalloutNodeComponent } from '@/nodes/CalloutNodeComponent'
import { CARD_DECLARATIONS, type CardNodeType } from '@/nodes/cards'
import { CodeBlockNodeComponent } from '@/nodes/CodeBlockNodeComponent'
import FileNodeComponent from '@/nodes/FileNodeComponent'
import { GalleryNodeComponent } from '@/nodes/GalleryNodeComponent'
import HeaderNodeComponent from '@/nodes/header/HeaderNodeComponent'
import { HtmlNodeComponent } from '@/nodes/HtmlNodeComponent'
import { ImageNodeComponent } from '@/nodes/ImageNodeComponent'
import { ToggleNodeComponent } from '@/nodes/ToggleNodeComponent'
import { VideoNodeComponent } from '@/nodes/VideoNodeComponent'

/**
 * The per-card component renders, attached to their card declarations one
 * layer up (mirroring `@/nodes/cards/card-markdown-transformers`). These are
 * the React-bearing half of each card's decorate-target — the node→component
 * mappers that used to be the thirteen `decorate()` bodies. They cannot live
 * in the declaration modules: declarations must stay React-free, and the
 * wrapper props (width/wrapperStyle/indicator flag) already live there as
 * `decorateTarget` data.
 */
const DECORATE_RENDER = {
  audio: (node: AudioNode) => (
    <AudioNodeComponent
      duration={node.duration}
      initialFile={node.__initialFile}
      nodeKey={node.getKey()}
      src={node.src}
      thumbnailSrc={node.thumbnailSrc}
      title={node.title}
      triggerFileDialog={node.__triggerFileDialog}
    />
  ),
  bookmark: (node: BookmarkNode) => (
    <BookmarkNodeComponent
      author={node.author}
      captionEditor={node.__captionEditor}
      captionEditorInitialState={node.__captionEditorInitialState}
      createdWithUrl={node.__createdWithUrl}
      description={node.description}
      icon={node.icon}
      nodeKey={node.getKey()}
      publisher={node.publisher}
      thumbnail={node.thumbnail}
      title={node.title}
      url={node.url}
    />
  ),
  button: (node: ButtonNode) => (
    <ButtonNodeComponent
      alignment={node.alignment}
      buttonText={node.buttonText}
      buttonUrl={node.buttonUrl}
      nodeKey={node.getKey()}
    />
  ),
  callout: (node: CalloutNode) => {
    // Null only inside the headless markdown round-trip editor (the card
    // transformers null the nested editors after plain-text import), which
    // never reconciles decorators — guard so the field type stays honest.
    if (!node.__calloutTextEditor) {
      return null
    }

    return (
      <CalloutNodeComponent
        backgroundColor={node.backgroundColor}
        calloutEmoji={node.calloutEmoji}
        calloutTextEditor={node.__calloutTextEditor}
        calloutTextEditorInitialState={node.__calloutTextEditorInitialState}
        nodeKey={node.getKey()}
      />
    )
  },
  codeblock: (node: CodeBlockNode) => (
    <CodeBlockNodeComponent
      captionEditor={node.__captionEditor}
      captionEditorInitialState={node.__captionEditorInitialState}
      code={node.code}
      language={node.language}
      nodeKey={node.getKey()}
    />
  ),
  file: (node: FileNode) => (
    <FileNodeComponent
      fileDesc={node.fileCaption}
      fileDescPlaceholder={'Enter a description'}
      fileName={node.fileName}
      fileSize={node.formattedFileSize}
      fileSrc={node.src}
      fileTitle={node.fileTitle}
      fileTitlePlaceholder={'Enter a title'}
      initialFile={node.__initialFile}
      nodeKey={node.getKey()}
      triggerFileDialog={node.__triggerFileDialog}
    />
  ),
  gallery: (node: GalleryNode) => (
    <GalleryNodeComponent
      captionEditor={node.__captionEditor}
      captionEditorInitialState={node.__captionEditorInitialState}
      nodeKey={node.getKey()}
    />
  ),
  header: (node: HeaderNode) => (
    <HeaderNodeComponent
      accentColor={node.accentColor}
      alignment={node.alignment}
      backgroundColor={node.backgroundColor}
      backgroundImageHeight={node.backgroundImageHeight}
      backgroundImageSrc={node.backgroundImageSrc}
      backgroundImageWidth={node.backgroundImageWidth}
      backgroundSize={node.backgroundSize}
      buttonColor={node.buttonColor}
      buttonEnabled={node.buttonEnabled}
      buttonText={node.buttonText}
      buttonTextColor={node.buttonTextColor}
      buttonUrl={node.buttonUrl}
      header={node.header}
      headerTextEditor={node.__headerTextEditor}
      headerTextEditorState={node.__headerTextEditorInitialState}
      isSwapped={node.swapped}
      layout={node.layout}
      nodeKey={node.getKey()}
      subheader={node.subheader}
      subheaderTextEditor={node.__subheaderTextEditor}
      subheaderTextEditorInitialState={node.__subheaderTextEditorInitialState}
      subheaderTextEditorState={node.__subheaderTextEditorInitialState}
      textColor={node.textColor}
    />
  ),
  horizontalrule: (_node: HorizontalRuleNode) => <HorizontalRuleCard />,
  html: (node: HtmlNode) => <HtmlNodeComponent html={node.html} nodeKey={node.getKey()} />,
  image: (node: ImageNode) => {
    const Selector = node.__selector

    return (
      <>
        {Selector && <Selector nodeKey={node.getKey()} />}

        {!node.__isImageHidden && (
          <ImageNodeComponent
            altText={node.alt}
            captionEditor={node.__captionEditor}
            captionEditorInitialState={node.__captionEditorInitialState}
            href={node.href}
            initialFile={node.__initialFile}
            nodeKey={node.getKey()}
            previewSrc={node.previewSrc ?? undefined}
            src={node.src}
            triggerFileDialog={node.__triggerFileDialog}
          />
        )}
      </>
    )
  },
  toggle: (node: ToggleNode) => {
    // Same headless-round-trip invariant as callout's nested editor above.
    if (!node.__titleEditor || !node.__contentEditor) {
      return null
    }

    return (
      <ToggleNodeComponent
        contentEditor={node.__contentEditor}
        contentEditorInitialState={node.__contentEditorInitialState}
        headingEditor={node.__titleEditor}
        headingEditorInitialState={node.__titleEditorInitialState}
        nodeKey={node.getKey()}
      />
    )
  },
  video: (node: VideoNode) => {
    const cardWidth = normalizeCardWidth(node.cardWidth) ?? 'regular'

    return (
      <VideoNodeComponent
        captionEditor={node.__captionEditor}
        captionEditorInitialState={node.__captionEditorInitialState}
        cardWidth={cardWidth}
        customThumbnail={node.customThumbnailSrc}
        initialFile={node.__initialFile}
        isLoopChecked={node.loop}
        nodeKey={node.getKey()}
        thumbnail={node.thumbnailSrc}
        totalDuration={node.formattedDuration}
        triggerFileDialog={node.__triggerFileDialog}
      />
    )
  },
} satisfies Record<CardNodeType, (node: never) => ReactNode>

/**
 * The indicator icon components, gated by the declaration's
 * `decorateTarget.hasIndicatorIcon` flag (Html is the only card with one).
 */
const DECORATE_INDICATOR_ICONS: Partial<Record<CardNodeType, React.ComponentType<Record<string, unknown>>>> = {
  html: HtmlIndicatorIcon,
}

// The renders are keyed by card node type; the shared adapter passes the
// node through untyped, so widen each mapper's node parameter here.
type DecorateRender = (node: LexicalNode) => ReactNode

/**
 * Wrapper-layer projection of the card declarations: each declaration paired
 * with the React-bearing half of its decorate-target. The shared adapter
 * (`@/nodes/decorate-card`) renders these through `InklingCardWrapper`.
 */
export const CARD_DECORATE_TARGETS = CARD_DECLARATIONS.map((declaration) => {
  // `in` narrows the union to the declarations carrying the optional decorate-target entry
  const decorateTarget: DecorateTargetSpec | undefined =
    'decorateTarget' in declaration ? declaration.decorateTarget : undefined
  return {
    ...declaration,
    decorateTarget,
    render: DECORATE_RENDER[declaration.nodeType] as DecorateRender,
    IndicatorIcon: decorateTarget?.hasIndicatorIcon ? DECORATE_INDICATOR_ICONS[declaration.nodeType] : undefined,
  }
})

const CARD_DECORATE_TARGETS_BY_TYPE = new Map(
  CARD_DECORATE_TARGETS.map((target): [string, (typeof CARD_DECORATE_TARGETS)[number]] => [target.nodeType, target]),
)

export function getCardDecorateTarget(nodeType: string): (typeof CARD_DECORATE_TARGETS)[number] | undefined {
  return CARD_DECORATE_TARGETS_BY_TYPE.get(nodeType)
}
