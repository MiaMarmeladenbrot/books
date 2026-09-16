import { useState, useSyncExternalStore } from 'react'
import { Share, X } from 'lucide-react'
import {
  alreadyInstalled,
  askToInstall,
  installWaiting,
  onHandheld,
  subscribeToInstall,
  usesIosSafari,
} from '../lib/install'

const PUT_AWAY = 'lesestapel:startbildschirm'

function wasPutAway() {
  try {
    return localStorage.getItem(PUT_AWAY) !== null
  } catch {
    return false
  }
}

function rememberPutAway() {
  try {
    localStorage.setItem(PUT_AWAY, '1')
  } catch {
    return
  }
}

export function InstallHint() {
  const waiting = useSyncExternalStore(subscribeToInstall, installWaiting, () => null)
  const [putAway, setPutAway] = useState(wasPutAway)

  const inReach = onHandheld() && !alreadyInstalled()
  const steps = inReach && usesIosSafari()
  const offer = inReach && Boolean(waiting)

  if (putAway || (!steps && !offer)) return null

  return (
    <div className="border-line bg-accent-soft/70 border-b px-4 py-3">
      <div className="mx-auto flex max-w-5xl items-start gap-3">
        <div className="min-w-0 flex-1">
          <p className="text-ink text-sm leading-relaxed">
            {steps ? (
              <>
                Dein Regal kann als Symbol auf dem Startbildschirm liegen: unten auf{' '}
                <Share size={15} className="inline -translate-y-0.5" aria-label="Teilen" /> tippen,
                dann „Zum Home-Bildschirm“.
              </>
            ) : (
              'Dein Regal kann als Symbol auf dem Startbildschirm liegen, wie eine richtige App.'
            )}
          </p>
          {offer ? (
            <button
              type="button"
              onClick={() => void askToInstall()}
              className="bg-ink text-paper mt-2.5 rounded-xl px-4 py-2 text-sm font-semibold"
            >
              Zum Startbildschirm hinzufügen
            </button>
          ) : null}
        </div>
        <button
          type="button"
          onClick={() => {
            setPutAway(true)
            rememberPutAway()
          }}
          aria-label="Hinweis ausblenden"
          className="text-ink-3 -mt-1 -mr-1.5 shrink-0 p-1.5"
        >
          <X size={16} />
        </button>
      </div>
    </div>
  )
}
