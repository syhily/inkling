import type React from 'react'

export interface AudioUploadFormProps {
  onFileChange?: React.ChangeEventHandler<HTMLInputElement>
  fileInputRef?: React.Ref<HTMLInputElement>
  mimeTypes?: string[]
  filePicker?: () => void
}

export function AudioUploadForm({ onFileChange, fileInputRef, mimeTypes = ['audio/*'] }: AudioUploadFormProps) {
  const accept = mimeTypes.join(',')

  return (
    <form>
      <input ref={fileInputRef} accept={accept} hidden={true} name="audio-input" type="file" onChange={onFileChange} />
    </form>
  )
}

export default AudioUploadForm
