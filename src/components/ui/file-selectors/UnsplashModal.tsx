import type { DefaultHeaderTypes, InsertImagePayload } from '@/unsplash/UnsplashTypes'

import Portal from '@/components/ui/Portal'
import { UnsplashSearchModal } from '@/unsplash'

const UnsplashModal = ({
  unsplashConf,
  onImageInsert,
  onClose,
}: {
  unsplashConf?: DefaultHeaderTypes | null
  onImageInsert?: (data: InsertImagePayload) => void
  onClose?: () => void
}) => {
  return (
    <Portal>
      <UnsplashSearchModal
        unsplashProviderConfig={unsplashConf ?? null}
        onClose={onClose!}
        onImageInsert={onImageInsert!}
      />
    </Portal>
  )
}

export default UnsplashModal
