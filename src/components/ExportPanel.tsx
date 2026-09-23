import { Download } from 'lucide-react'
import { Panel } from './Panel'
import { booksToCsv, booksToJson, download } from '../utils/export'
import { todayIso } from '../utils/format'
import { m } from '../paraglide/messages.js'
import type { Book } from '../types'

const buttonClass =
  'border-line bg-paper text-ink flex flex-1 items-center justify-center gap-2 rounded-xl border py-3 text-sm font-semibold'

export function ExportPanel({ books }: { books: Book[] }) {
  const stamp = todayIso()

  return (
    <Panel title={m.export_title()}>
      <p className="text-ink-2 mb-3.5 text-sm leading-relaxed">
        {m.export_body({ count: books.length })}
      </p>
      <div className="flex gap-2.5">
        <button
          type="button"
          onClick={() =>
            download(`lesestapel-${stamp}.json`, 'application/json', booksToJson(books))
          }
          className={buttonClass}
        >
          <Download size={16} />
          JSON
        </button>
        <button
          type="button"
          onClick={() => download(`lesestapel-${stamp}.csv`, 'text/csv', booksToCsv(books))}
          className={buttonClass}
        >
          <Download size={16} />
          CSV
        </button>
      </div>
    </Panel>
  )
}
