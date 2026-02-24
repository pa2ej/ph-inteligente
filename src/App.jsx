import { Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider }      from "./context/AuthContext";
import { ToastProvider }     from "./context/ToastContext";
import PrivateRoute          from "./router/PrivateRoute";
import DashboardLayout       from "./components/layout/DashboardLayout";
import LoginPage             from "./pages/LoginPage";
import DashboardPage         from "./pages/DashboardPage";
import UnidadesPage          from "./pages/UnidadesPage";
import FacturacionPage       from "./pages/FacturacionPage";
import PagosPage             from "./pages/PagosPage";
import NotFoundPage          from "./pages/NotFoundPage";

/**
 * Árbol de rutas de la aplicación:
 *
 *  /                   → redirige a /dashboard
 *  /login              → LoginPage (pública)
 *  /dashboard          → DashboardPage   ┐
 *  /unidades           → UnidadesPage    │ protegidas con PrivateRoute
 *  /facturacion        → FacturacionPage │ dentro de DashboardLayout
 *  /pagos              → PagosPage       ┘
 *  *                   → NotFoundPage
 */
const App = () => (
  <AuthProvider>
    <ToastProvider>
      <Routes>
        {/* Raíz → Dashboard */}
        <Route path="/" element={<Navigate to="/dashboard" replace />} />

        {/* Pública */}
        <Route path="/login" element={<LoginPage />} />

        {/* Protegidas: todas anidadas bajo DashboardLayout */}
        <Route element={<PrivateRoute />}>
          <Route element={<DashboardLayout />}>
            <Route path="/dashboard"   element={<DashboardPage />} />
            <Route path="/unidades"    element={<UnidadesPage />} />
            <Route path="/facturacion" element={<FacturacionPage />} />
            <Route path="/pagos"       element={<PagosPage />} />
          </Route>
        </Route>

        {/* 404 */}
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </ToastProvider>
  </AuthProvider>
);

export default App;
