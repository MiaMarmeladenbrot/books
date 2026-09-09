import { useEffect, useState, type ReactNode } from 'react'
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

const SPLASH_MINIMUM = 900

function useSplash(pending: boolean) {
  const [settled, setSettled] = useState(false)

  useEffect(() => {
    const timer = setTimeout(() => setSettled(true), SPLASH_MINIMUM)
    return () => clearTimeout(timer)
  }, [])

  return pending || !settled
}

function SplashGate({ pending, children }: { pending: boolean; children: ReactNode }) {
  const shown = useSplash(pending)

  if (!shown) return children

  return (
    <div className="loader-appear flex min-h-dvh flex-col items-center justify-center gap-7">
      <StackLoader />
      <p className="text-ink-3 font-serif text-sm tracking-tight">Lesestapel</p>
    </div>
  )
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
  return (
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
  )
}

function AppRoutes() {
  const { user, loading: signingIn } = useAuth()
  const { loading: fetchingBooks } = useBooks()

  return (
    <SplashGate pending={signingIn || (Boolean(user) && fetchingBooks)}>
      {user ? <Shell /> : <Login />}
    </SplashGate>
  )
}

export default function App() {
  return (
    <AuthProvider>
      <BooksProvider>
        <AppRoutes />
      </BooksProvider>
    </AuthProvider>
  )
}
