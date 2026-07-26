import { useCallback, useEffect, useRef, useState } from 'react'

import { useInklingLabels } from '@/hooks/useInklingLabels'
import trackEvent from '@/utils/analytics'

export interface PinturaConfig {
  jsUrl?: string
  cssUrl?: string
  /** Pintura `locale` overrides — merged ON TOP of the labels table's
   * `pintura.*` entries, so a host can patch any Pintura string the labels
   * table does not cover (docs/kobato-fit-plan.md C7). */
  locale?: Record<string, string>
}

interface UsePinturaEditorOptions {
  config?: PinturaConfig
  disabled?: boolean
}

interface PinturaHandleSaveResult {
  dest: Blob
}

interface UsePinturaEditorResult {
  isEnabled: boolean
  openEditor: ({ image, handleSave }: { image: string; handleSave: (blob: Blob) => void }) => void
  error: Error | null
}

declare global {
  interface Window {
    pintura?: {
      openDefaultEditor: (options: Record<string, unknown>) => PinturaEditor
    }
  }
}

interface PinturaEditor {
  on(event: 'loaderror', handler: (error: unknown) => void): void
  on(event: 'process', handler: (result: PinturaHandleSaveResult) => void): void
}

export default function usePinturaEditor({
  config,
  disabled = false,
}: UsePinturaEditorOptions = {}): UsePinturaEditorResult {
  const labels = useInklingLabels()
  const [scriptLoaded, setScriptLoaded] = useState<boolean>(false)
  const [cssLoaded, setCssLoaded] = useState<boolean>(false)
  const [error, setError] = useState<Error | null>(null)
  const allowClose = useRef<boolean>(false)

  const isEnabled = !disabled && scriptLoaded && cssLoaded

  useEffect(() => {
    const jsUrl = config?.jsUrl

    if (!jsUrl) {
      return
    }

    if (window.pintura) {
      setScriptLoaded(true)
      return
    }

    try {
      const url = new URL(jsUrl)
      const importUrl = `${url.protocol}//${url.host}${url.pathname}`
      const importScriptPromise = import(/* @vite-ignore */ importUrl)

      importScriptPromise
        .then(() => {
          setScriptLoaded(true)
        })
        .catch(() => {
          setError(new Error(`Failed to load Pintura script from ${jsUrl}`))
        })
    } catch (e) {
      setError(e instanceof Error ? e : new Error('Failed to load Pintura script'))
    }
  }, [config?.jsUrl])

  useEffect(() => {
    const cssUrl = config?.cssUrl
    if (!cssUrl) {
      return
    }

    try {
      // Check if the CSS file is already present in the document's head
      const cssLink = document.querySelector(`link[href="${cssUrl}"]`)
      if (cssLink) {
        setCssLoaded(true)
      } else {
        const link = document.createElement('link')
        link.rel = 'stylesheet'
        link.type = 'text/css'
        link.href = cssUrl
        link.onload = () => {
          setCssLoaded(true)
        }
        link.onerror = () => {
          setError(new Error(`Failed to load Pintura stylesheet from ${cssUrl}`))
        }
        document.head.appendChild(link)
      }
    } catch (e) {
      setError(e instanceof Error ? e : new Error('Failed to load Pintura stylesheet'))
    }
  }, [config?.cssUrl])

  const openEditor = useCallback(
    ({ image, handleSave }: { image: string; handleSave: (blob: Blob) => void }) => {
      allowClose.current = false

      trackEvent('Image Edit Button Clicked', { location: 'editor' })
      if (image && isEnabled && window.pintura) {
        // add a timestamp to the image src to bypass cache
        // avoids cors issues with cached images
        const imageUrl = new URL(image)
        if (!imageUrl.searchParams.has('v')) {
          imageUrl.searchParams.set('v', Date.now().toString())
        }

        const imageSrc = imageUrl.href
        const editor = window.pintura.openDefaultEditor({
          src: imageSrc,
          enableTransparencyGrid: true,
          util: 'crop',
          utils: ['crop', 'filter', 'finetune', 'redact', 'annotate', 'trim', 'frame', 'resize'],
          frameOptions: [
            // No frame
            [undefined, (locale: { labelNone: string }) => locale.labelNone],

            // Sharp edge frame
            ['solidSharp', (locale: { frameLabelMatSharp: string }) => locale.frameLabelMatSharp],

            // Rounded edge frame
            ['solidRound', (locale: { frameLabelMatRound: string }) => locale.frameLabelMatRound],

            // A single line frame
            ['lineSingle', (locale: { frameLabelLineSingle: string }) => locale.frameLabelLineSingle],

            // A frame with cornenr hooks
            ['hook', (locale: { frameLabelCornerHooks: string }) => locale.frameLabelCornerHooks],

            // A polaroid frame
            ['polaroid', (locale: { frameLabelPolaroid: string }) => locale.frameLabelPolaroid],
          ],
          cropSelectPresetFilter: 'landscape',
          cropSelectPresetOptions: [
            [undefined, labels['pintura.cropPreset.custom']],
            [1, labels['pintura.cropPreset.square']],
            // shown when cropSelectPresetFilter is set to 'landscape'
            [2 / 1, '2:1'],
            [3 / 2, '3:2'],
            [4 / 3, '4:3'],
            [16 / 10, '16:10'],
            [16 / 9, '16:9'],
            // shown when cropSelectPresetFilter is set to 'portrait'
            [1 / 2, '1:2'],
            [2 / 3, '2:3'],
            [3 / 4, '3:4'],
            [10 / 16, '10:16'],
            [9 / 16, '9:16'],
          ],
          locale: {
            labelButtonExport: labels['pintura.export'],
            // the host's pinturaConfig.locale patches any Pintura string on
            // top of the labels table (higher priority)
            ...config?.locale,
          },
          previewPad: true,
          willClose: () => allowClose.current, // prevent closing on escape, only allow on close button clicks
        })

        editor.on('loaderror', (err) => {
          setError(err instanceof Error ? err : new Error('Pintura editor load error'))
        })

        editor.on('process', (result) => {
          // save edited image
          handleSave(result.dest)
          trackEvent('Image Edit Saved', { location: 'editor' })
        })
      }
    },
    [isEnabled, labels, config?.locale],
  )

  useEffect(() => {
    const handleCloseClick = (event: MouseEvent) => {
      const target = event.target
      if (target instanceof Element && target.closest('.PinturaModal button[title="Close"]')) {
        allowClose.current = true
      }
    }

    window.addEventListener('click', handleCloseClick, { capture: true })

    return () => {
      window.removeEventListener('click', handleCloseClick, { capture: true })
    }
  }, [])

  return {
    isEnabled,
    openEditor,
    error,
  }
}
