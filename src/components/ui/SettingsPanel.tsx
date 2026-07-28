import React from 'react'

import type { DragHandlerLike } from '@/components/ui/cards/card-ui-types'

import { ButtonGroup, type ButtonGroupButton } from '@/components/ui/ButtonGroup'
import { ColorOptionButtons } from '@/components/ui/ColorOptionButtons'
import { ColorIndicator, type ColorSwatchData } from '@/components/ui/ColorPicker'
import { Input } from '@/components/ui/Input'
import { InputList, InputListItem } from '@/components/ui/InputList'
import { MediaUploader, type MediaUploaderProps } from '@/components/ui/MediaUploader'
import { SettingDescription, SettingLabel } from '@/components/ui/SettingLabel'
import { TabView } from '@/components/ui/TabView'
import { Toggle } from '@/components/ui/Toggle'
import CardContext from '@/context/CardContext'
import InklingHostIntegrationContext from '@/context/InklingHostIntegrationContext'
import useFloatingPanel from '@/hooks/useFloatingPanel'
import { useInklingLabels } from '@/hooks/useInklingLabels'
import { cx } from '@/utils/cx'

export type SettingsPanelProps = {
  darkMode?: boolean
  cardWidth?: 'regular' | 'wide' | 'full' | 'split'
  className?: string
} & (
  | { tabs?: false; defaultTab?: never; children: React.ReactNode }
  | { tabs: true; defaultTab?: string; children: Record<string, React.ReactNode> }
)

export function SettingsPanel({ children, darkMode, cardWidth, tabs, defaultTab, className = '' }: SettingsPanelProps) {
  const { nodeKey } = React.useContext(CardContext)
  const { ref } = useFloatingPanel({ cardWidth: cardWidth ?? 'regular', cardKey: nodeKey })

  const tabContent = React.useMemo<Record<string, React.ReactNode>>(() => {
    if (!tabs) {
      return { default: children }
    }
    return children
  }, [tabs, children])

  const tabItems = React.useMemo(() => {
    if (!tabs) {
      return []
    }
    return Object.keys(tabContent).map((key) => ({ id: key, label: key.charAt(0).toUpperCase() + key.slice(1) }))
  }, [tabs, tabContent])

  return (
    // Ideally we would use Portal to avoid issues with transformed ancestors (https://bugs.chromium.org/p/chromium/issues/detail?id=20574)
    // However, Portal causes problems with drag/drop, focus, etc
    <div className={`!mt-0 touch-none ${darkMode ? 'dark' : ''} ${className ?? ''}`}>
      {tabs ? (
        <div
          ref={ref}
          className="not-inkling-prose fixed top-0 left-0 z-[9999999] m-0 flex w-[320px] flex-col rounded-lg bg-white bg-clip-padding font-sans shadow-lg will-change-transform dark:bg-grey-950 dark:shadow-xl"
          data-testid="settings-panel"
          data-inkling-settings-panel
        >
          <TabView defaultTab={defaultTab} tabContent={tabContent} tabs={tabItems} />
        </div>
      ) : (
        <div
          ref={ref}
          className="not-inkling-prose fixed top-0 left-0 z-[9999999] m-0 flex w-[320px] flex-col gap-3 rounded-lg bg-white bg-clip-padding p-6 font-sans shadow-lg will-change-transform dark:bg-grey-950 dark:shadow-xl"
          data-testid="settings-panel"
          data-inkling-settings-panel
        >
          {children}
        </div>
      )}
    </div>
  )
}

interface ToggleSettingProps {
  label?: string
  description?: string
  isChecked: boolean
  onChange: (checked: boolean) => void
  dataTestId?: string
}

export function ToggleSetting({ label, description, isChecked, onChange, dataTestId }: ToggleSettingProps) {
  return (
    <label className="flex w-full cursor-pointer items-center justify-between">
      <div>
        <SettingLabel>{label}</SettingLabel>
        {description && <SettingDescription className="mt-1 w-11/12">{description}</SettingDescription>}
      </div>
      <div className="flex shrink-0 pl-2">
        <Toggle dataTestId={dataTestId} isChecked={isChecked} onChange={onChange} />
      </div>
    </label>
  )
}

interface InputSettingProps {
  label?: string
  hideLabel?: boolean
  description?: string
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void
  value: string
  placeholder?: string
  dataTestId?: string
  onBlur?: (e: React.FocusEvent<HTMLInputElement>) => void
}

export function InputSetting({
  label,
  hideLabel,
  description,
  onChange,
  value,
  placeholder,
  dataTestId,
  onBlur,
}: InputSettingProps) {
  return (
    <div className="flex w-full flex-col justify-between">
      {hideLabel ? <div className="sr-only">{label}</div> : <SettingLabel className="mb-1.5">{label}</SettingLabel>}
      <Input dataTestId={dataTestId} placeholder={placeholder} value={value} onBlur={onBlur} onChange={onChange} />
      {description && <SettingDescription>{description}</SettingDescription>}
    </div>
  )
}

export interface ListOption {
  value: string
  label: string
}

/**
 * Enter a link with autocompletion
 */
interface InputUrlSettingProps {
  dataTestId?: string
  label?: string
  value: string
  onChange: (value: string) => void
}

export function InputUrlSetting({ dataTestId, label, value, onChange }: InputUrlSettingProps) {
  const { cardConfig } = React.useContext(InklingHostIntegrationContext)
  const labels = useInklingLabels()
  const [listOptions, setListOptions] = React.useState<ListOption[]>([])

  React.useEffect(() => {
    if (cardConfig?.fetchAutocompleteLinks) {
      const fetchAutocompleteLinks = cardConfig.fetchAutocompleteLinks
      let cancelled = false
      fetchAutocompleteLinks()
        .then((links) => {
          // the component unmounted or cardConfig changed before the request
          // resolved — don't update state with stale results
          if (cancelled) {
            return
          }
          setListOptions(
            links?.map((link) => {
              return { value: link.value ?? '', label: link.label }
            }) ?? [],
          )
        })
        .catch(() => {
          if (cancelled) {
            return
          }
          setListOptions([])
        })
      return () => {
        cancelled = true
      }
    }
  }, [cardConfig])

  const filteredSuggestedUrls = listOptions.filter((u) => {
    return u.label.toLocaleLowerCase().includes(value.toLocaleLowerCase())
  })

  return (
    <InputListSetting
      dataTestId={dataTestId}
      label={label}
      listOptions={filteredSuggestedUrls}
      placeholder={labels['settings.url.placeholder']}
      value={value}
      onChange={onChange}
    />
  )
}

interface InputListSettingProps {
  dataTestId?: string
  description?: string
  label?: string
  listOptions: ListOption[]
  onChange: (value: string) => void
  placeholder?: string
  value: string
}

/**
 * A text input with autocomplete suggestions.
 * @param {object} options
 * @param {(value: string) => void} options.onChange Does not pass an event, only the value
 * @param {{value: string, label: string}[]} options.listOptions
 * @returns
 */
export function InputListSetting({
  dataTestId,
  description,
  label,
  listOptions,
  onChange,
  placeholder,
  value,
}: InputListSettingProps) {
  function onClick(item: ListOption) {
    onChange(item.value)
  }

  const getItem = (item: ListOption, selected: boolean, onMouseOver: () => void, scrollIntoView: boolean) => {
    return (
      <InputListItem
        key={item.value}
        className={cx(
          selected && 'bg-grey-100 dark:bg-grey-925',
          'm-0 cursor-pointer px-3 py-[7px] text-left hover:bg-grey-100 dark:hover:bg-grey-925',
        )}
        dataTestId={dataTestId ?? ''}
        item={item}
        scrollIntoView={scrollIntoView}
        selected={selected}
        onClick={onClick}
        onMouseOver={onMouseOver}
      >
        <span
          className="block text-sm leading-tight font-normal text-black dark:text-white"
          data-testid={`${dataTestId}-listOption-${item.label}`}
        >
          {item.label}
        </span>
        <span
          className="block truncate text-xs leading-tight text-grey-700 dark:text-grey-600"
          data-testid={`${dataTestId}-listOption-${item.value}`}
        >
          {item.value}
        </span>
      </InputListItem>
    )
  }

  return (
    <div className="flex w-full flex-col justify-between">
      <SettingLabel>{label}</SettingLabel>
      <InputList
        dataTestId={dataTestId ?? ''}
        getItem={getItem}
        listOptions={listOptions}
        placeholder={placeholder ?? ''}
        value={value}
        onChange={onChange}
      />
      {description && <SettingDescription>{description}</SettingDescription>}
    </div>
  )
}

interface ButtonGroupSettingProps {
  label?: string
  onClick: (name: string) => void
  selectedName?: string
  buttons: ButtonGroupButton[]
  hasTooltip?: boolean
}

export function ButtonGroupSetting({ label, onClick, selectedName, buttons, hasTooltip }: ButtonGroupSettingProps) {
  return (
    <div className="flex w-full items-center justify-between text-[1.3rem]">
      <SettingLabel>{label}</SettingLabel>

      <div className="shrink-0 pl-2">
        <ButtonGroup buttons={buttons} hasTooltip={hasTooltip} selectedName={selectedName} onClick={onClick} />
      </div>
    </div>
  )
}

interface ColorOptionSettingProps {
  label?: string
  onClick: (name: string) => void
  selectedName?: string
  buttons: Array<{ name: string; label?: string; color?: string }>
  layout?: 'inline' | 'stacked'
  dataTestId?: string
}

export function ColorOptionSetting({
  label,
  onClick,
  selectedName,
  buttons,
  layout,
  dataTestId,
}: ColorOptionSettingProps) {
  return (
    <div
      className={`flex w-full text-[1.3rem] ${layout === 'stacked' ? 'flex-col' : 'items-center justify-between'}`}
      data-testid={dataTestId}
    >
      <SettingLabel>{label}</SettingLabel>

      <div className={`shrink-0 ${layout === 'stacked' ? '-mx-1 pt-[.6rem]' : 'pl-2'}`}>
        <ColorOptionButtons buttons={buttons} selectedName={selectedName} onClick={onClick} />
      </div>
    </div>
  )
}

interface ColorPickerSettingProps {
  label?: string
  isExpanded?: boolean
  onSwatchChange?: (value: string) => void
  onPickerChange?: (value: string) => void
  onTogglePicker?: (isExpanded?: boolean) => void
  value: string
  swatches?: ColorSwatchData[]
  eyedropper?: boolean
  hasTransparentOption?: boolean
  dataTestId?: string
  children?: React.ReactNode
  showChildren?: boolean
}

export function ColorPickerSetting({
  label,
  isExpanded,
  onSwatchChange,
  onPickerChange,
  onTogglePicker,
  value,
  swatches,
  eyedropper,
  hasTransparentOption,
  dataTestId,
  children,
  showChildren,
}: ColorPickerSettingProps) {
  const markClickedInside = (event: React.MouseEvent) => {
    event.stopPropagation()
  }

  return (
    <div className="flex-col" data-testid={dataTestId} onClick={markClickedInside}>
      <div className="flex w-full items-center justify-between text-[1.3rem]">
        <SettingLabel>{label}</SettingLabel>

        <div className="shrink-0 pl-2">
          <ColorIndicator
            eyedropper={eyedropper}
            hasTransparentOption={hasTransparentOption}
            isExpanded={isExpanded}
            showChildren={showChildren}
            swatches={swatches ?? []}
            value={value}
            onChange={onPickerChange ?? (() => {})}
            onSwatchChange={onSwatchChange ?? (() => {})}
            onTogglePicker={onTogglePicker ?? (() => {})}
          >
            {children}
          </ColorIndicator>
        </div>
      </div>
    </div>
  )
}

interface MediaUploadSettingProps extends Omit<MediaUploaderProps, 'className' | 'dragHandler'> {
  className?: string
  label?: string
  hideLabel?: boolean
  stacked?: boolean
  isDraggedOver?: boolean
  placeholderRef?: DragHandlerLike['setRef']
}

export function MediaUploadSetting({
  className,
  label,
  hideLabel,
  stacked,
  isDraggedOver,
  placeholderRef,
  errors = [],
  src,
  type,
  ...uploaderProps
}: MediaUploadSettingProps) {
  return (
    <div className={cx(className, !stacked && 'flex justify-between gap-3')} data-testid="media-upload-setting">
      {hideLabel ? (
        <div className="sr-only">{label}</div>
      ) : (
        <SettingLabel className="mb-2 shrink-0">{label}</SettingLabel>
      )}
      <MediaUploader
        className={cx(
          stacked && 'h-32',
          !stacked && src && 'h-[5.2rem]',
          !stacked && type !== 'button' && !src && 'h-[5.2rem] w-[7.2rem]',
        )}
        dragHandler={placeholderRef ? { isDraggedOver: !!isDraggedOver, setRef: placeholderRef } : undefined}
        errors={errors}
        src={src}
        type={type}
        {...uploaderProps}
      />
    </div>
  )
}
