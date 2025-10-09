import { useState } from 'react'
import { Uploader, type UploadItem } from '@/components/Uploader'

export type UploadZoneProps = {
  onChange: (items: UploadItem[]) => void
}

export function UploadZone({ onChange }: UploadZoneProps) {
  const [items, setItems] = useState<UploadItem[]>([])

  return (
    <div className="space-y-4">
      <Uploader
        onChange={(uploaded) => {
          setItems(uploaded)
          onChange(uploaded)
        }}
      />
      {items.length > 0 && (
        <div className="rounded-xl border border-slate-800 bg-slate-900/40 px-4 py-3 text-xs text-slate-400">
          Fila com {items.length} arquivo(s). Você pode remover qualquer item antes do envio.
        </div>
      )}
    </div>
  )
}
