import { vi } from 'vitest'

import type { InklingHostIntegrationContextValue } from '@/context/InklingHostIntegrationContext'

// The current InklingHostIntegrationContextValue shape: uploads, card
// behaviour config, and the error sink. Older per-test fixtures carried
// pre-refactor keys (darkMode, enableMultiplayer, createWebsocketProvider)
// that only compiled through excess-property luck.
export function createHostIntegrationValue(
  overrides: Partial<InklingHostIntegrationContextValue> = {},
): InklingHostIntegrationContextValue {
  return {
    fileUploader: {
      useFileUpload: () => ({
        upload: () => Promise.resolve(undefined),
      }),
    },
    cardConfig: {},
    onError: vi.fn(),
    ...overrides,
  }
}
