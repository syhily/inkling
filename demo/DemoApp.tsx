import type { MouseEvent as ReactMouseEvent } from 'react'

import { $getRoot, $isDecoratorNode } from 'lexical'
import React, { useState } from 'react'
import { useLocation, useSearchParams } from 'react-router-dom'

import {
  BASIC_NODES,
  BASIC_TRANSFORMERS,
  type CardConfig,
  DEFAULT_NODES,
  type ExternalControlAPI,
  type FileUploader,
  InklingComposableEditor,
  InklingComposer,
  InklingEditor,
  MINIMAL_NODES,
  MINIMAL_TRANSFORMERS,
  RestrictContentPlugin,
  type SearchResult,
  TKCountPlugin,
  WordCountPlugin,
} from '@/'
import EarthIcon from '@/assets/icons/inkling-earth.svg?react'

import DollarIcon from './assets/icons/inkling-dollar.svg?react'
import LockIcon from './assets/icons/inkling-lock.svg?react'
import DarkModeToggle from './components/DarkModeToggle'
import FloatingButton from './components/FloatingButton'
import InitialContentToggle from './components/InitialContentToggle'
import { musicPlayer } from './components/MusicPlayerCard'
import Sidebar from './components/Sidebar'
import TitleTextBox from './components/TitleTextBox'
import Watermark from './components/Watermark'
import WordCount from './components/WordCount'
import basicContent from './content/basic-content.json'
import content from './content/content.json'
import minimalContent from './content/minimal-content.json'
import { fetchEmbed } from './utils/fetchEmbed'
import { klipyConfig, tenorConfig } from './utils/gifConfig'
import { getDemoImageLibrary } from './utils/imageLibrary'
import { ZH_LABELS } from './utils/labels'
import { fileTypes, useFileUpload } from './utils/useFileUpload'
import { useSnippets } from './utils/useSnippets'

const url = new URL(window.location.href)
const params = new URLSearchParams(url.search)
const WEBSOCKET_ENDPOINT = params.get('multiplayerEndpoint') || 'ws://localhost:1234'
const WEBSOCKET_ID = params.get('multiplayerId') || '0'

// e2e seam: `?renderMath=stub` installs a deterministic stand-in for the
// host's server-side KaTeX channel, so the math card's preview flow is
// exercised without a real backend. The default demo host deliberately has
// no renderMath — its preview shows the TeX source.
const stubRenderMath: NonNullable<CardConfig['renderMath']> = () =>
  Promise.resolve({
    svg: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 40 16" width="40" height="16" data-math-stub="true"><rect width="40" height="16" fill="currentColor"/></svg>',
  })

const defaultCardConfig: CardConfig = {
  fetchEmbed: async (href, options) => {
    const response = await fetchEmbed(href, options)
    return response && 'metadata' in response ? response : undefined
  },
  tenor: tenorConfig ?? undefined,
  klipy: klipyConfig ?? undefined,
  fetchAutocompleteLinks: () =>
    Promise.resolve([
      { label: 'Homepage', value: window.location.origin + '/', Icon: EarthIcon, highlight: false, type: 'url' },
      {
        label: 'Free signup',
        value: window.location.origin + '/#/portal/signup/free',
        Icon: EarthIcon,
        highlight: false,
        type: 'url',
      },
    ]),
  siteUrl: window.location.origin,
  // this enables the internal linking feature, can be disabled with `/#/?searchLinks=false`
  searchLinks: async (term?: string): Promise<SearchResult[]> => {
    // default to showing latest posts when search is empty
    // no delay to simulate posts being pre-loaded in editor
    if (!term) {
      return [
        {
          label: 'Latest posts',
          items: [
            {
              title: "Remote Work's Impact on Job Markets and Employment",
              url: 'https://source.inkling.local/remote-works-impact-on-job-markets/',
              metaText: '8 May 2024',
              MetaIcon: LockIcon,
              metaIconTitle: 'Members only',
            },
            {
              title: 'Robotics Renaissance: How Automation is Transforming Industries',
              url: 'https://source-newsletter.inkling.local/mental-health-awareness-in-the-workplace/',
              metaText: '2 May 2024',
              MetaIcon: DollarIcon,
              metaIconTitle: 'Specific tiers only',
            },
            {
              title: 'Biodiversity Conservation in Fragile Ecosystems',
              url: 'https://source.inkling.local/biodiversity-conservation-in-fragile-ecosystems/',
              metaText: '26 June 2024',
              MetaIcon: DollarIcon,
              metaIconTitle: 'Paid-members only',
            },
            {
              title: 'Unveiling the Crisis of Plastic Pollution: Analyzing Its Profound Impact on the Environment',
              url: 'https://source.inkling.local/plastic-pollution-crisis-deepens/',
              metaText: '16 Aug 2023',
            },
          ],
        },
      ]
    }

    // actual search, simulate a network request delay
    const query = term.toLowerCase()
    return new Promise((resolve) => {
      setTimeout(
        () => {
          const posts = [
            {
              title: 'TK Reminders',
              url: 'https://inkling.local/changelog/tk-reminders/',
            },
            {
              title: '✨ Emoji autocomplete ✨',
              url: 'https://inkling.local/changelog/emoji-picker/',
            },
          ].filter((item) => item.title.toLowerCase().includes(query))

          const pages = [
            {
              title: 'How to update Inkling',
              url: 'https://inkling.local/docs/update/',
            },
          ].filter((item) => item.title.toLowerCase().includes(query))

          const tags = [
            {
              title: 'Improved',
              url: 'https://inkling.local/changelog/tag/improved/',
            },
          ].filter((item) => item.title.toLowerCase().includes(query))

          const groups: SearchResult[] = []

          if (posts.length) {
            groups.push({ label: 'Posts', items: posts })
          }
          if (pages.length) {
            groups.push({ label: 'Pages', items: pages })
          }
          if (tags.length) {
            groups.push({ label: 'Tags', items: tags })
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
  }
  return content
}

function getAllowedNodes({ editorType }: { editorType?: string }) {
  if (editorType === 'basic') {
    return BASIC_NODES
  } else if (editorType === 'minimal') {
    return MINIMAL_NODES
  }
  // the full surface composes the demo host card (CONTEXT.md: "host card")
  // alongside the built-in set instead of forking DEFAULT_NODES
  return [...DEFAULT_NODES, musicPlayer.node]
}

interface DemoEditorProps {
  editorType?: string
  registerAPI: (api: ExternalControlAPI | null) => void
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
  const labels = searchParams.get('labels') === 'zh' ? ZH_LABELS : undefined

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
  const [editorAPI, setEditorAPI] = useState<ExternalControlAPI | null>(null)
  const titleRef = React.useRef<{ focus: () => void } | null>(null)
  const containerRef = React.useRef<HTMLDivElement>(null)

  const handleRegisterAPI = React.useCallback((api: ExternalControlAPI | null) => {
    setEditorAPI(api)
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
    if (!(event.target instanceof Element)) {
      return
    }
    const target = event.target
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
    if (!(event.target instanceof Element)) {
      skipFocusEditor.current = false
      return
    }
    const target = event.target
    const clickedOnDecorator =
      target.closest('[data-lexical-decorator]') !== null || target.hasAttribute('data-lexical-decorator')
    const clickedOnSlashMenu =
      target.closest('[data-inkling-slash-menu]') !== null || target.hasAttribute('data-inkling-slash-menu')
    const clickedOnPortal =
      target.closest('[data-inkling-portal]') !== null || target.hasAttribute('data-inkling-portal')

    if (!skipFocusEditor.current && editorAPI && !clickedOnDecorator && !clickedOnSlashMenu && !clickedOnPortal) {
      const rootElement = editorAPI.editorInstance.getRootElement()

      // if a mousedown and subsequent mouseup occurs below the editor
      // canvas, focus the editor and put the cursor at the end of the document
      if (
        rootElement &&
        event.pageY > rootElement.getBoundingClientRect().bottom &&
        event.clientY > rootElement.getBoundingClientRect().bottom
      ) {
        event.preventDefault()

        // we should always have a visible cursor when focusing
        // at the bottom so create an empty paragraph if last
        // section is a card
        let addLastParagraph = false

        editorAPI.editorInstance.getEditorState().read(() => {
          const nodes = $getRoot().getChildren()
          const lastNode = nodes[nodes.length - 1]

          if (lastNode && $isDecoratorNode(lastNode)) {
            addLastParagraph = true
          }
        })

        if (addLastParagraph) {
          editorAPI.insertParagraphAtBottom()
        }

        // Focus the editor
        editorAPI.focusEditor({ position: 'bottom' })

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
    setSearchParams(searchParams)
  }

  function saveContent() {
    if (!editorAPI) {
      return
    }
    const serializedState = editorAPI.serialize()
    const encodedContent = encodeURIComponent(serializedState)
    searchParams.set('content', encodedContent)
    setSearchParams(searchParams)
  }

  React.useEffect(() => {
    const handleFileDrag = (event: DragEvent) => {
      event.preventDefault()
    }

    const handleFileDrop = (event: DragEvent) => {
      if (event.dataTransfer?.files.length && event.dataTransfer.files.length > 0 && editorAPI) {
        event.preventDefault()
        editorAPI.insertFiles(Array.from(event.dataTransfer.files))
      }
    }

    window.addEventListener('dragover', handleFileDrag)
    window.addEventListener('drop', handleFileDrop)

    return () => {
      window.removeEventListener('dragover', handleFileDrag)
      window.removeEventListener('drop', handleFileDrop)
    }
  }, [editorAPI])

  const showTitle = !isMultiplayer && !['basic', 'minimal'].includes(editorType || '')

  const cardConfig: CardConfig = {
    ...defaultCardConfig,
    snippets,
    createSnippet,
    deleteSnippet,
    searchLinks: searchParams.get('searchLinks') === 'false' ? undefined : defaultCardConfig.searchLinks,
    renderMath: searchParams.get('renderMath') === 'stub' ? stubRenderMath : undefined,
    // e2e seam: `?imageLibrary=fixture[-upload]` installs the fixture adapter
    // (demo/utils/imageLibrary.ts); absent = no library menu entry
    imageLibrary: getDemoImageLibrary(searchParams.get('imageLibrary')),
  }

  const fileUploader: FileUploader = { useFileUpload: useFileUpload({ isMultiplayer }), fileTypes }

  // Sidebar uses useLexicalComposerContext so it must be inside a InklingComposer.
  const demoChrome = (
    <>
      <Watermark editorType={editorType || 'full'} />
      <div className="absolute z-20 flex h-full flex-col items-end sm:relative">
        <Sidebar isOpen={isSidebarOpen} saveContent={saveContent} view={sidebarView} />
        <FloatingButton isOpen={isSidebarOpen} onClick={openSidebar} />
      </div>
    </>
  )

  const demoLayout = (children: React.ReactNode) => (
    <div
      className={`inkling-demo relative h-full grow ${darkMode ? 'dark' : ''}`}
      style={isSidebarOpen ? { '--inkling-breakout-adjustment': '440px' } : {}}
    >
      {!isMultiplayer && contentParam !== 'false' ? (
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

  return (
    <InklingComposer
      cardConfig={cardConfig}
      darkMode={darkMode}
      enableMultiplayer={isMultiplayer}
      fileUploader={fileUploader}
      initialEditorState={initialContent}
      isTKEnabled={true}
      labels={labels}
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
