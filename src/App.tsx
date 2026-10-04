import { BrowserRouter, Route, Routes } from 'react-router-dom'
import { AuthProvider } from './auth/AuthProvider'
import { RequireAuth } from './auth/RequireAuth'
import { AppLayout } from './components/AppLayout'
import { ArticlePage } from './pages/ArticlePage'
import { ArticlesPage } from './pages/ArticlesPage'
import { AssistantPage } from './pages/AssistantPage'
import { LoginPage } from './pages/LoginPage'
import { NotFoundPage } from './pages/NotFoundPage'

/** Rutas de la app (sin router ni proveedor, para poder probarlas con un MemoryRouter). */
export function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route element={<RequireAuth />}>
        <Route element={<AppLayout />}>
          <Route index element={<AssistantPage />} />
          <Route path="articulos" element={<ArticlesPage />} />
          <Route path="articulos/:id" element={<ArticlePage />} />
        </Route>
      </Route>
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  )
}

export function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </BrowserRouter>
  )
}
