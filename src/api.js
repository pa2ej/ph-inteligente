import axios from "axios";

// ─────────────────────────────────────────────────────────────────────────────
// Instancia base de Axios
// El proxy de Vite (vite.config.js) redirige /api → http://localhost:3000/api
// en desarrollo. En producción usa VITE_API_URL desde .env
// ─────────────────────────────────────────────────────────────────────────────
const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "/api",
  timeout: 15000,
  headers: {
    "Content-Type": "application/json",
  },
});

// ── REQUEST interceptor: inyecta x-token en cada petición ────────────────────
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("x-token");
    if (token) {
      config.headers["x-token"] = token;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// ── RESPONSE interceptor: manejo centralizado de errores ─────────────────────
api.interceptors.response.use(
  // Respuesta exitosa → devolvemos directamente data
  (response) => response.data,

  // Error de red o respuesta HTTP ≥ 400
  (error) => {
    const status = error.response?.status;
    const message = error.response?.data?.msg || error.message;

    if (status === 401) {
      // Token expirado o inválido → limpiar sesión y redirigir
      localStorage.removeItem("x-token");
      localStorage.removeItem("ph_user");
      window.location.replace("/login");
    }

    if (status === 403) {
      console.warn("[API] 403 Forbidden — sin permisos suficientes");
    }

    if (status >= 500) {
      console.error("[API] Error del servidor:", message);
    }

    // Re-lanzamos el error para que cada llamada pueda manejarlo con try/catch
    return Promise.reject(new Error(message || "Error desconocido"));
  }
);

export default api;

// ─── Servicios organizados por dominio ───────────────────────────────────────

/** AUTENTICACIÓN */
export const authService = {
  /**
   * @param {{ email: string, password: string }} credentials
   * @returns {{ ok: boolean, user: object, token: string }}
   */
  login: (credentials) => api.post("/auth/login", credentials),

  /** Verifica si el token guardado sigue siendo válido */
  verify: () => api.get("/auth/verify"),
};

/** FINANZAS */
export const finanzasService = {
  /**
   * Genera facturación masiva mensual
   * @param {{ anio: number, mes: number, valorBaseAdmin: number, metodo: 'fijo'|'coeficiente' }} params
   */
  generarMensual: (params) => api.post("/finanzas/generar-mensual", params),

  /**
   * Registra un pago/recaudo
   * @param {{ unidadId: string, monto: number, metodo: string, referencia: string }} pago
   */
  registrarPago: (pago) => api.post("/finanzas/registrar-pago", pago),

  /** Resumen financiero de un período */
  getResumen: (anio, mes) => api.get(`/finanzas/resumen?anio=${anio}&mes=${mes}`),

  /** Historial de pagos con filtros opcionales */
  getPagos: (params = {}) => api.get("/finanzas/pagos", { params }),
};

/** UNIDADES */
export const unidadesService = {
  getAll:    ()         => api.get("/unidades"),
  getById:   (id)       => api.get(`/unidades/${id}`),
  create:    (data)     => api.post("/unidades", data),
  update:    (id, data) => api.put(`/unidades/${id}`, data),
  delete:    (id)       => api.delete(`/unidades/${id}`),
};

/** PROPIETARIOS */
export const propietariosService = {
  getAll:  ()   => api.get("/propietarios"),
  getById: (id) => api.get(`/propietarios/${id}`),
  create:  (d)  => api.post("/propietarios", d),
  update:  (id, d) => api.put(`/propietarios/${id}`, d),
};
