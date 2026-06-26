import { Link } from 'react-router-dom'

import InklingFavicon from './icons/inkling-favicon.svg?react'

interface EditorTypeLink {
  name: string
  url: string
}

interface EditorLinkProps {
  editorType: EditorTypeLink
}

function EditorLink({ editorType }: EditorLinkProps) {
  return (
    <Link rel="nofollow ugc noopener noreferrer" to={editorType?.url}>
      <span className="font-normal hover:font-bold ml-[.7rem] hidden group-hover:inline">/ {editorType?.name}</span>
    </Link>
  )
}

interface WatermarkProps {
  editorType?: string
}

const Watermark = ({ editorType }: WatermarkProps) => {
  if (!editorType) {
    return (
      <a
        className="bottom-4 left-6 rounded bg-white py-1 pl-1 pr-2 font-mono text-sm tracking-tight text-black absolute z-20 flex items-center"
        href="https://github.com/syhily/inkling"
        rel="nofollow ugc noopener noreferrer"
        target="_blank"
      >
        <InklingFavicon className="mr-2 size-6" />
        <span className="pr-1 font-bold tracking-wide">Inkling</span>
        editor
      </a>
    )
  }

  const editorTypes: EditorTypeLink[] = [
    { name: 'full', url: '/' },
    { name: 'basic', url: '/basic' },
    { name: 'minimal', url: '/minimal' },
    { name: 'email', url: '/email' },
  ]

  const remainingEditorTypes = editorTypes.filter((type) => type.name !== editorType)
  const editorLinks = remainingEditorTypes.map((type) => <EditorLink key={type?.name} editorType={type} />)

  return (
    <>
      <div className="group bottom-4 left-6 rounded bg-white py-1 pl-1 pr-2 font-mono text-sm tracking-tight text-black absolute z-20 flex items-center">
        <InklingFavicon className="mr-2 size-6" />
        <span className="pr-1 font-bold tracking-wide">Inkling</span>
        <span className="group-hover:font-bold">
          {editorType}
          {editorLinks}
        </span>
      </div>
    </>
  )
}

export default Watermark
