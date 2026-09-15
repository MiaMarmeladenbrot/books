import { Component, type ErrorInfo, type ReactNode } from 'react'

interface Props {
  children: ReactNode
}

interface State {
  broken: boolean
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { broken: false }

  static getDerivedStateFromError(): State {
    return { broken: true }
  }

  componentDidCatch(caught: Error, info: ErrorInfo) {
    console.error(caught, info.componentStack)
  }

  render() {
    if (!this.state.broken) return this.props.children

    return (
      <div className="flex min-h-dvh flex-col items-center justify-center px-8 text-center">
        <p className="font-serif mb-2 text-base font-semibold">Da ist etwas steckengeblieben</p>
        <p className="text-ink-2 mb-6 max-w-[34ch] text-sm leading-relaxed">
          Deine Bücher sind sicher — die liegen bei Supabase, nicht hier. Ein Neuladen räumt die
          Seite auf.
        </p>
        <button
          type="button"
          onClick={() => window.location.reload()}
          className="bg-accent w-full max-w-xs rounded-xl py-3.5 text-sm font-bold text-white"
        >
          Neu laden
        </button>
      </div>
    )
  }
}
