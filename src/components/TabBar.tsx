import { NavLink, useLocation } from 'react-router-dom'
import { Library, BarChart3 } from 'lucide-react'

const TABS = [
  { to: '/', label: 'Regal', Icon: Library },
  { to: '/statistik', label: 'Statistik', Icon: BarChart3 },
]

function scrollToTop() {
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
  window.scrollTo({ top: 0, behavior: reduced ? 'auto' : 'smooth' })
}

export function TabBar() {
  const { pathname, search } = useLocation()

  return (
    <nav className="border-line fixed inset-x-0 bottom-0 z-20 grid grid-cols-2 border-t bg-paper/95 pt-2 pb-[max(1.25rem,env(safe-area-inset-bottom))] backdrop-blur">
      {TABS.map(({ to, label, Icon }) => (
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
          <Icon size={21} strokeWidth={1.8} />
          {label}
        </NavLink>
      ))}
    </nav>
  )
}
