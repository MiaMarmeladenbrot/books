import { useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ChevronLeft, Gem } from 'lucide-react'
import { Avatar } from '../components/Avatar'
import { Blurb } from '../components/Blurb'
import { Cover } from '../components/Cover'
import { TakeButton } from '../components/TakeButton'
import { useCatalogue, type Catalogue } from '../lib/catalogue'
import { coverSources } from '../lib/cover'
import { useAuth } from '../store/useAuth'
import { useRecommendations } from '../store/useRecommendations'
import { formatDay } from '../utils/format'

function factsLine(entry: Catalogue | null) {
  if (!entry) return null
  const parts = [entry.pages ? `${entry.pages} Seiten` : null, entry.year ? String(entry.year) : null]
  return parts.filter(Boolean).join(' · ') || null
}

function seriesLine(entry: Catalogue | null) {
  if (!entry?.series || entry.volume === null) return null
  return `Band ${entry.volume} von »${entry.series}«`
}

export function RecommendationDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const userId = useAuth().user?.id ?? null
  const { feed, loadingFeed, loadFeed } = useRecommendations()

  useEffect(() => {
    void loadFeed()
  }, [loadFeed])

  const entry = feed?.find((one) => one.id === id) ?? null
  const catalogue = useCatalogue(entry?.isbn ?? null, null)
  const facts = factsLine(catalogue.entry)
  const series = seriesLine(catalogue.entry)

  return (
    <div className="pb-16">
      <header className="border-line sticky top-0 z-10 flex items-center gap-3 border-b bg-paper/95 px-4 py-3 backdrop-blur">
        <button type="button" onClick={() => navigate(-1)} aria-label="Zurück">
          <ChevronLeft size={24} className="text-ink-3" />
        </button>
        <h1 className="font-serif text-xl font-semibold tracking-tight">Empfehlung</h1>
      </header>

      {entry === null ? (
        <p className="text-ink-2 px-4 py-20 text-center text-sm">
          {feed === null && loadingFeed ? 'Lädt…' : 'Diese Empfehlung gibt es nicht mehr.'}
        </p>
      ) : (
        <main className="mx-auto max-w-xl px-4 pt-5">
          <div className="flex gap-4 sm:gap-6">
            <div className="w-29 shrink-0 sm:w-44">
              <Cover title={entry.title} authors={entry.authors} src={coverSources(entry.isbn)} />
            </div>
            <div className="flex min-w-0 grow flex-col">
              <span className="bg-gold-soft text-gold-ink text-2xs mb-2 inline-flex w-fit items-center gap-1.5 rounded-full px-2.5 py-1 font-bold tracking-wider uppercase">
                <Gem size={12} strokeWidth={2.5} />
                Empfehlung
              </span>
              <h2 className="font-serif text-xl leading-tight font-semibold tracking-tight text-balance">
                {entry.title}
              </h2>
              {entry.authors.length > 0 && (
                <p className="text-ink-2 mt-1 text-sm">{entry.authors.join(', ')}</p>
              )}
              {(catalogue.asking || facts || series) && (
                <p className="text-ink-3 mt-1.5 min-h-4 text-xs leading-relaxed">
                  {facts}
                  {facts && series && <br />}
                  {series && <span className="text-ink-2 font-semibold">{series}</span>}
                </p>
              )}

              <div className="mt-auto">
                <TakeButton entry={entry} />
              </div>
            </div>
          </div>

          <div className="mt-7 text-center">
            <span className="font-serif text-gold block text-[2.6rem] leading-[0.6]" aria-hidden>
              „
            </span>
            <p className="font-serif mt-3.5 text-base leading-relaxed whitespace-pre-line italic">
              {entry.note}
            </p>
            <div className="text-ink-2 mt-4 flex items-center justify-center gap-2 text-sm">
              <Avatar name={entry.profiles?.avatar ?? null} size={22} className="shrink-0" />
              <b className="text-ink font-semibold">
                {entry.user_id === userId ? 'Du' : (entry.profiles?.display_name ?? 'Ohne Namen')}
              </b>
              <span className="text-ink-3 text-xs">
                · {formatDay(entry.created_at.slice(0, 10))}
              </span>
            </div>
          </div>

          <div className="border-line mt-6 border-t" />

          <Blurb text={catalogue.entry?.text ?? null} asking={catalogue.asking} />
        </main>
      )}
    </div>
  )
}
