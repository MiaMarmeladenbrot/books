import type { ReactElement } from 'react'
import { AVATAR_LABEL, AvatarName } from '../types'

const CREAM = '#fffefb'
const GOLD = 'var(--color-gold)'

const DISC: Record<AvatarName, string> = {
  [AvatarName.Cat]: '#b4552f',
  [AvatarName.Mug]: '#17709f',
  [AvatarName.Owl]: '#4a6b4f',
  [AvatarName.Glasses]: '#6b6153',
  [AvatarName.Hedgehog]: '#6a4570',
  [AvatarName.Moon]: '#16233f',
}

function OpenBook() {
  return (
    <>
      <path d="M20 63 C29 59 40 60 47 64 L47 80 C40 76 29 75 20 79 Z" fill={GOLD} />
      <path d="M76 63 C67 59 56 60 49 64 L49 80 C56 76 67 75 76 79 Z" fill={GOLD} />
    </>
  )
}

function Cat({ disc }: { disc: string }) {
  return (
    <>
      <path d="M33 33 L47 29 L36 11 Z" fill={CREAM} />
      <path d="M63 33 L49 29 L60 11 Z" fill={CREAM} />
      <path d="M37.5 27 L44 25.5 L38.5 15.5 Z" fill={disc} />
      <path d="M58.5 27 L52 25.5 L57.5 15.5 Z" fill={disc} />
      <ellipse cx="48" cy="38" rx="17" ry="15" fill={CREAM} />
      <path d="M27 80 C27 58 35 51 48 51 C61 51 69 58 69 80 Z" fill={CREAM} />
      <path
        d="M69 78 C80 78 83 66 76 61"
        stroke={CREAM}
        strokeWidth="5.5"
        fill="none"
        strokeLinecap="round"
      />
      <path
        d="M39 36.5 q4 4 8 0"
        stroke={disc}
        strokeWidth="2.6"
        fill="none"
        strokeLinecap="round"
      />
      <path
        d="M49 36.5 q4 4 8 0"
        stroke={disc}
        strokeWidth="2.6"
        fill="none"
        strokeLinecap="round"
      />
      <path d="M45.5 43 L50.5 43 L48 46.5 Z" fill={disc} />
      <OpenBook />
    </>
  )
}

function Mug({ disc }: { disc: string }) {
  return (
    <>
      <path d="M40 8 q6 6 0 12" stroke={GOLD} strokeWidth="3.2" fill="none" strokeLinecap="round" />
      <path d="M54 6 q6 6 0 12" stroke={GOLD} strokeWidth="3.2" fill="none" strokeLinecap="round" />
      <path
        d="M63 34 q11.5 1 11.5 8 q0 7.5 -11 8.5"
        stroke={CREAM}
        strokeWidth="4.6"
        fill="none"
        strokeLinecap="round"
      />
      <path
        d="M31 26 L63 26 L61 56 C60.5 59.5 58.5 61.5 55.5 61.5 L38.5 61.5 C35.5 61.5 33.5 59.5 33 56 Z"
        fill={CREAM}
      />
      <rect x="18" y="63" width="60" height="13" rx="3.5" fill={CREAM} />
      <rect x="18" y="68" width="60" height="3" fill={disc} opacity="0.4" />
    </>
  )
}

function Owl({ disc }: { disc: string }) {
  return (
    <>
      <path d="M31 30 L28 16 L41 24 Z" fill={CREAM} />
      <path d="M65 30 L68 16 L55 24 Z" fill={CREAM} />
      <path
        d="M48 20 C63 20 73 33 73 50 C73 67 62 79 48 79 C34 79 23 67 23 50 C23 33 33 20 48 20 Z"
        fill={CREAM}
      />
      <circle cx="38.5" cy="42" r="8.5" fill={disc} />
      <circle cx="57.5" cy="42" r="8.5" fill={disc} />
      <circle cx="38.5" cy="42" r="3.4" fill={CREAM} />
      <circle cx="57.5" cy="42" r="3.4" fill={CREAM} />
      <path d="M43.5 50 L52.5 50 L48 57.5 Z" fill={GOLD} />
      <OpenBook />
    </>
  )
}

function Glasses() {
  return (
    <>
      <path d="M15 32 C27 27 40 28 47 33 L47 71 C40 66 27 65 15 70 Z" fill={CREAM} />
      <path d="M81 32 C69 27 56 28 49 33 L49 71 C56 66 69 65 81 70 Z" fill={CREAM} />
      <path
        d="M25 51 C21 52.5 18.5 54 16.5 56"
        stroke="#b4552f"
        strokeWidth="3.4"
        fill="none"
        strokeLinecap="round"
      />
      <path
        d="M71 51 C75 52.5 77.5 54 79.5 56"
        stroke="#b4552f"
        strokeWidth="3.4"
        fill="none"
        strokeLinecap="round"
      />
      <circle cx="35" cy="50" r="10" fill="none" stroke="#b4552f" strokeWidth="3.6" />
      <circle cx="61" cy="50" r="10" fill="none" stroke="#b4552f" strokeWidth="3.6" />
      <path
        d="M45 49 q3 -3 6 0"
        stroke="#b4552f"
        strokeWidth="3.6"
        fill="none"
        strokeLinecap="round"
      />
    </>
  )
}

function Hedgehog({ disc }: { disc: string }) {
  return (
    <>
      <path
        d="M22 52 L15 40 L27 41 L24 26 L35 33 L39 16 L48 29 L57 16 L61 33 L72 26 L69 41 L81 40 L74 52 Z"
        fill={CREAM}
      />
      <ellipse cx="48" cy="54" rx="24" ry="19" fill={CREAM} />
      <circle cx="39" cy="48" r="3" fill={disc} />
      <circle cx="57" cy="48" r="3" fill={disc} />
      <circle cx="48" cy="57" r="3.2" fill={disc} />
      <OpenBook />
    </>
  )
}

function Moon({ disc }: { disc: string }) {
  return (
    <>
      <circle cx="50" cy="28" r="15.5" fill={GOLD} />
      <circle cx="42.5" cy="24" r="13.5" fill={disc} />
      <circle cx="25" cy="22" r="2.4" fill={GOLD} />
      <circle cx="72" cy="35" r="2" fill={GOLD} />
      <circle cx="68" cy="17" r="1.6" fill={GOLD} />
      <path d="M15 55 C27 50 40 51 47 56 L47 81 C40 76 27 75 15 80 Z" fill={CREAM} />
      <path d="M81 55 C69 50 56 51 49 56 L49 81 C56 76 69 75 81 80 Z" fill={CREAM} />
    </>
  )
}

const MOTIF: Record<AvatarName, ({ disc }: { disc: string }) => ReactElement> = {
  [AvatarName.Cat]: Cat,
  [AvatarName.Mug]: Mug,
  [AvatarName.Owl]: Owl,
  [AvatarName.Glasses]: Glasses,
  [AvatarName.Hedgehog]: Hedgehog,
  [AvatarName.Moon]: Moon,
}

export const DEFAULT_AVATAR = AvatarName.Owl

interface AvatarProps {
  name: AvatarName | null
  size?: number
  className?: string
}

export function Avatar({ name, size = 40, className = '' }: AvatarProps) {
  const chosen = name ?? DEFAULT_AVATAR
  const disc = DISC[chosen]
  const Motif = MOTIF[chosen]

  return (
    <svg
      viewBox="0 0 96 96"
      width={size}
      height={size}
      role="img"
      aria-label={AVATAR_LABEL[chosen]()}
      className={className}
    >
      <circle cx="48" cy="48" r="48" fill={disc} />
      <Motif disc={disc} />
    </svg>
  )
}
