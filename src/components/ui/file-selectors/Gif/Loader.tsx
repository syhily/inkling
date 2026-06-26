export function Loader({ isLazyLoading }: { isLazyLoading?: boolean }) {
  if (isLazyLoading) {
    return (
      <div className="inset-y-0 p-6 w-full text-center">
        <div className="animate-spin border-black/10 before:bg-grey-800 inline-block size-[50px] rounded-full border before:z-10 before:mt-[7px] before:block before:size-[7px] before:rounded-full"></div>
      </div>
    )
  }
  return (
    <div className="inset-y-0 left-0 absolute flex w-full items-center justify-center overflow-hidden">
      <div className="animate-spin border-black/10 before:bg-grey-800 relative inline-block size-[50px] rounded-full border before:z-10 before:mt-[7px] before:block before:size-[7px] before:rounded-full"></div>
    </div>
  )
}
