import type React from 'react'

import { useState } from 'react'

const TabView = ({
  tabs,
  defaultTab,
  tabContent,
}: {
  tabs: { id: string; label: string }[]
  defaultTab?: string
  tabContent: Record<string, React.ReactNode>
}) => {
  const [activeTab, setActiveTab] = useState(defaultTab || tabs[0].id)

  const handleTabChange = (tabId: string) => {
    setActiveTab(tabId)
  }

  return (
    <>
      <div
        className={`no-scrollbar gap-4 border-grey-300 dark:border-grey-900 flex border-b ${tabs.length > 1 ? 'px-6 w-full' : 'mx-6'}`}
      >
        {tabs.map((tab: { id: string; label: string }) => (
          <button
            key={tab.id}
            className={`pb-3 pt-4 text-sm font-semibold -mb-px appearance-none whitespace-nowrap transition-all ${
              tabs.length > 1 ? 'cursor-pointer border-b-2' : 'cursor-default'
            } ${
              activeTab === tab.id
                ? 'border-black text-black dark:border-white dark:text-white'
                : 'text-grey-600 hover:border-grey-500 dark:text-grey-500 dark:hover:border-grey-500 border-transparent'
            }`}
            data-testid={`tab-${tab.id}`}
            type="button"
            onClick={() => handleTabChange(tab.id)}
          >
            {tab.label}
          </button>
        ))}
      </div>
      <div className="gap-3 p-6 pt-4 flex flex-col" data-testid={`tab-contents-${activeTab}`}>
        {tabContent[activeTab]}
      </div>
    </>
  )
}

export { TabView }
