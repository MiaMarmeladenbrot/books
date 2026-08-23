import { useState, type SyntheticEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { Search, X } from 'lucide-react'
import { COVER_SHAPE } from '../components/Cover'
import { lookupBooks, looksLikeIsbn, type Candidate } from '../lib/lookup'
import { formatNumber, hueFromTitle } from '../utils/format'

type Phase = 'idle' | 'searching' | 'results' | 'empty'

function CandidateCover({ candidate }: { candidate: Candidate }) {
  const hue = hueFromTitle(candidate.title)
  if (candidate.cover_url) {
    return (
      <img
        src={candidate.cover_url}
        alt=""
        loading="lazy"
        className={`${COVER_SHAPE} bg-shade w-full object-cover`}
      />
    )
  }
  return (
    <div
      className={COVER_SHAPE}
      style={{
        background: `linear-gradient(150deg, hsl(${hue} 34% 40%), hsl(${(hue + 28) % 360} 30% 26%))`,
      }}
    />
  )
}

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
  const [term, setTerm] = useState('')
  const [phase, setPhase] = useState<Phase>('idle')
  const [results, setResults] = useState<Candidate[]>([])
  const [error, setError] = useState('')

  const openForm = (prefill?: Candidate, fallbackTitle?: string) => {
    navigate('/buch/neu', { state: { prefill, fallbackTitle }, replace: true })
  }

  const runSearch = async (event: SyntheticEvent) => {
    event.preventDefault()
    const trimmed = term.trim()
    if (trimmed.length < 3) return

    setError('')
    setPhase('searching')
    try {
      const { results: found } = await lookupBooks(trimmed)
      if (found.length === 0) {
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
          </div>
          <p className="text-ink-3 mt-2 text-[12.5px] leading-relaxed">
            {looksLikeIsbn(term)
              ? 'Wird als ISBN exakt gesucht.'
              : 'Ziffern werden als ISBN gesucht, alles andere als Titel.'}
          </p>
          <button
            type="submit"
            disabled={term.trim().length < 3 || phase === 'searching'}
            className="bg-accent mt-3 w-full rounded-xl py-3.5 text-[15px] font-bold text-white disabled:opacity-40"
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
            <p className="text-ink-2 mx-auto mb-5 max-w-[34ch] text-[13px] leading-relaxed">
              Neuerscheinungen und englische Ausgaben fehlen oft. Deine Angaben sind dann die
              besseren.
            </p>
            <button
              type="button"
              onClick={() => openForm(undefined, term.trim())}
              className="bg-accent w-full rounded-xl py-3.5 text-[15px] font-bold text-white"
            >
              Von Hand eintragen
            </button>
          </div>
        )}

        {phase === 'results' && (
          <ul className="mt-6">
            {results.map((candidate, index) => (
              <li key={`${candidate.title}-${index}`} className="border-line border-b last:border-b-0">
                <button
                  type="button"
                  onClick={() => openForm(candidate)}
                  className="flex w-full gap-3.5 py-3.5 text-left"
                >
                  <span className="w-12 shrink-0">
                    <CandidateCover candidate={candidate} />
                  </span>
                  <span className="min-w-0">
                    <span className="block text-[14.5px] leading-snug font-semibold">
                      {candidate.title}
                    </span>
                    {candidate.authors.length > 0 && (
                      <span className="text-ink-2 block truncate text-[13px]">
                        {candidate.authors.join(', ')}
                      </span>
                    )}
                    <span className="text-ink-3 mt-0.5 block text-[11.5px]">
                      {describe(candidate)}
                    </span>
                    <span className="text-ink-3 border-line mt-1.5 inline-block rounded border px-1.5 text-[10px] font-bold tracking-wider uppercase">
                      {candidate.source === 'DNB' ? 'DNB' : 'Open Library'}
                    </span>
                  </span>
                </button>
              </li>
            ))}
          </ul>
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
              className="border-line text-ink-2 w-full rounded-xl border py-3.5 text-[14.5px] font-semibold"
            >
              Ohne Suche eintragen
            </button>
            <p className="text-ink-3 mt-2 text-[12.5px] leading-relaxed">
              Für Bücher ohne ISBN — Bibliotheksleihen, alte Ausgaben.
            </p>
          </>
        )}
      </main>
    </div>
  )
}
