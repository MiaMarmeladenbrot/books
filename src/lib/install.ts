type InstallPromptEvent = Event & {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

let waiting: InstallPromptEvent | null = null
const listeners = new Set<() => void>()

function announce() {
  for (const listener of listeners) listener()
}

window.addEventListener('beforeinstallprompt', (event) => {
  event.preventDefault()
  waiting = event as InstallPromptEvent
  announce()
})

window.addEventListener('appinstalled', () => {
  waiting = null
  announce()
})

export function subscribeToInstall(listener: () => void) {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

export function installWaiting() {
  return waiting
}

export async function askToInstall() {
  const event = waiting
  if (!event) return false
  waiting = null
  announce()
  await event.prompt()
  const { outcome } = await event.userChoice
  return outcome === 'accepted'
}

export function alreadyInstalled() {
  if (window.matchMedia('(display-mode: standalone)').matches) return true
  return (navigator as Navigator & { standalone?: boolean }).standalone === true
}

export function onHandheld() {
  return window.matchMedia('(pointer: coarse) and (max-width: 820px)').matches
}

export function usesIosSafari() {
  const agent = navigator.userAgent
  const ios =
    /iPhone|iPad|iPod/.test(agent) || (/Macintosh/.test(agent) && navigator.maxTouchPoints > 1)
  return ios && !/CriOS|FxiOS|EdgiOS|OPiOS/.test(agent)
}
