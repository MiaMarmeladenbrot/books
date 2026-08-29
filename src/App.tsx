import { useEffect, useRef, useState, type ReactNode } from 'react'
import { BrowserRouter, Outlet, Route, Routes } from 'react-router-dom'
import { AuthProvider } from './store/AuthContext'
import { BooksProvider } from './store/BooksContext'
import { useAuth } from './store/useAuth'
import { useBooks } from './store/useBooks'
import { TabBar } from './components/TabBar'
import { StackLoader } from './components/StackLoader'
import { Login } from './pages/Login'
import { Shelf } from './pages/Shelf'
import { Stats } from './pages/Stats'
import { BookDetail } from './pages/BookDetail'
import { BookForm } from './pages/BookForm'
import { BookSearch } from './pages/BookSearch'

const SPLASH_DELAY = 350
const SPLASH_MINIMUM = 600

function useSplash(pending: boolean) {
  const [shown, setShown] = useState(false)
  const shownAt = useRef(0)

  useEffect(() => {
    if (!pending) return
    const timer = setTimeout(() => {
      shownAt.current = Date.now()
      setShown(true)
    }, SPLASH_DELAY)
    return () => clearTimeout(timer)
  }, [pending])

  useEffect(() => {
    if (pending || !shown) return
    const rest = SPLASH_MINIMUM - (Date.now() - shownAt.current)
    if (rest <= 0) {
      setShown(false)
      return
    }
    const timer = setTimeout(() => setShown(false), rest)
    return () => clearTimeout(timer)
  }, [pending, shown])

  return shown
}

function SplashGate({ pending, children }: { pending: boolean; children: ReactNode }) {
  const shown = useSplash(pending)

  if (shown) {
    return (
      <div className="loader-appear flex min-h-dvh flex-col items-center justify-center gap-7">
        <StackLoader />
        <p className="text-ink-3 font-serif text-sm tracking-tight">Lesestapel</p>
      </div>
    )
  }

  if (pending) return null

  return children
}

function TabLayout() {
  return (
    <>
      <Outlet />
      <TabBar />
    </>
  )
}

function Shell() {
  const { loading } = useBooks()

  return (
    <SplashGate pending={loading}>
      <BrowserRouter>
        <Routes>
          <Route element={<TabLayout />}>
            <Route index element={<Shelf />} />
            <Route path="statistik" element={<Stats />} />
          </Route>
          <Route path="buch/suchen" element={<BookSearch />} />
          <Route path="buch/neu" element={<BookForm />} />
          <Route path="buch/:id" element={<BookDetail />} />
          <Route path="buch/:id/bearbeiten" element={<BookForm />} />
        </Routes>
      </BrowserRouter>
    </SplashGate>
  )
}

function AppRoutes() {
  const { user, loading } = useAuth()

  return (
    <SplashGate pending={loading}>
      {user ? (
        <BooksProvider>
          <Shell />
        </BooksProvider>
      ) : (
        <Login />
      )}
    </SplashGate>
  )
}

export default function App() {
  return (
    <AuthProvider>
      <AppRoutes />
    </AuthProvider>
  )
}
