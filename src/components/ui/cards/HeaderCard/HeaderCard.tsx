import type { InitialEditorStateType } from '@lexical/react/LexicalComposer'
import type { LexicalEditor } from 'lexical'

import clsx from 'clsx'
import { FastAverageColor } from 'fast-average-color'
import React, { useEffect, useState } from 'react'

import type { DragHandlerLike, FileChangeEvent, FileUploaderLike } from '@/components/ui/cards/card-ui-types'

import CenterAlignIcon from '@/assets/icons/inkling-align-center.svg?react'
import LeftAlignIcon from '@/assets/icons/inkling-align-left.svg?react'
import ExpandIcon from '@/assets/icons/inkling-expand.svg?react'
import ImgBgIcon from '@/assets/icons/inkling-img-bg.svg?react'
import ImgFullIcon from '@/assets/icons/inkling-img-full.svg?react'
import ImgRegularIcon from '@/assets/icons/inkling-img-regular.svg?react'
import ImgWideIcon from '@/assets/icons/inkling-img-wide.svg?react'
import LayoutSplitIcon from '@/assets/icons/inkling-layout-split.svg?react'
import ShrinkIcon from '@/assets/icons/inkling-shrink.svg?react'
import InklingNestedEditor from '@/components/InklingNestedEditor'
import { Button } from '@/components/ui/Button'
import { IconButton } from '@/components/ui/IconButton'
import { MediaUploader } from '@/components/ui/MediaUploader'
import { ReadOnlyOverlay } from '@/components/ui/ReadOnlyOverlay'
import {
  ButtonGroupSetting,
  ColorPickerSetting,
  InputSetting,
  InputUrlSetting,
  MediaUploadSetting,
  SettingsPanel,
  ToggleSetting,
} from '@/components/ui/SettingsPanel'
import { Tooltip } from '@/components/ui/Tooltip'
import { Color, textColorForBackgroundColor } from '@/utils'
import trackEvent from '@/utils/analytics'
import { getAccentColor } from '@/utils/getAccentColor'
import { isEditorEmpty } from '@/utils/isEditorEmpty'

interface HeaderCardProps {
  alignment?: string
  buttonEnabled?: boolean
  buttonText?: string
  buttonUrl?: string
  showBackgroundImage?: boolean
  backgroundImageSrc?: string
  backgroundSize?: 'cover' | 'contain'
  backgroundColor?: string
  buttonColor?: string
  buttonTextColor?: string
  textColor?: string
  isEditing?: boolean
  fileUploader?: FileUploaderLike
  handleAlignment: (alignment: string) => void
  handleButtonText: (event: React.ChangeEvent<HTMLInputElement>) => void
  handleButtonEnabled: () => void
  handleShowBackgroundImage: () => void
  handleHideBackgroundImage: () => void
  handleClearBackgroundImage: () => void
  handleBackgroundColor: (color: string, matchingTextColor: string) => void
  handleButtonColor: (color: string, matchingTextColor: string) => void
  handleLayout: (layout: string) => void
  handleTextColor: (color: string) => void
  isPinturaEnabled?: boolean
  layout?: 'regular' | 'wide' | 'full' | 'split'
  onFileChange: (event: FileChangeEvent) => void
  openImageEditor: (options: { image: string; handleSave: (blob: Blob) => void }) => void
  imageDragHandler: DragHandlerLike
  headerTextEditor: LexicalEditor
  headerTextEditorInitialState?: InitialEditorStateType
  subheaderTextEditor: LexicalEditor
  subheaderTextEditorInitialState?: InitialEditorStateType
  isSwapped?: boolean
  handleSwapLayout: () => void
  handleBackgroundSize: (size: string) => void
  handleButtonTextBlur: (event: React.FocusEvent<HTMLInputElement>) => void
  handleButtonUrlBlur: (event: React.FocusEvent<HTMLInputElement>) => void
  handleButtonUrl: (value: string) => void
  setFileInputRef: (ref: React.MutableRefObject<HTMLInputElement | null>) => void
}

export function HeaderCard({
  alignment,
  buttonEnabled,
  buttonText,
  buttonUrl,
  showBackgroundImage,
  backgroundImageSrc,
  backgroundSize,
  backgroundColor,
  buttonColor,
  buttonTextColor,
  textColor,
  isEditing,
  fileUploader,
  handleAlignment,
  handleButtonText,
  handleButtonEnabled,
  handleShowBackgroundImage,
  handleHideBackgroundImage,
  handleClearBackgroundImage,
  handleBackgroundColor,
  handleButtonColor,
  handleLayout,
  handleTextColor,
  isPinturaEnabled,
  layout,
  onFileChange,
  openImageEditor,
  imageDragHandler,
  headerTextEditor,
  headerTextEditorInitialState,
  subheaderTextEditor,
  subheaderTextEditorInitialState,
  isSwapped,
  handleSwapLayout,
  handleBackgroundSize,
  handleButtonTextBlur,
  handleButtonUrlBlur,
  handleButtonUrl,
  setFileInputRef,
}: HeaderCardProps) {
  const [backgroundColorPickerExpanded, setBackgroundColorPickerExpanded] = useState(false)
  const [buttonColorPickerExpanded, setButtonColorPickerExpanded] = useState(false)

  const matchingTextColor = (color: string) => {
    return color === 'transparent' ? '' : textColorForBackgroundColor(hexColorValue(color)).hex()
  }

  /**
   * Convert a semi transparent color to a fully opaque color by merging it with a white background
   */
  const mergeWhiteColor = ({ r, g, b, a }: { r: number; g: number; b: number; a: number }) => {
    const aPercentage = a / 255

    return Color({
      r: r * aPercentage + 255 * (1 - aPercentage),
      g: g * aPercentage + 255 * (1 - aPercentage),
      b: b * aPercentage + 255 * (1 - aPercentage),
    }).hex()
  }

  useEffect(() => {
    if (backgroundImageSrc && layout !== 'split') {
      const src = backgroundImageSrc
      let cancelled = false
      new FastAverageColor()
        .getColorAsync(src, { defaultColor: [255, 255, 255, 255] })
        .then((color) => {
          // the background image changed again before the color was
          // extracted — don't apply the previous image's color
          if (cancelled) {
            return
          }
          // If we uploaded a transparent image, the average color will be semi transparent, we need to merge it with white
          // Merge white color to the color
          const correctedHex = mergeWhiteColor({
            r: color.value[0],
            g: color.value[1],
            b: color.value[2],
            a: color.value[3],
          })
          handleTextColor(matchingTextColor(correctedHex))
        })
        .catch(() => {
          // Failed to load/average the image — keep the current text color
        })
      return () => {
        cancelled = true
      }
    }
    // This is only needed when the background image or layout is changed
    // oxlint-disable-next-line react-hooks/exhaustive-deps
  }, [backgroundImageSrc, layout === 'split'])

  useEffect(() => {
    if (backgroundColor && layout === 'split') {
      // Make sure the text color matches the background color
      // It might be different if an image was uploaded in a non-split layout
      handleBackgroundColor(backgroundColor, matchingTextColor(backgroundColor || ''))
    }
    // This is only needed when the layout is changed
    // oxlint-disable-next-line react-hooks/exhaustive-deps
  }, [layout === 'split'])

  const layoutChildren = [
    {
      label: 'Regular',
      name: 'regular',
      Icon: ImgRegularIcon,
      dataTestId: 'header-layout-regular',
    },
    {
      label: 'Wide',
      name: 'wide',
      Icon: ImgWideIcon,
      dataTestId: 'header-layout-wide',
    },
    {
      label: 'Full',
      name: 'full',
      Icon: ImgFullIcon,
      dataTestId: 'header-layout-full',
    },
    {
      label: 'Split',
      name: 'split',
      Icon: LayoutSplitIcon,
      dataTestId: 'header-layout-split',
    },
  ]

  const alignmentChildren = [
    {
      label: 'Left',
      name: 'left',
      Icon: LeftAlignIcon,
      dataTestId: 'header-alignment-left',
    },
    {
      label: 'Center',
      name: 'center',
      Icon: CenterAlignIcon,
      dataTestId: 'header-alignment-center',
    },
  ]

  const { isLoading, progress } = fileUploader || {}

  const headerPlaceholder = layout === 'split' ? 'Heading' : 'Enter heading text'
  const subheaderPlaceholder = layout === 'split' ? 'Subheading text' : 'Enter subheading text'

  const hexColorValue = (color: string) => {
    if (color === 'accent') {
      const accentColor = getAccentColor().trim()
      return accentColor
    }
    return color.trim()
  }

  const wrapperStyle = () => {
    if (backgroundImageSrc && layout !== 'split' && textColor) {
      return {
        backgroundImage: `url(${backgroundImageSrc})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center center',
        backgroundColor: 'white',
        color: hexColorValue(textColor || ''),
      }
    } else if (backgroundColor && textColor) {
      return {
        backgroundColor: hexColorValue(backgroundColor),
        color: hexColorValue(textColor || ''),
      }
    }

    return {
      backgroundImage: `url("data:image/svg+xml,%3Csvg width='24' height='24' viewBox='0 0 24 24' xmlns='http://www.w3.org/2000/svg'%3E%3Ctitle%3ERectangle%3C/title%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cpath fill='%23F2F6F8' d='M0 0h24v24H0z'/%3E%3Cpath fill='%23E5ECF0' d='M0 0h12v12H0zM12 12h12v12H12z'/%3E%3C/g%3E%3C/svg%3E")`,
      backgroundColor: 'transparent',
      color: hexColorValue(textColor || ''),
    }
  }

  const toggleBackgroundSize = (event: React.MouseEvent) => {
    event.stopPropagation()
    if (backgroundSize === 'cover') {
      handleBackgroundSize('contain')
      trackEvent('header Card Toggle Size', { size: 'contain' })
    } else {
      handleBackgroundSize('cover')
      trackEvent('header Card Toggle Size', { size: 'cover' })
    }
  }

  const toggleSwapped = () => {
    trackEvent('header Card Toggle Swapped', { swapped: !isSwapped })
    handleSwapLayout()
  }

  const toggleButton = () => {
    trackEvent('header card button toggled', { buttonEnabled: !buttonEnabled })
    handleButtonEnabled()
  }

  const correctedBackgroundSize = backgroundSize === 'contain' && backgroundImageSrc ? 'contain' : 'cover'

  const getButtonSize = (layoutString: string) => {
    if (layoutString === 'regular') {
      return 'medium'
    }

    if (layoutString === 'wide') {
      return 'medium'
    }

    if (layoutString === 'full') {
      return 'large'
    }

    if (layoutString === 'split') {
      return 'medium'
    }
  }

  return (
    <>
      <div
        className="flex w-full font-sans text-black transition-colors ease-in-out"
        data-testid={'header-card-container'}
        style={wrapperStyle()}
      >
        <div
          className={clsx(
            'flex w-full flex-col transition-colors ease-in-out sm:flex-row',
            layout === 'split' && isSwapped && 'flex-col-reverse sm:flex-row-reverse',
            // This is needed to align the content with wide breakout width
            (layout === 'full' || (layout === 'split' && correctedBackgroundSize === 'contain')) &&
              'mx-auto w-[calc(740px+4rem)] xs:w-[calc(740px+8rem)] md:w-[calc(740px+12rem)] lg:w-[calc(740px+22rem)] xl:w-[calc(740px+40rem)]',
            backgroundImageSrc && layout === 'split' && correctedBackgroundSize === 'contain' && 'items-center',
          )}
          data-testid={'header-card-content'}
        >
          {layout === 'split' && (
            <MediaUploader
              additionalActions={
                <>
                  <IconButton
                    dataTestId="media-upload-size"
                    Icon={backgroundSize === 'cover' ? ShrinkIcon : ExpandIcon}
                    label={backgroundSize === 'cover' ? 'Contain' : 'Cover'}
                    onClick={toggleBackgroundSize}
                  />
                </>
              }
              alt="Background image"
              backgroundSize={backgroundSize}
              className={clsx(
                'sm:w-1/2',
                correctedBackgroundSize === 'contain' && 'sm:my-10 md:my-14',
                !isSwapped &&
                  correctedBackgroundSize === 'contain' &&
                  'mt-10 px-[calc(32px-(4rem/2))] xs:px-[calc(92px-(8rem/2))] sm:pr-0 sm:pl-[calc(92px-(12rem/2))] md:pl-[calc(92px-(12rem/2))] lg:pl-0',
                isSwapped &&
                  correctedBackgroundSize === 'contain' &&
                  'mb-10 px-[calc(32px-(4rem/2))] xs:px-[calc(92px-(8rem/2))] sm:pr-[calc(92px-(12rem/2))] sm:pl-0 md:pr-[calc(92px-(12rem/2))] lg:pr-0',
              )}
              desc="Click to select an image"
              dragHandler={imageDragHandler}
              errors={fileUploader?.errors}
              icon="image"
              imgClassName={`${correctedBackgroundSize === 'cover' && 'aspect-[3/2]'}`}
              isEditing={isEditing}
              isLoading={isLoading}
              isPinturaEnabled={isPinturaEnabled}
              mimeTypes={['image/*']}
              openImageEditor={openImageEditor}
              progress={progress}
              size="large"
              src={backgroundImageSrc}
              onFileChange={onFileChange}
              onRemoveMedia={handleClearBackgroundImage}
            />
          )}

          <div
            className={clsx(
              'mx-auto flex w-full flex-1 flex-col justify-center',
              alignment === 'center' && 'items-center',
              layout === 'regular' && 'p-[4rem] sm:py-[6rem] md:px-[6rem] md:py-[10rem] lg:px-[8rem]',
              layout === 'wide' && 'max-w-[740px] p-[4rem] sm:py-[6rem] md:px-[8rem] md:py-[14rem] lg:px-0',
              layout === 'full' &&
                'px-[calc(32px-(4rem/2))] py-[4rem] xs:px-[calc(92px-(8rem/2))] sm:py-[6rem] md:px-[calc(92px-(12rem/2))] md:py-[12rem] lg:px-0 lg:py-[14rem] xl:py-[18rem]',
              layout === 'split' && 'p-[4rem] sm:py-[6rem] md:px-[6rem] md:py-[12rem] lg:px-[8rem] lg:py-[16rem]',
              !isSwapped &&
                layout === 'split' &&
                correctedBackgroundSize === 'contain' &&
                'px-[calc(32px-(4rem/2))] xs:px-[calc(92px-(8rem/2))] sm:px-[calc(92px-(12rem/2))] md:pr-[calc(92px-(12rem/2))] lg:pr-0',
              isSwapped &&
                layout === 'split' &&
                correctedBackgroundSize === 'contain' &&
                'px-[calc(32px-(4rem/2))] xs:px-[calc(92px-(8rem/2))] sm:px-[calc(92px-(12rem/2))] md:pl-[calc(92px-(12rem/2))] lg:pl-0',
            )}
          >
            {/* Heading */}
            {
              <InklingNestedEditor
                autoFocus={true}
                dataTestId="header-heading-editor"
                focusNext={subheaderTextEditor}
                hasSettingsPanel={true}
                hiddenFormats={['bold']}
                initialEditor={headerTextEditor}
                initialEditorState={headerTextEditorInitialState}
                nodes="minimal"
                placeholderClassName={clsx(
                  '!leading-[1.1] !font-bold !tracking-tight opacity-50',
                  alignment === 'center' && 'text-center',
                  layout === 'regular' && 'text-3xl sm:text-4xl',
                  (layout === 'wide' || layout === 'split') && 'text-3xl sm:text-4xl md:text-5xl',
                  layout === 'full' && 'text-3xl sm:text-4xl md:text-5xl lg:text-6xl',
                )}
                placeholderText={headerPlaceholder}
                singleParagraph={true}
                textClassName={clsx(
                  'inkling-lexical-heading relative w-full font-bold whitespace-normal caret-current',
                  !isEditing && isEditorEmpty(headerTextEditor) ? 'hidden' : 'peer',
                  alignment === 'center' && 'text-center [&:has(.placeholder)]:w-fit [&:has(.placeholder)]:text-left',
                  layout === 'regular' && 'heading-small',
                  (layout === 'wide' || layout === 'split') && 'heading-medium',
                  layout === 'full' && 'heading-large',
                )}
              />
            }

            {/* Subheading */}
            {
              <InklingNestedEditor
                dataTestId="header-subheader-editor"
                defaultInklingEnterBehaviour={true}
                hasSettingsPanel={true}
                initialEditor={subheaderTextEditor}
                initialEditorState={subheaderTextEditorInitialState}
                nodes="minimal"
                placeholderClassName={clsx(
                  '!leading-snug !font-medium !tracking-tight opacity-60',
                  alignment === 'center' && 'text-center',
                  layout === 'regular' && 'text-lg sm:text-xl',
                  (layout === 'wide' || layout === 'split') && 'text-lg leading-snug sm:text-xl md:text-[2.2rem]',
                  layout === 'full' && 'text-lg sm:text-xl md:text-[2.2rem] lg:text-[2.6rem] xl:max-w-[880px]',
                )}
                placeholderText={subheaderPlaceholder}
                singleParagraph={true}
                textClassName={clsx(
                  'inkling-lexical-subheading relative w-full whitespace-normal caret-current',
                  !isEditing && isEditorEmpty(subheaderTextEditor) ? 'hidden' : 'peer',
                  alignment === 'center' && 'text-center [&:has(.placeholder)]:w-fit [&:has(.placeholder)]:text-left',
                  layout === 'regular' && 'subheading-small !mt-2',
                  (layout === 'wide' || layout === 'split') && 'subheading-medium !mt-3',
                  layout === 'full' && 'subheading-large !mt-3 xl:max-w-[880px]',
                )}
              />
            }

            {/* Button */}

            {buttonEnabled && (
              <div
                className={`text-${alignment} w-full ${layout === 'regular' ? 'peer-[.inkling-lexical]:mt-8' : layout === 'wide' ? 'peer-[.inkling-lexical]:mt-8 md:w-2/3' : layout === 'full' ? 'peer-[.inkling-lexical]:mt-8 md:w-2/3 peer-[.inkling-lexical]:md:mt-8 xl:w-1/2' : 'max-w-[500px] peer-[.inkling-lexical]:mt-8 peer-[.inkling-lexical]:md:mt-8'}`}
              >
                <Button
                  dataTestId="header-card-button"
                  disabled={true}
                  placeholder="Add button text"
                  size={getButtonSize(layout || 'regular')}
                  style={
                    buttonColor
                      ? {
                          backgroundColor: hexColorValue(buttonColor),
                          color: hexColorValue(buttonTextColor || ''),
                        }
                      : { backgroundColor: `#000000`, color: `#ffffff` }
                  }
                  value={buttonText || ''}
                />
              </div>
            )}
          </div>
        </div>

        {/* Read-only overlay */}
        {!isEditing && <ReadOnlyOverlay />}
      </div>

      {isEditing && (
        <SettingsPanel cardWidth={layout} className="mt-0">
          <ButtonGroupSetting buttons={layoutChildren} label="Layout" selectedName={layout} onClick={handleLayout} />

          {layout === 'split' && (
            <ToggleSetting
              dataTestId="header-swapped"
              isChecked={!!isSwapped}
              label="Flip Layout"
              onChange={toggleSwapped}
            />
          )}

          <ButtonGroupSetting
            buttons={alignmentChildren}
            label="Alignment"
            selectedName={alignment}
            onClick={handleAlignment}
          />

          <ColorPickerSetting
            dataTestId="header-background-color"
            eyedropper={layout === 'split'}
            hasTransparentOption={true}
            isExpanded={backgroundColorPickerExpanded}
            label="Background"
            swatches={[
              ...(layout !== 'split'
                ? [
                    {
                      title: 'Image',
                      customContent: (
                        <button
                          className={clsx(
                            `group relative flex size-6 shrink-0 items-center justify-center rounded-full border border-grey-300 bg-grey-100 text-black`,
                            showBackgroundImage && 'outline outline-2 outline-green',
                          )}
                          data-testid="header-background-image-toggle"
                          title="Image"
                          type="button"
                          onClick={() => {
                            handleShowBackgroundImage()
                            setBackgroundColorPickerExpanded(false)
                            setButtonColorPickerExpanded(false)
                          }}
                        >
                          <ImgBgIcon className="size-[1.4rem]" />
                          <Tooltip label="Image" />
                        </button>
                      ),
                    },
                  ]
                : []),
              { title: 'Black', hex: '#000000' },
              { title: 'Grey', hex: '#F0F0F0' },
              { title: 'Brand color', accent: true },
            ]}
            value={showBackgroundImage && layout !== 'split' ? 'image' : backgroundColor || ''}
            onPickerChange={(color) => handleBackgroundColor(color, matchingTextColor(color))}
            onSwatchChange={(color) => {
              handleBackgroundColor(color, matchingTextColor(color))
              setBackgroundColorPickerExpanded(false)
            }}
            onTogglePicker={(isExpanded) => {
              if (isExpanded) {
                if (layout !== 'split') {
                  handleHideBackgroundImage()
                }

                if (backgroundColor) {
                  handleBackgroundColor(backgroundColor, matchingTextColor(backgroundColor || ''))
                }
              }

              setBackgroundColorPickerExpanded(!!isExpanded)
              if (isExpanded) {
                setButtonColorPickerExpanded(!isExpanded)
              }
            }}
          >
            <MediaUploadSetting
              alt="Background image"
              borderStyle="rounded"
              className={clsx('min-w-[296px]', (!showBackgroundImage || layout === 'split') && 'hidden')}
              errors={fileUploader?.errors}
              hideLabel={layout !== 'split'}
              icon="file"
              imgClassName="w-full"
              isDraggedOver={imageDragHandler?.isDraggedOver}
              isLoading={isLoading}
              isPinturaEnabled={isPinturaEnabled}
              label="Image"
              mimeTypes={['image/*']}
              openImageEditor={openImageEditor}
              placeholderRef={imageDragHandler?.setRef ?? undefined}
              progress={progress}
              setFileInputRef={setFileInputRef}
              size="xsmall"
              src={backgroundImageSrc}
              stacked={true}
              onFileChange={onFileChange}
              onRemoveMedia={() => {
                handleClearBackgroundImage()
                handleTextColor(matchingTextColor(backgroundColor || ''))
              }}
            />
          </ColorPickerSetting>

          {/* Button settings */}
          <ToggleSetting
            dataTestId="header-button-toggle"
            isChecked={!!buttonEnabled}
            label="Button"
            onChange={toggleButton}
          />
          {buttonEnabled && (
            <>
              <ColorPickerSetting
                dataTestId="header-button-color"
                eyedropper={layout === 'split'}
                isExpanded={buttonColorPickerExpanded}
                label="Button Color"
                swatches={[
                  { title: 'White', hex: '#ffffff' },
                  { title: 'Black', hex: '#000000' },
                  { title: 'Brand color', accent: true },
                ]}
                value={buttonColor || ''}
                onPickerChange={(color) => handleButtonColor(color, matchingTextColor(color))}
                onSwatchChange={(color) => {
                  handleButtonColor(color, matchingTextColor(color))
                  setButtonColorPickerExpanded(false)
                }}
                onTogglePicker={(isExpanded) => {
                  setButtonColorPickerExpanded(!!isExpanded)
                  if (isExpanded) {
                    setBackgroundColorPickerExpanded(!isExpanded)
                  }
                }}
              />
              <InputSetting
                dataTestId="header-button-text"
                label="Button text"
                placeholder="Add button text"
                value={buttonText || ''}
                onBlur={handleButtonTextBlur}
                onChange={handleButtonText}
              />
              <InputUrlSetting
                dataTestId="header-button-url"
                label="Button URL"
                value={buttonUrl || ''}
                onChange={handleButtonUrl}
              />
            </>
          )}
        </SettingsPanel>
      )}
    </>
  )
}
