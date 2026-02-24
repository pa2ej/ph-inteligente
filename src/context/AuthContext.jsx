import { createContext, useContext, useState, useCallback } from "react";
import { authService } from "../api";

// ─────────────────────────────────────────────────────────────────────────────
const AuthContext = createContext(null);

/**
 * Proveedor de autenticación.
 * Persiste { token, user } en localStorage bajo las claves:
 *   "x-token"  →  JWT
 *   "ph_user"  →  objeto con { id, nombre_completo, cargo, nombre_ph }
 */
export const AuthProvider = ({ children }) => {
  const [token, setToken] = useState(() => localStorage.getItem("x-token") || null);

  const [user, setUser] = useState(() => {
    try {
      const stored = localStorage.getItem("ph_user");
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  });

  /** Llama al backend y guarda la sesión */
  const login = useCallback(async (email, password) => {
    const res = await authService.login({ email, password });
    if (res?.ok) {
      localStorage.setItem("x-token", res.token);
      localStorage.setItem("ph_user", JSON.stringify(res.user));
      setToken(res.token);
      setUser(res.user);
    }
    return res;
  }, []);

  /** Limpia la sesión completamente */
  const logout = useCallback(() => {
    localStorage.removeItem("x-token");
    localStorage.removeItem("ph_user");
    setToken(null);
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isAuth: !!token,
        login,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

/** Hook de acceso rápido al contexto de autenticación */
export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth debe usarse dentro de <AuthProvider>");
  return ctx;
};

export default AuthContext;
