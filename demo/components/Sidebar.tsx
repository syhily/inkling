import SerializedStateTextarea from './SerializedStateTextarea'
import TreeView from './TreeView'

interface SidebarProps {
  isOpen: boolean
  view: string
  saveContent?: () => void
}

const Sidebar = ({ isOpen, view, saveContent }: SidebarProps) => {
  return (
    <div
      className={`border-grey-100 bg-black pb-16 ease-in-out h-full grow overflow-hidden transition-all ${isOpen ? 'right-0 sm:w-[440px] w-full opacity-100' : 'w-0 right-[-100%] opacity-0'}`}
    >
      {view === 'json' && <SerializedStateTextarea isOpen={isOpen} />}
      {view === 'tree' && <TreeView isOpen={isOpen} />}

      {view === 'json' && (
        <div className="absolute bottom-[1.1em] left-[1em]">
          <button type="button" onClick={saveContent}>
            💾
          </button>
        </div>
      )}
    </div>
  )
}

export default Sidebar
