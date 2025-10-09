import { useCallback, useMemo, useRef, useState } from 'react'
import { Upload, X } from 'lucide-react'

export type UploadItem = {
  file: File
  status: 'queued' | 'uploading' | 'done' | 'error'
  progress: number
}

export type UploaderProps = {
  accept?: string
  maxSizeMb?: number
  onChange?: (items: UploadItem[]) => void
}

export function Uploader({ accept = '.pdf,.jpg,.jpeg,.png', maxSizeMb = 10, onChange }: UploaderProps) {
  const inputRef = useRef<HTMLInputElement | null>(null)
  const [items, setItems] = useState<UploadItem[]>([])

  const handleFiles = useCallback(
    (fileList: FileList | null) => {
      if (!fileList) {
        return
      }

      const newItems: UploadItem[] = []
      Array.from(fileList).forEach((file) => {
        if (file.size > maxSizeMb * 1024 * 1024) {
          newItems.push({ file, status: 'error', progress: 0 })
          return
        }

        newItems.push({ file, status: 'queued', progress: 0 })
      })

      setItems((previous) => {
        const merged = [...previous, ...newItems]
        onChange?.(merged)
        return merged
      })
    },
    [maxSizeMb, onChange],
  )

  const removeItem = useCallback(
    (index: number) => {
      setItems((previous) => {
        const next = previous.filter((_, itemIndex) => itemIndex !== index)
        onChange?.(next)
        return next
      })
    },
    [onChange],
  )

  const totalQueued = useMemo(() => items.filter((item) => item.status === 'queued').length, [items])

  return (
    <div className="space-y-4">
      <div
        className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-emerald-500/40 bg-emerald-500/5 px-10 py-16 text-center text-slate-200"
        onDragOver={(event) => {
          event.preventDefault()
        }}
        onDrop={(event) => {
          event.preventDefault()
          handleFiles(event.dataTransfer.files)
        }}
      >
        <Upload className="h-10 w-10 text-emerald-300" />
        <div>
          <p className="text-lg font-semibold">Arraste os comprovantes aqui</p>
          <p className="text-sm text-slate-400">
            Suporta PDF, JPG e PNG. Tamanho máximo de {maxSizeMb} MB por arquivo.
          </p>
        </div>
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className="rounded-lg bg-emerald-500 px-4 py-2 text-sm font-semibold text-slate-950 shadow hover:bg-emerald-400"
        >
          Selecionar arquivos
        </button>
        <input
          ref={inputRef}
          type="file"
          accept={accept}
          multiple
          className="hidden"
          onChange={(event) => handleFiles(event.target.files)}
        />
      </div>

      {items.length > 0 && (
        <div className="rounded-xl border border-slate-800 bg-slate-900/50">
          <div className="flex items-center justify-between border-b border-slate-800 px-4 py-3 text-xs uppercase tracking-wide text-slate-400">
            <span>Arquivos ({items.length})</span>
            <span>{totalQueued} na fila</span>
          </div>
          <ul className="divide-y divide-slate-800 text-sm">
            {items.map((item, index) => (
              <li key={`${item.file.name}-${index}`} className="flex items-center justify-between gap-3 px-4 py-3">
                <div>
                  <p className="font-medium text-slate-100">{item.file.name}</p>
                  <p className="text-xs text-slate-500">
                    {(item.file.size / (1024 * 1024)).toFixed(2)} MB · {item.status}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <div className="h-2 w-32 rounded-full bg-slate-800">
                    <div
                      className={`h-2 rounded-full ${item.status === 'error' ? 'bg-rose-400' : 'bg-emerald-400'}`}
                      style={{ width: `${item.progress}%` }}
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => removeItem(index)}
                    className="rounded-lg border border-slate-700 p-1 text-slate-400 hover:text-rose-300"
                    aria-label="Remover arquivo"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}
