export function EditorPlaceholder({ className, text }: { className?: string; text?: string }) {
  return (
    <div
      className={`left-0 top-0 font-serif text-xl text-grey-500 dark:text-grey-800 pointer-events-none absolute min-w-full cursor-text ${className}`}
    >
      {typeof text === 'string' ? text : 'Begin writing your post...'}
    </div>
  )
}
