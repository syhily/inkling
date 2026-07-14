import type { MouseEvent as ReactMouseEvent } from 'react'
import type { URLSearchParamsInit } from 'react-router-dom'

import { $getRoot, $isDecoratorNode } from 'lexical'
import React, { useState } from 'react'
import { useLocation, useSearchParams } from 'react-router-dom'

import type { CardConfig, FileUploader } from '@/context/InklingComposerContext'

import {
  BASIC_NODES,
  BASIC_TRANSFORMERS,
  EmailEditor,
  InklingComposableEditor,
  InklingComposer,
  InklingEditor,
  MINIMAL_NODES,
  MINIMAL_TRANSFORMERS,
  RestrictContentPlugin,
  TKCountPlugin,
  WordCountPlugin,
} from '@/'

import DollarIcon from './assets/icons/inkling-dollar.svg?react'
import LockIcon from './assets/icons/inkling-lock.svg?react'
import DarkModeToggle from './components/DarkModeToggle'
import EmailEditorWrapper from './components/EmailEditorWrapper'
import FloatingButton from './components/FloatingButton'
import InitialContentToggle from './components/InitialContentToggle'
import Sidebar from './components/Sidebar'
import TitleTextBox from './components/TitleTextBox'
import Watermark from './components/Watermark'
import WordCount from './components/WordCount'
import basicContent from './content/basic-content.json'
import content from './content/content.json'
import emailContent from './content/email-content.json'
import minimalContent from './content/minimal-content.json'
import { fetchEmbed } from './utils/fetchEmbed'
import { klipyConfig, tenorConfig } from './utils/gifConfig'
import { fileTypes, useFileUpload } from './utils/useFileUpload'
import { useSnippets } from './utils/useSnippets'

interface EditorInstance {
  _rootElement: HTMLElement
  getEditorState: () => { read: (callback: () => void) => void }
}

interface EditorAPI {
  editorInstance: EditorInstance
  editorIsEmpty: () => boolean
  focusEditor: (options: { position: string }) => void
  insertFiles: (files: File[]) => void
  insertParagraphAtBottom: () => void
  insertParagraphAtTop: (options: { focus: boolean }) => void
  serialize: () => string
}

interface SearchLinkItem {
  id: string
  groupName?: string
  title: string
  url: string
  metaText?: string
  MetaIcon?: React.ComponentType<React.SVGProps<SVGSVGElement>>
  metaIconTitle?: string
}

interface SearchLinkGroup {
  label: string
  key: string
  items: SearchLinkItem[]
}

const url = new URL(window.location.href)
const params = new URLSearchParams(url.search)
const WEBSOCKET_ENDPOINT = params.get('multiplayerEndpoint') || 'ws://localhost:1234'
const WEBSOCKET_ID = params.get('multiplayerId') || '0'

const defaultCardConfig: Record<string, unknown> = {
  fetchEmbed: fetchEmbed,
  tenor: tenorConfig,
  klipy: klipyConfig,
  fetchAutocompleteLinks: () =>
    Promise.resolve([
      { label: 'Homepage', value: window.location.origin + '/' },
      { label: 'Free signup', value: window.location.origin + '/#/portal/signup/free' },
    ]),
  renderLabels: true,
  fetchLabels: () => Promise.resolve(['Label 1', 'Label 2']),
  siteTitle: 'Inkling Lexical',
  siteDescription: `There's a whole lot to discover in this editor. Let us help you settle in.`,
  siteUrl: window.location.origin,
  membersEnabled: true,
  stripeEnabled: true,
  // this enables the internal linking feature, can be disabled with `/#/?searchLinks=false`
  searchLinks: async (term: string): Promise<SearchLinkGroup[]> => {
    // default to showing latest posts when search is empty
    // no delay to simulate posts being pre-loaded in editor
    if (!term) {
      return [
        {
          label: 'Latest posts',
          key: 'latest-posts',
          items: [
            {
              id: '1',
              groupName: 'Latest posts',
              title: "Remote Work's Impact on Job Markets and Employment",
              url: 'https://source.inkling.local/remote-works-impact-on-job-markets/',
              metaText: '8 May 2024',
              MetaIcon: LockIcon,
              metaIconTitle: 'Members only',
            },
            {
              id: '2',
              groupName: 'Latest posts',
              title: 'Robotics Renaissance: How Automation is Transforming Industries',
              url: 'https://source-newsletter.inkling.local/mental-health-awareness-in-the-workplace/',
              metaText: '2 May 2024',
              MetaIcon: DollarIcon,
              metaIconTitle: 'Specific tiers only',
            },
            {
              id: '3',
              groupName: 'Latest posts',
              title: 'Biodiversity Conservation in Fragile Ecosystems',
              url: 'https://source.inkling.local/biodiversity-conservation-in-fragile-ecosystems/',
              metaText: '26 June 2024',
              MetaIcon: DollarIcon,
              metaIconTitle: 'Paid-members only',
            },
            {
              id: '4',
              groupName: 'Latest posts',
              title: 'Unveiling the Crisis of Plastic Pollution: Analyzing Its Profound Impact on the Environment',
              url: 'https://source.inkling.local/plastic-pollution-crisis-deepens/',
              metaText: '16 Aug 2023',
            },
          ],
        },
      ]
    }

    // actual search, simulate a network request delay
    return new Promise((resolve) => {
      setTimeout(
        () => {
          const posts = [
            {
              id: '1',
              groupName: 'Posts',
              title: 'TK Reminders',
              url: 'https://inkling.local/changelog/tk-reminders/',
            },
            {
              id: '2',
              groupName: 'Posts',
              title: '✨ Emoji autocomplete ✨',
              url: 'https://inkling.local/changelog/emoji-picker/',
            },
          ].filter((item) => item.title.toLowerCase().includes(term.toLowerCase()))

          const pages = [
            {
              id: '3',
              groupName: 'Pages',
              title: 'How to update Inkling',
              url: 'https://inkling.local/docs/update/',
            },
          ].filter((item) => item.title.toLowerCase().includes(term.toLowerCase()))

          const tags = [
            {
              id: '4',
              groupName: 'Tags',
              title: 'Improved',
              url: 'https://inkling.local/changelog/tag/improved/',
            },
          ].filter((item) => item.title.toLowerCase().includes(term.toLowerCase()))

          const groups: SearchLinkGroup[] = []

          if (posts.length) {
            groups.push({ label: 'Posts', key: 'posts', items: posts })
          }
          if (pages.length) {
            groups.push({ label: 'Pages', key: 'pages', items: pages })
          }
          if (tags.length) {
            groups.push({ label: 'Tags', key: 'tags', items: tags })
          }

          resolve(groups)
        },
        process.env.NODE_ENV === 'test' ? 25 : 250,
      )
    })
  },
}

function getDefaultContent({ editorType }: { editorType?: string }) {
  if (editorType === 'basic') {
    return basicContent
  } else if (editorType === 'minimal') {
    return minimalContent
  } else if (editorType === 'email') {
    return emailContent
  }
  return content
}

function getAllowedNodes({ editorType }: { editorType?: string }) {
  if (editorType === 'basic') {
    return BASIC_NODES
  } else if (editorType === 'minimal') {
    return MINIMAL_NODES
  }
  return undefined
}

interface DemoEditorProps {
  editorType?: string
  registerAPI: (api: object | null) => void
  cursorDidExitAtTop: () => void
  setWordCount: (count: number) => void
  setTKCount: (count: number) => void
}

function DemoEditor({ editorType, registerAPI, cursorDidExitAtTop, setWordCount, setTKCount }: DemoEditorProps) {
  if (editorType === 'basic') {
    return (
      <InklingComposableEditor
        cursorDidExitAtTop={cursorDidExitAtTop}
        markdownTransformers={BASIC_TRANSFORMERS}
        registerAPI={registerAPI}
      >
        <WordCountPlugin onChange={setWordCount} />
      </InklingComposableEditor>
    )
  } else if (editorType === 'minimal') {
    return (
      <InklingComposableEditor
        cursorDidExitAtTop={cursorDidExitAtTop}
        isSnippetsEnabled={false}
        markdownTransformers={MINIMAL_TRANSFORMERS}
        registerAPI={registerAPI}
      >
        <RestrictContentPlugin paragraphs={1} />
        <WordCountPlugin onChange={setWordCount} />
      </InklingComposableEditor>
    )
  }

  return (
    <InklingEditor cursorDidExitAtTop={cursorDidExitAtTop} registerAPI={registerAPI}>
      <WordCountPlugin onChange={setWordCount} />
      <TKCountPlugin onChange={setTKCount} />
    </InklingEditor>
  )
}

interface DemoComposerProps {
  editorType?: string
  isMultiplayer?: boolean
  setWordCount: (count: number) => void
  setTKCount: (count: number) => void
}

function DemoComposer({ editorType, isMultiplayer, setWordCount, setTKCount }: DemoComposerProps) {
  const [searchParams, setSearchParams] = useSearchParams()
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)
  const [sidebarView, setSidebarView] = useState<'json' | 'tree'>('json')
  const { snippets, createSnippet, deleteSnippet } = useSnippets()

  const skipFocusEditor = React.useRef(false)

  const darkMode = searchParams.get('darkMode') === 'true'
  const contentParam = searchParams.get('content')

  const defaultContent = React.useMemo(() => {
    return JSON.stringify(getDefaultContent({ editorType }))
  }, [editorType])

  const initialContent = React.useMemo(() => {
    if (isMultiplayer) {
      return null
    }

    if (contentParam === 'false') {
      return undefined
    }

    return contentParam ? decodeURIComponent(contentParam) : defaultContent
  }, [isMultiplayer, contentParam, defaultContent])

  const [title, setTitle] = useState(initialContent ? 'Meet the Inkling editor.' : '')
  const [editorAPI, setEditorAPI] = useState<Record<string, unknown> | null>(null)
  const titleRef = React.useRef<{ focus: () => void } | null>(null)
  const containerRef = React.useRef<HTMLDivElement>(null)

  const handleRegisterAPI = React.useCallback((api: object | null) => {
    setEditorAPI(api as Record<string, unknown> | null)
  }, [])

  function openSidebar(view: 'json' | 'tree' = 'json') {
    if (isSidebarOpen && sidebarView === view) {
      return setIsSidebarOpen(false)
    }
    setSidebarView(view)
    setIsSidebarOpen(true)
  }

  function focusTitle() {
    titleRef.current?.focus()
  }

  // mousedown can select a node which can deselect another node meaning the
  // mouseup/click event can occur outside of the initially clicked node, in
  // which case we don't want to then "re-focus" the editor and cause unexpected
  // selection changes
  function maybeSkipFocusEditor(event: ReactMouseEvent<HTMLDivElement>) {
    const target = event.target as HTMLElement
    const clickedOnDecorator =
      target.closest('[data-lexical-decorator]') !== null || target.hasAttribute('data-lexical-decorator')
    const clickedOnSlashMenu =
      target.closest('[data-inkling-slash-menu]') !== null || target.hasAttribute('data-inkling-slash-menu')
    const clickedOnPortal =
      target.closest('[data-inkling-portal]') !== null || target.hasAttribute('data-inkling-portal')

    if (clickedOnDecorator || clickedOnSlashMenu || clickedOnPortal) {
      skipFocusEditor.current = true
    }
  }

  function focusEditor(event: ReactMouseEvent<HTMLDivElement>) {
    const target = event.target as HTMLElement
    const clickedOnDecorator =
      target.closest('[data-lexical-decorator]') !== null || target.hasAttribute('data-lexical-decorator')
    const clickedOnSlashMenu =
      target.closest('[data-inkling-slash-menu]') !== null || target.hasAttribute('data-inkling-slash-menu')
    const clickedOnPortal =
      target.closest('[data-inkling-portal]') !== null || target.hasAttribute('data-inkling-portal')

    if (!skipFocusEditor.current && editorAPI && !clickedOnDecorator && !clickedOnSlashMenu && !clickedOnPortal) {
      const api = editorAPI as unknown as EditorAPI
      const editor = api.editorInstance

      // if a mousedown and subsequent mouseup occurs below the editor
      // canvas, focus the editor and put the cursor at the end of the document
      const { bottom } = editor._rootElement.getBoundingClientRect()
      if (event.pageY > bottom && event.clientY > bottom) {
        event.preventDefault()

        // we should always have a visible cursor when focusing
        // at the bottom so create an empty paragraph if last
        // section is a card
        let addLastParagraph = false

        api.editorInstance.getEditorState().read(() => {
          const nodes = $getRoot().getChildren()
          const lastNode = nodes[nodes.length - 1]

          if (lastNode && $isDecoratorNode(lastNode)) {
            addLastParagraph = true
          }
        })

        if (addLastParagraph) {
          api.insertParagraphAtBottom()
        }

        // Focus the editor
        api.focusEditor({ position: 'bottom' })

        // scroll to the bottom of the container
        if (containerRef.current) {
          containerRef.current.scrollTop = containerRef.current.scrollHeight
        }
      }
    }

    skipFocusEditor.current = false
  }

  function toggleDarkMode() {
    if (darkMode) {
      searchParams.delete('darkMode')
    } else {
      searchParams.set('darkMode', 'true')
    }
    setSearchParams(searchParams as unknown as URLSearchParamsInit)
  }

  function saveContent() {
    if (!editorAPI) {
      return
    }
    const api = editorAPI as unknown as EditorAPI
    const serializedState = api.serialize()
    const encodedContent = encodeURIComponent(serializedState)
    searchParams.set('content', encodedContent)
    setSearchParams(searchParams as unknown as URLSearchParamsInit)
  }

  React.useEffect(() => {
    const handleFileDrag = (event: DragEvent) => {
      event.preventDefault()
    }

    const handleFileDrop = (event: DragEvent) => {
      if (event.dataTransfer?.files.length && event.dataTransfer.files.length > 0 && editorAPI) {
        event.preventDefault()
        const api = editorAPI as unknown as EditorAPI
        api.insertFiles(Array.from(event.dataTransfer.files))
      }
    }

    window.addEventListener('dragover', handleFileDrag)
    window.addEventListener('drop', handleFileDrop)

    return () => {
      window.removeEventListener('dragover', handleFileDrag)
      window.removeEventListener('drop', handleFileDrop)
    }
  }, [editorAPI])

  const showTitle = !isMultiplayer && !['basic', 'minimal', 'email'].includes(editorType || '')
  const isEmailEditor = editorType === 'email'

  const cardConfig = {
    ...defaultCardConfig,
    editorType,
    snippets,
    createSnippet,
    deleteSnippet,
    searchLinks: searchParams.get('searchLinks') === 'false' ? undefined : defaultCardConfig.searchLinks,
    stripeEnabled: searchParams.get('stripe') === 'false' ? false : defaultCardConfig.stripeEnabled,
  } as CardConfig

  const fileUploader = { useFileUpload: useFileUpload({ isMultiplayer }), fileTypes } as FileUploader

  // Sidebar uses useLexicalComposerContext so it must be inside a InklingComposer.
  // The email editor manages its own composer, so the sidebar is only available
  // for non-email editor types.
  const demoChrome = (
    <>
      <Watermark editorType={editorType || 'full'} />
      {!isEmailEditor && (
        <div className="absolute z-20 flex h-full flex-col items-end sm:relative">
          <Sidebar isOpen={isSidebarOpen} saveContent={saveContent} view={sidebarView} />
          <FloatingButton isOpen={isSidebarOpen} onClick={openSidebar} />
        </div>
      )}
    </>
  )

  const demoLayout = (children: React.ReactNode) => (
    <div
      className={`inkling-demo relative h-full grow ${darkMode ? 'dark' : ''}`}
      style={isSidebarOpen ? ({ '--inkling-breakout-adjustment': '440px' } as React.CSSProperties) : {}}
    >
      {!isMultiplayer && !isEmailEditor && contentParam !== 'false' ? (
        <InitialContentToggle
          defaultContent={defaultContent}
          searchParams={searchParams}
          setSearchParams={setSearchParams}
          setTitle={setTitle}
        />
      ) : null}
      <DarkModeToggle darkMode={darkMode} toggleDarkMode={toggleDarkMode} />
      <div
        ref={containerRef}
        className="h-full overflow-auto overflow-x-hidden"
        onClick={focusEditor}
        onMouseDown={maybeSkipFocusEditor}
      >
        <div className="mx-auto max-w-[740px] px-6 py-[15vmin] lg:px-0">
          {showTitle ? <TitleTextBox ref={titleRef} editorAPI={editorAPI} setTitle={setTitle} title={title} /> : null}
          {children}
        </div>
      </div>
    </div>
  )

  // Email editor includes its own InklingComposer, so it renders outside the shared one
  if (isEmailEditor) {
    return (
      <>
        {demoLayout(
          <EmailEditorWrapper>
            <EmailEditor
              cardConfig={cardConfig}
              cursorDidExitAtTop={focusTitle}
              darkMode={darkMode}
              fileUploader={fileUploader}
              initialEditorState={initialContent}
              registerAPI={handleRegisterAPI}
            >
              <WordCountPlugin onChange={setWordCount} />
            </EmailEditor>
          </EmailEditorWrapper>,
        )}
        {demoChrome}
      </>
    )
  }

  return (
    <InklingComposer
      cardConfig={cardConfig}
      darkMode={darkMode}
      enableMultiplayer={isMultiplayer}
      fileUploader={fileUploader}
      initialEditorState={initialContent}
      isTKEnabled={true}
      multiplayerDocId={`demo/${WEBSOCKET_ID}`}
      multiplayerEndpoint={WEBSOCKET_ENDPOINT}
      nodes={getAllowedNodes({ editorType })}
    >
      {demoLayout(
        <DemoEditor
          cursorDidExitAtTop={focusTitle}
          editorType={editorType}
          registerAPI={handleRegisterAPI}
          setTKCount={setTKCount}
          setWordCount={setWordCount}
        />,
      )}
      {demoChrome}
    </InklingComposer>
  )
}

const MemoizedDemoComposer = React.memo(DemoComposer)

interface DemoAppProps {
  editorType?: string
  isMultiplayer?: boolean
  introContent?: boolean
}

function DemoApp({ editorType, isMultiplayer }: DemoAppProps) {
  const [wordCount, setWordCount] = useState(0)
  const [tkCount, setTKCount] = useState(0)

  // used to force a re-initialization of the editor when URL changes, otherwise
  // content is memoized and causes issues when switching between editor types
  const location = useLocation()

  return (
    <div key={location.key} className={`inkling-lexical top`}>
      {/* outside of DemoComposer to avoid re-renders and flaky tests when word count changes */}
      <WordCount tkCount={tkCount} wordCount={wordCount} />

      <MemoizedDemoComposer
        editorType={editorType}
        isMultiplayer={isMultiplayer}
        setTKCount={setTKCount}
        setWordCount={setWordCount}
      />
    </div>
  )
}

export default DemoApp
