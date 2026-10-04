import { BrowserRouter, Route, Routes } from 'react-router-dom'
import { AuthProvider } from './auth/AuthProvider'
import { RequireAuth } from './auth/RequireAuth'
import { RequireRole } from './auth/RequireRole'
import { AppLayout } from './components/AppLayout'
import { ArticlePage } from './pages/ArticlePage'
import { EditArticlePage, NewArticlePage } from './pages/ArticleEditorPages'
import { ArticlesPage } from './pages/ArticlesPage'
import { AssistantPage } from './pages/AssistantPage'
import { LoginPage } from './pages/LoginPage'
import { NotFoundPage } from './pages/NotFoundPage'
import { UnansweredPage } from './pages/UnansweredPage'

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

          {/* Solo editor. Ocultar la ruta es comodidad: la seguridad real la aplica la base de datos (RLS). */}
          <Route element={<RequireRole role="editor" />}>
            <Route path="articulos/nuevo" element={<NewArticlePage />} />
            <Route path="articulos/:id/editar" element={<EditArticlePage />} />
            <Route path="preguntas" element={<UnansweredPage />} />
          </Route>
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
