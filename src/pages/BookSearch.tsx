import { lazy, Suspense, useRef, useState, type SyntheticEvent } from 'react'
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom'
import { ScanBarcode, Search, X } from 'lucide-react'
import { Cover } from '../components/Cover'
import { ShelfGap } from '../components/ShelfGap'
import { looksLikeIsbn, lookupBooks, rememberedLookup, type Candidate } from '../lib/lookup'
import { m } from '../paraglide/messages.js'
import { FORMAT_LABEL } from '../types'

const BarcodeScanner = lazy(() =>
  import('../components/BarcodeScanner').then((module) => ({ default: module.BarcodeScanner })),
)

type Outcome =
  | { kind: 'idle' }
  | { kind: 'searching' }
  | { kind: 'partial'; results: Candidate[]; moreAvailable: boolean }
  | { kind: 'results'; results: Candidate[]; moreAvailable: boolean }
  | { kind: 'empty'; oneSourceQuiet: boolean }
  | { kind: 'failed'; message: string }

const PAGE_SIZE = 8

function describe(candidate: Candidate) {
  return [
    candidate.format ? FORMAT_LABEL[candidate.format]() : null,
    candidate.publisher,
    candidate.published_year,
    candidate.page_count ? m.search_pages({ count: candidate.page_count }) : null,
  ]
    .filter(Boolean)
    .join(' · ')
}

export function BookSearch() {
  const navigate = useNavigate()
  const location = useLocation()
  const [params, setParams] = useSearchParams()
  const asked = params.get('q') ?? ''
  const [term, setTerm] = useState(asked)
  const [outcome, setOutcome] = useState<Outcome>(() => {
    const known = asked ? rememberedLookup(asked) : null
    return known
      ? { kind: 'results', results: known.results, moreAvailable: known.moreAvailable }
      : { kind: 'idle' }
  })
  const [visible, setVisible] = useState(PAGE_SIZE)
  const attempt = useRef(0)
  const [scanning, setScanning] = useState(false)

  const openForm = (prefill?: Candidate, typed?: string) => {
    const kept = (typed ?? '').trim()
    const fallback = looksLikeIsbn(kept)
      ? { fallbackIsbn: kept.replace(/[^0-9Xx]/g, '') }
      : { fallbackTitle: kept }
    navigate('/buch/neu', { state: { prefill, ...fallback } })
  }

  const search = async (value: string) => {
    const trimmed = value.trim()
    if (trimmed.length < 3) return

    const run = attempt.current + 1
    attempt.current = run
    let shown = false

    setParams({ q: trimmed }, { replace: true })
    setVisible(PAGE_SIZE)
    setOutcome({ kind: 'searching' })

    try {
      const {
        results,
        asked: tried,
        silent,
        moreAvailable,
      } = await lookupBooks(trimmed, (first) => {
        if (run !== attempt.current || first.results.length === 0) return
        shown = true
        setOutcome({
          kind: 'partial',
          results: first.results,
          moreAvailable: first.moreAvailable,
        })
      })
      if (run !== attempt.current) return

      if (results.length === 0) {
        setOutcome(
          silent === tried
            ? {
                kind: 'failed',
                message: m.error_catalogue_silent(),
              }
            : { kind: 'empty', oneSourceQuiet: silent > 0 },
        )
        return
      }
      if (results.length === 1 && !shown) {
        openForm(results[0])
        return
      }
      setOutcome({ kind: 'results', results, moreAvailable })
    } catch (caught) {
      if (run !== attempt.current) return
      setOutcome({
        kind: 'failed',
        message: caught instanceof Error ? caught.message : m.error_search_failed(),
      })
    }
  }

  const runSearch = (event: SyntheticEvent) => {
    event.preventDefault()
    void search(term)
  }

  const clearTerm = () => {
    attempt.current += 1
    setTerm('')
    setVisible(PAGE_SIZE)
    setOutcome({ kind: 'idle' })
    setParams({}, { replace: true })
  }

  const acceptScan = (isbn: string) => {
    setScanning(false)
    setTerm(isbn)
    void search(isbn)
  }

  const leave = () => {
    if (location.key === 'default') navigate('/', { replace: true })
    else navigate(-1)
  }

  if (scanning) {
    return (
      <Suspense fallback={<div className="fixed inset-0 z-50 bg-black" />}>
        <BarcodeScanner onDetected={acceptScan} onClose={() => setScanning(false)} />
      </Suspense>
    )
  }

  const asking = outcome.kind === 'searching' || outcome.kind === 'partial'
  const listed = outcome.kind === 'partial' || outcome.kind === 'results' ? outcome : null
  const offersManualEntry = outcome.kind === 'idle' || outcome.kind === 'failed'

  return (
    <div className="pb-16">
      <header className="border-line sticky top-0 z-10 flex items-center gap-3 border-b bg-paper/95 px-4 py-3 backdrop-blur">
        <button type="button" onClick={leave} aria-label={m.action_cancel()}>
          <X size={22} className="text-ink-3" />
        </button>
        <h1 className="font-serif text-xl font-semibold tracking-tight">{m.search_title()}</h1>
        {asking && (
          <span
            aria-hidden
            className="pointer-events-none absolute inset-x-0 -bottom-px h-0.5 overflow-hidden"
          >
            <span className="catalogue-sweep bg-accent absolute inset-y-0 w-1/3 rounded-full" />
          </span>
        )}
      </header>

      <main className="mx-auto max-w-xl px-4 pt-5">
        <form onSubmit={runSearch}>
          <div className="border-line bg-card flex items-center gap-2.5 rounded-xl border px-3.5 py-3">
            <Search size={17} className="text-ink-3 shrink-0" />
            <input
              value={term}
              onChange={(event) => setTerm(event.target.value)}
              placeholder={m.search_placeholder()}
              aria-label={m.search_input_label()}
              autoFocus
              inputMode="search"
              className="placeholder:text-ink-3 w-full bg-transparent text-base outline-none"
            />
            {term && (
              <button
                type="button"
                onClick={clearTerm}
                aria-label={m.search_clear()}
                className="text-ink-3 shrink-0 p-0.5"
              >
                <X size={18} />
              </button>
            )}
            <button
              type="button"
              onClick={() => setScanning(true)}
              aria-label={m.search_scan()}
              className="text-ink-2 shrink-0 p-0.5"
            >
              <ScanBarcode size={20} />
            </button>
          </div>
          <button
            type="submit"
            disabled={term.trim().length < 3 || asking}
            className="bg-accent mt-3 w-full rounded-xl py-3.5 text-sm font-bold text-white disabled:opacity-40"
          >
            {asking ? m.search_searching() : m.search_submit()}
          </button>
        </form>

        {outcome.kind === 'failed' && <p className="text-danger mt-4 text-sm">{outcome.message}</p>}

        {outcome.kind === 'empty' && (
          <div className="mt-10 text-center">
            <ShelfGap />
            <p className="font-serif mt-6 mb-1.5 text-lg font-semibold">
              {m.search_empty_title()}
            </p>
            <p className="text-ink-2 mx-auto mb-5 max-w-[34ch] text-sm leading-relaxed">
              {m.search_empty_body()}
            </p>
            {outcome.oneSourceQuiet && (
              <p className="text-ink-3 mx-auto mb-5 max-w-[34ch] text-xs leading-relaxed">
                {m.search_empty_one_quiet()}
              </p>
            )}
            <button
              type="button"
              onClick={() => openForm(undefined, term)}
              className="bg-accent w-full rounded-xl py-3.5 text-sm font-bold text-white"
            >
              {m.search_manual_entry()}
            </button>
          </div>
        )}

        {listed && (
          <>
            <ul className="mt-6">
              {listed.results.slice(0, visible).map((candidate, index) => (
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

            {visible < listed.results.length && (
              <button
                type="button"
                onClick={() => setVisible((current) => current + PAGE_SIZE)}
                className="border-line text-ink-2 mt-5 w-full rounded-xl border py-3 text-sm font-semibold"
              >
                {m.search_load_more({ count: listed.results.length - visible })}
              </button>
            )}

            {outcome.kind === 'results' &&
              visible >= listed.results.length &&
              listed.moreAvailable && (
                <p className="text-ink-3 mt-5 text-center text-xs leading-relaxed">
                  {m.search_more_available()}
                </p>
              )}

            <div className="border-line mt-6 border-t pt-5 text-center">
              <p className="text-ink-2 mb-3 text-sm">{m.search_none_fits()}</p>
              <button
                type="button"
                onClick={() => openForm(undefined, term)}
                className="border-line text-ink-2 rounded-xl border px-5 py-2.5 text-sm font-semibold"
              >
                {m.search_manual_entry()}
              </button>
            </div>
          </>
        )}

        {offersManualEntry && (
          <>
            <div className="text-ink-3 my-7 flex items-center gap-3 text-xs">
              <span className="bg-line h-px flex-1" />
              {m.search_or()}
              <span className="bg-line h-px flex-1" />
            </div>
            <button
              type="button"
              onClick={() => openForm(undefined, term)}
              className="border-line text-ink-2 w-full rounded-xl border py-3.5 text-sm font-semibold"
            >
              {m.search_manual_entry()}
            </button>
          </>
        )}
      </main>
    </div>
  )
}
