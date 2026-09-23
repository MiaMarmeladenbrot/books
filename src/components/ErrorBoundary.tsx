import { Component, type ErrorInfo, type ReactNode } from 'react'
import { m } from '../paraglide/messages.js'

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
        <p className="font-serif mb-2 text-base font-semibold">{m.crash_title()}</p>
        <p className="text-ink-2 mb-6 max-w-[34ch] text-sm leading-relaxed">{m.crash_body()}</p>
        <button
          type="button"
          onClick={() => window.location.reload()}
          className="bg-accent w-full max-w-xs rounded-xl py-3.5 text-sm font-bold text-white"
        >
          {m.crash_reload()}
        </button>
      </div>
    )
  }
}
