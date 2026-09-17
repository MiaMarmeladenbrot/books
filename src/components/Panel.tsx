import type { ReactNode } from 'react'

interface PanelProps {
  title: string
  extra?: ReactNode
  children: ReactNode
}

export function Panel({ title, extra, children }: PanelProps) {
  return (
    <section className="border-line bg-card mb-3.5 rounded-2xl border px-4 py-4">
      <h2 className="text-ink-3 mb-3.5 flex items-baseline text-xs font-bold tracking-widest uppercase">
        {title}
        {extra ? <span className="ml-auto">{extra}</span> : null}
      </h2>
      {children}
    </section>
  )
}
