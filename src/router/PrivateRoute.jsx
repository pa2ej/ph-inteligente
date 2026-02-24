import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

/**
 * Ruta protegida: si no existe token redirige a /login.
 *
 * Uso con rutas anidadas (Outlet):
 *   <Route element={<PrivateRoute />}>
 *     <Route path="/dashboard" element={<DashboardPage />} />
 *   </Route>
 *
 * Uso envolviendo un componente directo:
 *   <Route
 *     path="/dashboard"
 *     element={<PrivateRoute><DashboardPage /></PrivateRoute>}
 *   />
 */
const PrivateRoute = ({ children }) => {
  const { isAuth } = useAuth();

  if (!isAuth) {
    return <Navigate to="/login" replace />;
  }

  // Si recibe children los renderiza; si no, usa Outlet (rutas anidadas)
  return children ?? <Outlet />;
};

export default PrivateRoute;
