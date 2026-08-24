import { useRef } from 'react'
import { ImagePlus, Trash2 } from 'lucide-react'
import { Cover } from './Cover'
import { coverUrl } from '../lib/supabase'

interface CoverPickerProps {
  title: string
  authors: string[]
  coverPath: string | null
  previewUrl: string | null
  removed: boolean
  onPick: (file: File) => void
  onRemove: () => void
}

const linkClass = 'text-accent text-sm font-semibold'

export function CoverPicker({
  title,
  authors,
  coverPath,
  previewUrl,
  removed,
  onPick,
  onRemove,
}: CoverPickerProps) {
  const input = useRef<HTMLInputElement>(null)
  const shown = previewUrl ?? (removed ? null : coverUrl(coverPath))

  return (
    <div className="mb-5 flex gap-4">
      <div className="w-24 shrink-0">
        <Cover title={title || 'Neues Buch'} authors={authors} src={shown} />
      </div>

      <div className="flex flex-col items-start gap-2 pt-1">
        <span className="text-ink-2 text-xs font-semibold">Cover</span>
        <button type="button" onClick={() => input.current?.click()} className={linkClass}>
          <ImagePlus size={15} className="mr-1.5 inline align-[-2px]" />
          {shown ? 'Ersetzen' : 'Bild wählen'}
        </button>
        {shown && (
          <button type="button" onClick={onRemove} className="text-ink-3 text-sm font-medium">
            <Trash2 size={15} className="mr-1.5 inline align-[-2px]" />
            Entfernen
          </button>
        )}
        {previewUrl && <span className="text-leaf text-xs">Wird beim Sichern hochgeladen</span>}

        <input
          ref={input}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          className="hidden"
          onChange={(event) => {
            const file = event.target.files?.[0]
            if (file) onPick(file)
            event.target.value = ''
          }}
        />
      </div>
    </div>
  )
}
