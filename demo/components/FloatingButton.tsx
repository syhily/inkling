interface FloatingButtonProps {
  isOpen: boolean
  onClick: (view: 'json' | 'tree') => void
}

const FloatingButton = ({ isOpen, onClick }: FloatingButtonProps) => {
  return (
    <div
      className={`bottom-4 right-6 rounded px-2 py-1 font-mono text-sm tracking-tight text-grey-600 ease-in-out fixed z-20 transition-all duration-200 ${isOpen ? 'bg-transparent' : 'bg-white'}`}
    >
      <button className="cursor-pointer" type="button" onClick={() => onClick('json')}>
        JSON output
      </button>
      &nbsp;|&nbsp;
      <button className="cursor-pointer" type="button" onClick={() => onClick('tree')}>
        State tree
      </button>
    </div>
  )
}

export default FloatingButton
