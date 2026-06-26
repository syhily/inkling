import { ToggleSetting } from '@/components/ui/SettingsPanel'

interface VisibilityToggle {
  key: string
  label: string
  checked: boolean
}

interface VisibilityGroup {
  key: string
  label: string
  toggles: VisibilityToggle[]
}

interface VisibilitySettingsProps {
  visibilityOptions: VisibilityGroup[]
  toggleVisibility: (groupKey: string, toggleKey: string, value: boolean) => void
}

export function VisibilitySettings({ visibilityOptions, toggleVisibility }: VisibilitySettingsProps) {
  const settingGroups = visibilityOptions.map((group: VisibilityGroup, index: number) => {
    const toggles = group.toggles.map((toggle: VisibilityToggle) => {
      return (
        <ToggleSetting
          key={toggle.key}
          dataTestId={`visibility-toggle-${group.key}-${toggle.key}`}
          isChecked={toggle.checked}
          label={toggle.label}
          onChange={() => toggleVisibility(group.key, toggle.key, !toggle.checked)}
        />
      )
    })

    return (
      <div key={group.key} className="gap-3 flex flex-col" data-testid="visibility-settings">
        <p className="text-sm font-bold tracking-normal text-grey-900 dark:text-grey-300">{group.label}</p>
        {toggles}
        {index < visibilityOptions.length - 1 && (
          <hr className="not-inkling-prose my-2 border-t-grey-300 dark:border-t-grey-900 block" />
        )}
      </div>
    )
  })

  return settingGroups
}
