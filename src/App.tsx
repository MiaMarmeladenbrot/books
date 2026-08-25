import { BrowserRouter, Outlet, Route, Routes } from 'react-router-dom'
import { AuthProvider } from './store/AuthContext'
import { BooksProvider } from './store/BooksContext'
import { useAuth } from './store/useAuth'
import { TabBar } from './components/TabBar'
import { Login } from './pages/Login'
import { Shelf } from './pages/Shelf'
import { Stats } from './pages/Stats'
import { BookDetail } from './pages/BookDetail'
import { BookForm } from './pages/BookForm'
import { BookSearch } from './pages/BookSearch'

function TabLayout() {
  return (
    <>
      <Outlet />
      <TabBar />
    </>
  )
}

function AppRoutes() {
  const { user, loading } = useAuth()

  if (loading) {
    return (
      <div className="flex min-h-dvh items-center justify-center">
        <p className="text-ink-3 text-sm">Moment…</p>
      </div>
    )
  }

  if (!user) return <Login />

  return (
    <BooksProvider>
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
    </BooksProvider>
  )
}

export default function App() {
  return (
    <AuthProvider>
      <AppRoutes />
    </AuthProvider>
  )
}
