import { useState, useCallback } from "react";
import { useToast } from "../context/ToastContext";

/**
 * Hook genérico para encapsular llamadas a la API con estados de carga y error.
 *
 * @param {Function} apiFn  Función que devuelve una Promesa (ej: () => finanzasService.generarMensual(data))
 * @param {object}   opts   Opciones: { successMsg, errorMsg, onSuccess, onError }
 *
 * @example
 *   const { execute, loading, error } = useApi(
 *     (data) => finanzasService.generarMensual(data),
 *     { successMsg: "Facturación generada" }
 *   );
 *   await execute({ anio: 2025, mes: 2, valorBaseAdmin: 280000 });
 */
const useApi = (apiFn, opts = {}) => {
  const { showToast } = useToast();
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState(null);
  const [data,    setData]    = useState(null);

  const execute = useCallback(
    async (...args) => {
      setLoading(true);
      setError(null);
      try {
        const result = await apiFn(...args);
        setData(result);

        if (opts.successMsg) {
          showToast(opts.successMsg, "success");
        }
        if (opts.onSuccess) opts.onSuccess(result);

        return result;
      } catch (err) {
        const msg = err?.message || opts.errorMsg || "Ocurrió un error";
        setError(msg);
        showToast(msg, "error");
        if (opts.onError) opts.onError(err);
      } finally {
        setLoading(false);
      }
    },
    [apiFn, opts, showToast]
  );

  return { execute, loading, error, data };
};

export default useApi;
