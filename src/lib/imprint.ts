const IMPRINT_PREFIXES = [
  'kiwi',
  'goldmann',
  'piper',
  'knaur',
  'heyne',
  'oetinger',
  'leykam',
  'dtv',
  'rowohlt',
  'rororo',
  'ullstein',
  'suhrkamp',
  'reclam',
  'diogenes',
  'btb',
  'blanvalet',
  'penguin',
  'bastei',
  'lübbe',
  'luebbe',
  'carlsen',
  'ravensburger',
  'beltz',
  'hanser',
  'klett',
  'ueberreuter',
  'edition',
]

const IMPRINT_EXACT = ['arena', 'insel', 'fischer', 'aufbau', 'hanser berlin', 'tropen']

const IMPRINT_ANYWHERE = [
  'taschenbuch',
  'taschenbibliothek',
  'allgemeine reihe',
  'paperback',
  'schriftenreihe',
  'werkausgabe',
]

export function looksLikeImprint(lowered: string) {
  if (IMPRINT_EXACT.includes(lowered)) return true
  if (IMPRINT_ANYWHERE.some((word) => lowered.includes(word))) return true
  return IMPRINT_PREFIXES.some((imprint) => {
    if (lowered === imprint) return true
    if (!lowered.startsWith(imprint)) return false
    const next = lowered.charAt(imprint.length)
    return next === '' || !/[a-zäöüß]/.test(next)
  })
}

export function cleanSeries(name: string | null) {
  const trimmed = (name ?? '').replace(/[;,\s]+$/, '').trim()
  if (!trimmed || /^\d+$/.test(trimmed)) return null
  return looksLikeImprint(trimmed.toLowerCase()) ? null : trimmed
}

export const HIGHEST_VOLUME = 30

export function storyVolume(raw: string | null) {
  const match = /(\d{1,4})(?!\d)/.exec(raw ?? '')
  if (!match) return null
  const volume = Number(match[1])
  return volume >= 1 && volume <= HIGHEST_VOLUME ? volume : null
}
