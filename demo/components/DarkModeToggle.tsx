interface DarkModeToggleProps {
  darkMode: boolean
  toggleDarkMode: () => void
}

const DarkModeToggle = ({ darkMode, toggleDarkMode }: DarkModeToggleProps) => {
  return (
    <>
      <button
        className="right-20 top-4 ease-in-out absolute z-20 block h-[22px] w-[42px] cursor-pointer rounded-full transition-all"
        type="button"
        onClick={toggleDarkMode}
      >
        {darkMode ? '🌚' : '🌞'}
      </button>
    </>
  )
}

export default DarkModeToggle
