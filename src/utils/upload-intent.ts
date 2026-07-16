import { $getNodeByKey, type LexicalEditor, type LexicalNode, type NodeKey } from 'lexical'

import { $updateCardNode } from '@/nodes/base'
import { revokePreviewUrl } from '@/utils/revokePreviewUrl'

/**
 * The one upload-intent module (plan 045): file(s) + per-card metadata
 * extraction in, typed node patch out through plan 044's write seam
 * ($updateCardNode), and the object-URL preview lifecycle created and revoked
 * in one place. The six near-clone upload flows (image/audio/file/thumbnail
 * handlers plus video's and gallery's inline re-implementations) are
 * configurations of these primitives — per-card variance (metadata
 * extraction, empty-result policy, the pre-upload src reset) stays per-card
 * data, never a copied skeleton.
 */

export interface UploadResultItem {
  url?: string
  fileName?: string
}

/**
 * The single home of the uploader signature — plain and `formData`-carrying
 * calls (thumbnail/video sub-flows) share it. Matches the host-provided
 * `FileUploader['useFileUpload']` upload.
 */
export type UploadFn = (
  files: FileList | File[],
  options?: { formData?: Record<string, string> },
) => Promise<UploadResultItem[] | undefined>

export interface UploadOptions {
  formData?: Record<string, string>
}

export interface PreviewLease {
  /** The object URL handed out for preview/metadata use. */
  url: string
  /** Revokes the object URL. Idempotent — safe to call more than once. */
  release: () => void
}

/**
 * The one place `URL.createObjectURL` is called for upload previews: a lease
 * pairs creation with an idempotent release built on `revokePreviewUrl`'s
 * `blob:` guard. Callers that outlive a single intent (video's thumbnail
 * preview) hold the lease through `usePreviewLease`; callers with several
 * concurrent previews (gallery) hold a `PreviewLeasePool`.
 */
export function createPreviewLease(blob: Blob): PreviewLease {
  const url = URL.createObjectURL(blob)
  let released = false
  return {
    url,
    release: () => {
      if (!released) {
        released = true
        revokePreviewUrl(url)
      }
    },
  }
}

export interface PreviewLeasePool {
  /** Leases a preview URL for a blob and tracks it. Returns the URL. */
  lease: (blob: Blob) => string
  /** Releases one tracked URL; a no-op for unknown or already-released URLs. */
  release: (url: string | null | undefined) => void
  /** Releases every tracked URL (the unmount cleanup). */
  releaseAll: () => void
}

/**
 * Tracks a set of preview leases (gallery's multi-file previews) so each can
 * be released individually — on success, failure, or delete — and all of them
 * at once on unmount.
 */
export function createPreviewLeasePool(): PreviewLeasePool {
  const leases = new Map<string, PreviewLease>()
  return {
    lease: (blob) => {
      const lease = createPreviewLease(blob)
      leases.set(lease.url, lease)
      return lease.url
    },
    release: (url) => {
      if (url) {
        leases.get(url)?.release()
        leases.delete(url)
      }
    },
    releaseAll: () => {
      leases.forEach((lease) => lease.release())
      leases.clear()
    },
  }
}

export interface ExtractMetadataContext {
  file: File
  /** The leased preview URL when `leasePreview` is set, else null. */
  previewUrl: string | null
  /** The first upload result URL; only set for `afterUpload` extraction. */
  resultUrl: string | undefined
}

export interface PatchContext<TMeta> {
  meta: TMeta
  resultUrl: string | undefined
  result: UploadResultItem[] | undefined
  file: File
}

export interface RunUploadIntentOptions<TNode extends LexicalNode, TMeta = undefined> {
  editor: LexicalEditor
  nodeKey: NodeKey
  /** The card-node type guard the typed seam narrows with (e.g. `$isImageNode`). */
  guard: (node: unknown) => node is TNode
  files: FileList | File[] | null
  upload: UploadFn
  /** Extra upload options, or a resolver computing them off the current node — called inside an editor read (audio thumbnail's `formData` url). */
  uploadOptions?: UploadOptions | ((node: TNode | null) => UploadOptions)
  /** Pre-upload node patch applied through the seam (the `onFileChange` src reset). */
  prePatch?: (node: TNode) => void
  /** Lease an object URL for `files[0]` for the duration of the intent (image's preview, audio's metadata URL). */
  leasePreview?: boolean
  /** Publishes the leased URL on the node through the seam (image's `previewSrc`). */
  previewPatch?: (node: TNode, url: string) => void
  /** Pre-extracted metadata, when extraction happens outside the runner (video's caught `extractVideoMetadata`). */
  meta?: TMeta
  /**
   * Per-card metadata extraction. `beforeUpload` (default) runs it after the
   * preview lease and before the upload (image's dimensions); `afterUpload`
   * runs it only after a non-empty result (audio's duration, custom
   * thumbnail's dimensions from the result URL).
   */
  extractMetadata?: (context: ExtractMetadataContext) => Promise<TMeta>
  metadataTiming?: 'beforeUpload' | 'afterUpload'
  /** What counts as an empty upload result. Default: no first result url. */
  isEmptyResult?: (result: UploadResultItem[] | undefined) => boolean
  /**
   * The empty-result policy: `'bail'` leaves the node untouched (audio, file,
   * thumbnails, video); `'patch'` writes the patch anyway (image's
   * `src: ''`).
   */
  onEmptyResult: 'bail' | 'patch'
  /** Called when the flow bails on an empty result (video clears its preview). */
  onBail?: () => void
  /** The result patch, applied through plan 044's write seam. */
  patch: (node: TNode, context: PatchContext<TMeta>) => void
}

/**
 * Runs one upload intent: null-guard → `prePatch` → preview lease (+ publish)
 * → `beforeUpload` extraction → upload → empty-result policy → `afterUpload`
 * extraction → `patch` through 044's seam. The lease is released in a
 * `finally` around the whole flow, and rejections always propagate (per-card
 * pinned policy).
 *
 * Returns the first result URL (`undefined` when the flow bailed) so callers
 * can compose follow-up intents imperatively (video's thumbnail sub-flow).
 */
export async function runUploadIntent<TNode extends LexicalNode, TMeta = undefined>({
  editor,
  nodeKey,
  guard,
  files,
  upload,
  uploadOptions,
  prePatch,
  leasePreview,
  previewPatch,
  meta,
  extractMetadata,
  metadataTiming = 'beforeUpload',
  isEmptyResult = (result) => !result?.[0]?.url,
  onEmptyResult,
  onBail,
  patch,
}: RunUploadIntentOptions<TNode, TMeta>): Promise<string | undefined> {
  if (!files) {
    return undefined
  }

  if (prePatch) {
    await editor.update(() => {
      $updateCardNode(nodeKey, guard, prePatch)
    })
  }

  const file = files[0]
  const lease = leasePreview ? createPreviewLease(file) : null

  try {
    if (lease && previewPatch) {
      await editor.update(() => {
        $updateCardNode(nodeKey, guard, (node) => {
          previewPatch(node, lease.url)
        })
      })
    }

    let extracted = meta as TMeta
    if (extractMetadata && metadataTiming === 'beforeUpload') {
      extracted = await extractMetadata({ file, previewUrl: lease?.url ?? null, resultUrl: undefined })
    }

    const resolvedUploadOptions =
      typeof uploadOptions === 'function'
        ? editor.getEditorState().read(() => {
            const node = $getNodeByKey(nodeKey)
            return uploadOptions(guard(node) ? node : null)
          })
        : uploadOptions
    const result = await upload(files, resolvedUploadOptions)
    const resultUrl = result?.[0]?.url

    if (isEmptyResult(result) && onEmptyResult === 'bail') {
      onBail?.()
      return undefined
    }

    if (extractMetadata && metadataTiming === 'afterUpload') {
      extracted = await extractMetadata({ file, previewUrl: lease?.url ?? null, resultUrl })
    }

    await editor.update(() => {
      $updateCardNode(nodeKey, guard, (node) => {
        patch(node, { meta: extracted, resultUrl, result, file })
      })
    })

    return resultUrl
  } finally {
    lease?.release()
  }
}
