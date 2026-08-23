import { useRef } from 'react'
import { ImagePlus, Trash2 } from 'lucide-react'
import { COVER_SHAPE, Cover } from './Cover'
import { coverUrl } from '../lib/supabase'
import type { Book } from '../types'

interface CoverPickerProps {
  book: Pick<Book, 'title' | 'authors' | 'cover_path'>
  previewUrl: string | null
  removed: boolean
  onPick: (file: File) => void
  onRemove: () => void
}

const linkClass = 'text-accent text-[13.5px] font-semibold'

export function CoverPicker({ book, previewUrl, removed, onPick, onRemove }: CoverPickerProps) {
  const input = useRef<HTMLInputElement>(null)
  const existing = removed ? null : coverUrl(book.cover_path)
  const shown = previewUrl ?? existing

  return (
    <div className="mb-5 flex gap-4">
      <div className="w-24 shrink-0">
        {shown ? (
          <img src={shown} alt="" className={`${COVER_SHAPE} bg-shade w-full object-cover`} />
        ) : (
          <Cover book={{ ...book, cover_path: null }} />
        )}
      </div>

      <div className="flex flex-col items-start gap-2 pt-1">
        <span className="text-ink-2 text-[12.5px] font-semibold">Cover</span>
        <button type="button" onClick={() => input.current?.click()} className={linkClass}>
          <ImagePlus size={15} className="mr-1.5 inline align-[-2px]" />
          {shown ? 'Ersetzen' : 'Bild wählen'}
        </button>
        {shown && (
          <button type="button" onClick={onRemove} className="text-ink-3 text-[13.5px] font-medium">
            <Trash2 size={15} className="mr-1.5 inline align-[-2px]" />
            Entfernen
          </button>
        )}
        {previewUrl && <span className="text-leaf text-[12px]">Wird beim Sichern hochgeladen</span>}

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
