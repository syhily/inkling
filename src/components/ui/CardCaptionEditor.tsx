import type { EditorState, LexicalEditor } from 'lexical'

import React from 'react'

import InklingCaptionEditor from '@/components/InklingCaptionEditor'
import { TextInput } from '@/components/ui/TextInput'
import { isEditorEmpty } from '@/utils/isEditorEmpty'

interface CaptionInputProps {
  captionEditor: LexicalEditor | null
  captionEditorInitialState?: EditorState
  placeholder?: string
  dataTestId?: string
}

function CaptionInput({ captionEditor, captionEditorInitialState, placeholder, dataTestId }: CaptionInputProps) {
  return (
    <div className={`m-0 px-9 w-full text-center`} data-testid={dataTestId} data-inkling-allow-clickthrough>
      <InklingCaptionEditor
        captionEditor={captionEditor!}
        captionEditorInitialState={captionEditorInitialState}
        placeholderText={placeholder}
      />
    </div>
  )
}

interface AltTextInputProps {
  value?: string
  placeholder?: string
  onChange?: (value: string) => void
  readOnly?: boolean
  dataTestId?: string
  autoFocus?: boolean
}

function AltTextInput({ value, placeholder, onChange, readOnly, dataTestId, autoFocus = true }: AltTextInputProps) {
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onChange?.(e.target.value)
  }

  return (
    <TextInput
      autoFocus={autoFocus}
      className="not-inkling-prose px-9 font-sans text-sm font-normal tracking-wide text-grey-800 placeholder:text-grey-500 dark:text-grey-500 dark:placeholder:text-grey-800 w-full bg-transparent text-center leading-[1.625]"
      data-testid={dataTestId}
      placeholder={placeholder}
      readOnly={readOnly}
      value={value}
      data-inkling-dnd-disabled
      onChange={handleChange}
    />
  )
}

interface AltToggleButtonProps {
  isEditingAlt?: boolean
  onClick: (event: React.MouseEvent) => void
}

function AltToggleButton({ isEditingAlt, onClick }: AltToggleButtonProps) {
  return (
    <button
      className={`bottom-0 right-0 m-2 rounded-md px-1 font-sans font-normal leading-7 tracking-wide absolute cursor-pointer border text-[1.3rem] transition-all duration-100 ${isEditingAlt ? 'border-green bg-green text-white' : 'border-grey text-grey'} `}
      data-testid="alt-toggle-button"
      name="alt-toggle-button"
      type="button"
      onClick={onClick}
    >
      Alt
    </button>
  )
}

interface CardCaptionEditorProps {
  altText?: string
  altTextPlaceholder?: string
  setAltText?: (value: string) => void
  captionEditor: LexicalEditor | null
  captionEditorInitialState?: EditorState
  captionPlaceholder?: string
  isSelected?: boolean
  readOnly?: boolean
  dataTestId?: string
}

export function CardCaptionEditor({
  altText,
  altTextPlaceholder,
  setAltText,
  captionEditor,
  captionEditorInitialState,
  captionPlaceholder,
  isSelected,
  readOnly,
  dataTestId,
}: CardCaptionEditorProps) {
  const [isEditingAlt, setIsEditingAlt] = React.useState(false)

  const toggleIsEditingAlt = (e: React.MouseEvent) => {
    e.stopPropagation()
    setIsEditingAlt(!isEditingAlt)
  }

  // always switch back to displaying caption when card is not selected
  React.useEffect(() => {
    if (!isSelected) {
      setIsEditingAlt(false)
    }
  }, [isSelected, setIsEditingAlt])

  const isCaptionEmpty = isEditorEmpty(captionEditor!)
  const showAltToggle = setAltText && isSelected

  return (
    (isSelected || !isCaptionEmpty) && (
      <figcaption className="p-2 flex min-h-[40px] w-full">
        {isEditingAlt ? (
          <AltTextInput
            dataTestId={dataTestId}
            placeholder={altTextPlaceholder}
            readOnly={readOnly}
            value={altText}
            onChange={setAltText}
          />
        ) : (
          <CaptionInput
            captionEditor={captionEditor}
            captionEditorInitialState={captionEditorInitialState}
            dataTestId={dataTestId}
            placeholder={captionPlaceholder}
          />
        )}
        {showAltToggle && <AltToggleButton isEditingAlt={isEditingAlt} onClick={toggleIsEditingAlt} />}
      </figcaption>
    )
  )
}
