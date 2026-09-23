import { lazy, Suspense, useEffect, useState, type ReactNode } from 'react'
import { BrowserRouter, Outlet, Route, Routes } from 'react-router-dom'
import { AuthProvider } from './store/AuthContext'
import { BooksProvider } from './store/BooksContext'
import { ProfileProvider } from './store/ProfileContext'
import { useAuth } from './store/useAuth'
import { useBooks } from './store/useBooks'
import { useProfile } from './store/useProfile'
import { TabBar } from './components/TabBar'
import { InstallHint } from './components/InstallHint'
import { StackLoader } from './components/StackLoader'
import { ErrorBoundary } from './components/ErrorBoundary'
import { m } from './paraglide/messages.js'
import { Login } from './pages/Login'
import { Shelf } from './pages/Shelf'
import { BookDetail } from './pages/BookDetail'

const Stats = lazy(() => import('./pages/Stats').then((module) => ({ default: module.Stats })))
const BookForm = lazy(() =>
  import('./pages/BookForm').then((module) => ({ default: module.BookForm })),
)
const BookSearch = lazy(() =>
  import('./pages/BookSearch').then((module) => ({ default: module.BookSearch })),
)
const Profile = lazy(() =>
  import('./pages/Profile').then((module) => ({ default: module.Profile })),
)
const NewPassword = lazy(() =>
  import('./pages/NewPassword').then((module) => ({ default: module.NewPassword })),
)

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
      <InstallHint />
      <Outlet />
      <TabBar />
    </>
  )
}

function Turning() {
  return <p className="text-ink-3 px-4 py-20 text-center text-sm">{m.app_loading()}</p>
}

function Shell() {
  return (
    <BrowserRouter>
      <Suspense fallback={<Turning />}>
        <Routes>
          <Route element={<TabLayout />}>
            <Route index element={<Shelf />} />
            <Route path="statistik" element={<Stats />} />
            <Route path="profil" element={<Profile />} />
          </Route>
          <Route path="buch/suchen" element={<BookSearch />} />
          <Route path="buch/neu" element={<BookForm />} />
          <Route path="buch/:id" element={<BookDetail />} />
          <Route path="buch/:id/bearbeiten" element={<BookForm />} />
        </Routes>
      </Suspense>
    </BrowserRouter>
  )
}

function Screen() {
  const { user, recovering } = useAuth()

  if (!user) return <Login />
  if (recovering) return <NewPassword />
  return <Shell />
}

function AppRoutes() {
  const { user, loading: signingIn, recovering } = useAuth()
  const { loading: fetchingBooks } = useBooks()
  const { loading: fetchingProfile } = useProfile()
  const waiting = Boolean(user) && !recovering && (fetchingBooks || fetchingProfile)

  return (
    <SplashGate pending={signingIn || waiting}>
      <Suspense fallback={<Turning />}>
        <Screen />
      </Suspense>
    </SplashGate>
  )
}

export default function App() {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <BooksProvider>
          <ProfileProvider>
            <AppRoutes />
          </ProfileProvider>
        </BooksProvider>
      </AuthProvider>
    </ErrorBoundary>
  )
}
