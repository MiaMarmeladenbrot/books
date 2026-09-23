import { NavLink, useLocation } from 'react-router-dom'
import { Library, Gem, BarChart3 } from 'lucide-react'
import { Avatar } from './Avatar'
import { useProfile } from '../store/useProfile'
import { m } from '../paraglide/messages.js'

function scrollToTop() {
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
  window.scrollTo({ top: 0, behavior: reduced ? 'auto' : 'smooth' })
}

export function TabBar() {
  const { pathname, search } = useLocation()
  const { profile } = useProfile()

  const tabs = [
    { to: '/', label: m.nav_shelf(), icon: () => <Library size={21} strokeWidth={1.8} /> },
    {
      to: '/empfehlungen',
      label: m.nav_recommendations(),
      icon: () => <Gem size={21} strokeWidth={1.8} />,
    },
    {
      to: '/statistik',
      label: m.nav_stats(),
      icon: () => <BarChart3 size={21} strokeWidth={1.8} />,
    },
    {
      to: '/profil',
      label: m.nav_profile(),
      icon: (active: boolean) => (
        <Avatar
          name={profile?.avatar ?? null}
          size={22}
          className={active ? '' : 'opacity-55 grayscale-[0.35]'}
        />
      ),
    },
  ]

  return (
    <nav className="border-line fixed inset-x-0 bottom-0 z-20 grid grid-cols-4 border-t bg-paper/95 pt-2 pb-[max(1.25rem,env(safe-area-inset-bottom))] backdrop-blur">
      {tabs.map(({ to, label, icon }) => (
        <NavLink
          key={to}
          to={to}
          end={to === '/'}
          onClick={(event) => {
            if (pathname !== to) return
            if (search === '') event.preventDefault()
            scrollToTop()
          }}
          className={({ isActive }) =>
            `flex flex-col items-center gap-1 text-xs font-semibold ${
              isActive ? 'text-accent' : 'text-ink-3'
            }`
          }
        >
          {({ isActive }) => (
            <>
              {icon(isActive)}
              {label}
            </>
          )}
        </NavLink>
      ))}
    </nav>
  )
}
