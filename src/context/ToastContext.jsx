import { createContext, useContext, useState, useCallback } from "react";

const ToastContext = createContext(null);

/**
 * Proveedor de notificaciones (toasts).
 * Uso:
 *   const { showToast } = useToast();
 *   showToast("Operación exitosa", "success");
 *   showToast("Algo salió mal",    "error");
 *   showToast("Información",       "info");
 */
export const ToastProvider = ({ children }) => {
  const [toast, setToast] = useState(null);

  const showToast = useCallback((message, type = "success") => {
    setToast({ message, type, id: Date.now() });
  }, []);

  const hideToast = useCallback(() => setToast(null), []);

  return (
    <ToastContext.Provider value={{ toast, showToast, hideToast }}>
      {children}
    </ToastContext.Provider>
  );
};

export const useToast = () => {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast debe usarse dentro de <ToastProvider>");
  return ctx;
};

export default ToastContext;
