import { useState, useCallback } from "react";
import { CreditCard, CheckCircle, Loader2 } from "lucide-react";
import { finanzasService } from "../api";
import { useToast } from "../context/ToastContext";
import Badge from "../components/ui/Badge";

const INITIAL_HISTORIAL = [
  { id: 1, unidadId: "101", monto: 320000, metodo: "Transferencia", referencia: "TRF-2025-0221", fecha: "22 Feb 2025", estado: "Registrado" },
  { id: 2, unidadId: "205", monto: 280000, metodo: "Efectivo",       referencia: "EFE-2025-0221", fecha: "21 Feb 2025", estado: "Registrado" },
  { id: 3, unidadId: "312", monto: 350000, metodo: "Transferencia", referencia: "TRF-2025-0220", fecha: "20 Feb 2025", estado: "Registrado" },
];

const metodoBadge = (m) => {
  if (m === "Transferencia") return "blue";
  if (m === "PSE")           return "purple";
  return "yellow";
};

const PagosPage = () => {
  const { showToast } = useToast();

  const [form, setForm] = useState({ unidadId: "", monto: "", metodo: "transferencia", referencia: "" });
  const [loading,   setLoading]   = useState(false);
  const [historial, setHistorial] = useState(INITIAL_HISTORIAL);

  const set = (field) => (e) => setForm((f) => ({ ...f, [field]: e.target.value }));

  const handleSubmit = useCallback(
    async (e) => {
      e.preventDefault();
      setLoading(true);
      try {
        const payload = { ...form, monto: Number(form.monto) };
        const res = await finanzasService.registrarPago(payload);

        if (res?.ok) {
          const nuevo = {
            id:         historial.length + 1,
            unidadId:   form.unidadId,
            monto:      Number(form.monto),
            metodo:     form.metodo === "transferencia" ? "Transferencia"
                      : form.metodo === "pse"           ? "PSE"
                      : form.metodo === "cheque"        ? "Cheque"
                      : "Efectivo",
            referencia: form.referencia || `AUTO-${Date.now()}`,
            fecha:      "Hoy",
            estado:     "Registrado",
          };
          setHistorial((h) => [nuevo, ...h]);
          showToast(res.message || "Pago registrado exitosamente", "success");
          setForm({ unidadId: "", monto: "", metodo: "transferencia", referencia: "" });
        }
      } catch (err) {
        showToast(err.message, "error");
      } finally {
        setLoading(false);
      }
    },
    [form, historial.length, showToast]
  );

  return (
    <div className="fade-in-up">
      <div style={{ marginBottom: 24 }}>
        <h2 style={{ fontSize: 20, fontWeight: 700, color: "#0f172a" }}>Registro de Pagos / Recaudos</h2>
        <p style={{ fontSize: 14, color: "#94a3b8", marginTop: 4 }}>
          Registra los pagos de administración recibidos de cada unidad
        </p>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "360px 1fr", gap: 24 }}>
        {/* ── Form ──────────────────────────────────────────────────────────── */}
        <div className="card">
          {/* Card header */}
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 24, paddingBottom: 20, borderBottom: "1px solid #f1f5f9" }}>
            <div style={{ width: 36, height: 36, background: "#ecfdf5", borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center" }}>
              <CreditCard size={18} color="#059669" />
            </div>
            <div>
              <h3 style={{ fontSize: 15, fontWeight: 700, color: "#0f172a" }}>Nuevo Pago</h3>
              <p style={{ fontSize: 12, color: "#94a3b8" }}>Completa todos los campos</p>
            </div>
          </div>

          <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            {/* Unidad ID */}
            <div className="form-field">
              <label className="form-label" htmlFor="unidadId">ID de Unidad</label>
              <input
                id="unidadId"
                className="form-input"
                type="text"
                value={form.unidadId}
                onChange={set("unidadId")}
                placeholder="Ej: 101, 205, P01..."
                required
              />
            </div>

            {/* Monto */}
            <div className="form-field">
              <label className="form-label" htmlFor="monto">Monto ($)</label>
              <input
                id="monto"
                className="form-input"
                type="number"
                value={form.monto}
                onChange={set("monto")}
                placeholder="280000"
                min={1}
                step={1000}
                required
              />
              {form.monto && (
                <span className="form-hint">
                  = ${Number(form.monto).toLocaleString("es-CO")}
                </span>
              )}
            </div>

            {/* Método */}
            <div className="form-field">
              <label className="form-label" htmlFor="metodo">Método de pago</label>
              <select id="metodo" className="form-select" value={form.metodo} onChange={set("metodo")}>
                <option value="efectivo">Efectivo</option>
                <option value="transferencia">Transferencia Bancaria</option>
                <option value="pse">PSE</option>
                <option value="cheque">Cheque</option>
              </select>
            </div>

            {/* Referencia */}
            <div className="form-field">
              <label className="form-label" htmlFor="referencia">Referencia / Comprobante</label>
              <input
                id="referencia"
                className="form-input"
                type="text"
                value={form.referencia}
                onChange={set("referencia")}
                placeholder="TRF-2025-XXXX"
              />
              <span className="form-hint">Opcional — se genera automáticamente si queda vacío</span>
            </div>

            <button
              className="btn-success"
              type="submit"
              disabled={loading}
              style={{ width: "100%", padding: "13px", marginTop: 4 }}
            >
              {loading
                ? <><Loader2 size={17} className="spinner" /> Registrando...</>
                : <><CheckCircle size={16} /> Registrar Pago</>
              }
            </button>
          </form>
        </div>

        {/* ── Historial ─────────────────────────────────────────────────────── */}
        <div className="card">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
            <div>
              <h3 style={{ fontSize: 15, fontWeight: 700, color: "#0f172a" }}>Historial de Pagos</h3>
              <p style={{ fontSize: 12, color: "#94a3b8", marginTop: 2 }}>
                {historial.length} registros encontrados
              </p>
            </div>
            <Badge variant="green">{historial.length} pagos</Badge>
          </div>

          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ borderBottom: "2px solid #f1f5f9" }}>
                  {["Unidad", "Monto", "Método", "Referencia", "Fecha", "Estado"].map((h) => (
                    <th key={h} className="th">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {historial.map((p) => (
                  <tr key={p.id} className="table-row" style={{ borderBottom: "1px solid #f8fafc" }}>
                    <td className="td">
                      <span style={{ fontFamily: "DM Mono, monospace", fontSize: 13, fontWeight: 700, color: "#1d4ed8", background: "#eff6ff", padding: "2px 8px", borderRadius: 6 }}>
                        #{p.unidadId}
                      </span>
                    </td>
                    <td className="td" style={{ fontFamily: "DM Mono, monospace", fontWeight: 700, color: "#059669" }}>
                      ${p.monto.toLocaleString("es-CO")}
                    </td>
                    <td className="td">
                      <Badge variant={metodoBadge(p.metodo)}>{p.metodo}</Badge>
                    </td>
                    <td className="td" style={{ fontSize: 12, color: "#94a3b8", fontFamily: "DM Mono, monospace" }}>
                      {p.referencia}
                    </td>
                    <td className="td" style={{ fontSize: 13, color: "#64748b" }}>{p.fecha}</td>
                    <td className="td">
                      <Badge variant="green">{p.estado}</Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PagosPage;
