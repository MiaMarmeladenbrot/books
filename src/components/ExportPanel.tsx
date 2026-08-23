import { Download } from 'lucide-react'
import { booksToCsv, booksToJson, download } from '../utils/export'
import { formatNumber, todayIso } from '../utils/format'
import type { Book } from '../types'

const buttonClass =
  'border-line bg-paper text-ink flex flex-1 items-center justify-center gap-2 rounded-xl border py-3 text-sm font-semibold'

export function ExportPanel({ books }: { books: Book[] }) {
  const stamp = todayIso()

  return (
    <section className="border-line bg-card mb-3.5 rounded-2xl border px-4 py-4">
      <h2 className="text-ink-3 mb-1.5 text-[11.5px] font-bold tracking-[0.09em] uppercase">
        Sicherung
      </h2>
      <p className="text-ink-2 mb-3.5 text-[13px] leading-relaxed">
        {formatNumber(books.length)} Bücher herunterladen. Die JSON-Datei ist die vollständige
        Sicherung, die CSV-Datei zum Anschauen in Numbers oder Excel.
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
    </section>
  )
}
