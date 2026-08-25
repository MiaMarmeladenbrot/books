import { lazy, Suspense, useState, type SyntheticEvent } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { ScanBarcode, Search, X } from 'lucide-react'
import { Cover } from '../components/Cover'
import { lookupBooks, looksLikeIsbn, type Candidate } from '../lib/lookup'
import { formatNumber } from '../utils/format'

const BarcodeScanner = lazy(() =>
  import('../components/BarcodeScanner').then((module) => ({ default: module.BarcodeScanner }))
)

type Phase = 'idle' | 'searching' | 'results' | 'empty'

const PAGE_SIZE = 8

function describe(candidate: Candidate) {
  return [
    candidate.publisher,
    candidate.published_year,
    candidate.page_count ? `${formatNumber(candidate.page_count)} Seiten` : null,
  ]
    .filter(Boolean)
    .join(' · ')
}

export function BookSearch() {
  const navigate = useNavigate()
  const location = useLocation()
  const [term, setTerm] = useState('')
  const [phase, setPhase] = useState<Phase>('idle')
  const [results, setResults] = useState<Candidate[]>([])
  const [visible, setVisible] = useState(PAGE_SIZE)
  const [moreAvailable, setMoreAvailable] = useState(false)
  const [error, setError] = useState('')
  const [scanning, setScanning] = useState(
    Boolean((location.state as { scan?: boolean } | null)?.scan)
  )

  const openForm = (prefill?: Candidate, fallbackTitle?: string) => {
    navigate('/buch/neu', { state: { prefill, fallbackTitle }, replace: true })
  }

  const search = async (value: string) => {
    const trimmed = value.trim()
    if (trimmed.length < 3) return

    setError('')
    setPhase('searching')
    setVisible(PAGE_SIZE)
    try {
      const { results: found, silent, moreAvailable: more } = await lookupBooks(trimmed)
      setMoreAvailable(more)
      if (found.length === 0) {
        if (silent > 0) {
          setError('Der Katalog antwortet nicht. Nochmal versuchen oder von Hand eintragen.')
          setPhase('idle')
          return
        }
        setPhase('empty')
        return
      }
      if (found.length === 1) {
        openForm(found[0])
        return
      }
      setResults(found)
      setPhase('results')
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Suche fehlgeschlagen.')
      setPhase('idle')
    }
  }

  const runSearch = (event: SyntheticEvent) => {
    event.preventDefault()
    void search(term)
  }

  const acceptScan = (isbn: string) => {
    setScanning(false)
    setTerm(isbn)
    void search(isbn)
  }

  if (scanning) {
    return (
      <Suspense fallback={<div className="fixed inset-0 z-50 bg-black" />}>
        <BarcodeScanner onDetected={acceptScan} onClose={() => setScanning(false)} />
      </Suspense>
    )
  }

  return (
    <div className="pb-16">
      <header className="border-line sticky top-0 z-10 flex items-center gap-3 border-b bg-paper/95 px-4 py-3 backdrop-blur">
        <button type="button" onClick={() => navigate('/')} aria-label="Abbrechen">
          <X size={22} className="text-ink-3" />
        </button>
        <h1 className="font-serif text-xl font-semibold tracking-tight">Buch hinzufügen</h1>
      </header>

      <main className="mx-auto max-w-xl px-4 pt-5">
        <form onSubmit={runSearch}>
          <div className="border-line bg-card flex items-center gap-2.5 rounded-xl border px-3.5 py-3">
            <Search size={17} className="text-ink-3 shrink-0" />
            <input
              value={term}
              onChange={(event) => setTerm(event.target.value)}
              placeholder="ISBN oder Titel"
              autoFocus
              inputMode="search"
              className="placeholder:text-ink-3 w-full bg-transparent text-base outline-none"
            />
            <button
              type="button"
              onClick={() => setScanning(true)}
              aria-label="Barcode scannen"
              className="text-ink-2 shrink-0 p-0.5"
            >
              <ScanBarcode size={20} />
            </button>
          </div>
          <p className="text-ink-3 mt-2 text-xs leading-relaxed">
            {looksLikeIsbn(term)
              ? 'Wird als ISBN exakt gesucht.'
              : 'Ziffern werden als ISBN gesucht, alles andere als Titel.'}
          </p>
          <button
            type="submit"
            disabled={term.trim().length < 3 || phase === 'searching'}
            className="bg-accent mt-3 w-full rounded-xl py-3.5 text-sm font-bold text-white disabled:opacity-40"
          >
            {phase === 'searching' ? 'Sucht…' : 'Suchen'}
          </button>
        </form>

        {error && <p className="text-danger mt-4 text-sm">{error}</p>}

        {phase === 'empty' && (
          <div className="mt-8 text-center">
            <p className="font-serif mb-1.5 text-base font-semibold">
              Dazu weiß der Katalog nichts
            </p>
            <p className="text-ink-2 mx-auto mb-5 max-w-[34ch] text-sm leading-relaxed">
              Neuerscheinungen und englische Ausgaben fehlen oft. Deine Angaben sind dann die
              besseren.
            </p>
            <button
              type="button"
              onClick={() => openForm(undefined, term.trim())}
              className="bg-accent w-full rounded-xl py-3.5 text-sm font-bold text-white"
            >
              Von Hand eintragen
            </button>
          </div>
        )}

        {phase === 'results' && (
          <ul className="mt-6">
            {results.slice(0, visible).map((candidate, index) => (
              <li
                key={`${candidate.title}-${index}`}
                className="border-line border-b last:border-b-0"
              >
                <button
                  type="button"
                  onClick={() => openForm(candidate)}
                  className="flex w-full gap-3.5 py-3.5 text-left"
                >
                  <span className="w-12 shrink-0">
                    <Cover
                      title={candidate.title}
                      authors={candidate.authors}
                      src={candidate.cover_url}
                      showText={false}
                    />
                  </span>
                  <span className="min-w-0">
                    <span className="block text-sm leading-snug font-semibold">
                      {candidate.title}
                    </span>
                    {candidate.authors.length > 0 && (
                      <span className="text-ink-2 block truncate text-sm">
                        {candidate.authors.join(', ')}
                      </span>
                    )}
                    <span className="text-ink-3 mt-0.5 block text-xs">{describe(candidate)}</span>
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}

        {phase === 'results' && visible < results.length && (
          <button
            type="button"
            onClick={() => setVisible((current) => current + PAGE_SIZE)}
            className="border-line text-ink-2 mt-5 w-full rounded-xl border py-3 text-sm font-semibold"
          >
            Mehr laden ({results.length - visible} weitere)
          </button>
        )}

        {phase === 'results' && visible >= results.length && moreAvailable && (
          <p className="text-ink-3 mt-5 text-center text-xs leading-relaxed">
            Der Katalog hat noch mehr Ausgaben. Suche verfeinern, etwa mit dem Autorennamen.
          </p>
        )}

        {phase === 'results' && (
          <div className="border-line mt-6 border-t pt-5 text-center">
            <p className="text-ink-2 mb-3 text-sm">Nichts davon passt?</p>
            <button
              type="button"
              onClick={() => openForm(undefined, term.trim())}
              className="border-line text-ink-2 rounded-xl border px-5 py-2.5 text-sm font-semibold"
            >
              Von Hand eintragen
            </button>
          </div>
        )}

        {phase === 'idle' && !error && (
          <>
            <div className="text-ink-3 my-7 flex items-center gap-3 text-xs">
              <span className="bg-line h-px flex-1" />
              oder
              <span className="bg-line h-px flex-1" />
            </div>
            <button
              type="button"
              onClick={() => openForm()}
              className="border-line text-ink-2 w-full rounded-xl border py-3.5 text-sm font-semibold"
            >
              Manuell eintragen
            </button>
          </>
        )}
      </main>
    </div>
  )
}
