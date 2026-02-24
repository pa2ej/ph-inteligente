import { useState, useCallback } from "react";
import { FileText, Calendar, Hash, Settings, CheckCircle, Loader2 } from "lucide-react";
import { finanzasService } from "../api";
import { useToast } from "../context/ToastContext";
import Badge from "../components/ui/Badge";

const MESES = [
  "Enero","Febrero","Marzo","Abril","Mayo","Junio",
  "Julio","Agosto","Septiembre","Octubre","Noviembre","Diciembre",
];
const ANOS = [2023, 2024, 2025];

const FacturacionPage = () => {
  const { showToast } = useToast();

  const [form, setForm] = useState({
    anio:           new Date().getFullYear(),
    mes:            new Date().getMonth() + 1,
    valorBaseAdmin: 280000,
    metodo:         "fijo",
  });

  const [loading, setLoading] = useState(false);
  const [result,  setResult]  = useState(null);

  const set = (field) => (e) =>
    setForm((f) => ({ ...f, [field]: field === "valorBaseAdmin" ? +e.target.value : e.target.value }));

  const totalEstimado =
    form.metodo === "fijo"
      ? form.valorBaseAdmin * 48
      : form.valorBaseAdmin * 100; // simplificado

  const handleSubmit = useCallback(
    async (e) => {
      e.preventDefault();
      setLoading(true);
      setResult(null);
      try {
        const res = await finanzasService.generarMensual({ ...form, totalUnidades: 48 });
        if (res?.ok) {
          setResult(res.message || "Facturación generada exitosamente");
          showToast(res.message || "Facturación generada", "success");
        }
      } catch (err) {
        showToast(err.message, "error");
      } finally {
        setLoading(false);
      }
    },
    [form, showToast]
  );

  return (
    <div className="fade-in-up">
      <div style={{ marginBottom: 24 }}>
        <h2 style={{ fontSize: 20, fontWeight: 700, color: "#0f172a" }}>Facturación Masiva</h2>
        <p style={{ fontSize: 14, color: "#94a3b8", marginTop: 4 }}>
          Genera la facturación mensual para todas las unidades activas
        </p>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24 }}>
        {/* ── Form ──────────────────────────────────────────────────────────── */}
        <div className="card">
          {/* Card header */}
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 24, paddingBottom: 20, borderBottom: "1px solid #f1f5f9" }}>
            <div style={{ width: 36, height: 36, background: "#eff6ff", borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center" }}>
              <FileText size={18} color="#3b82f6" />
            </div>
            <div>
              <h3 style={{ fontSize: 15, fontWeight: 700, color: "#0f172a" }}>Parámetros de Facturación</h3>
              <p style={{ fontSize: 12, color: "#94a3b8" }}>Define los parámetros para generar las facturas</p>
            </div>
          </div>

          <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 18 }}>
            {/* Año & Mes */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
              <div className="form-field">
                <label className="form-label" htmlFor="anio">
                  <Calendar size={12} /> Año
                </label>
                <select id="anio" className="form-select" value={form.anio} onChange={set("anio")}>
                  {ANOS.map((y) => <option key={y} value={y}>{y}</option>)}
                </select>
              </div>
              <div className="form-field">
                <label className="form-label" htmlFor="mes">
                  <Calendar size={12} /> Mes
                </label>
                <select id="mes" className="form-select" value={form.mes} onChange={set("mes")}>
                  {MESES.map((m, i) => <option key={i + 1} value={i + 1}>{m}</option>)}
                </select>
              </div>
            </div>

            {/* Valor base */}
            <div className="form-field">
              <label className="form-label" htmlFor="valorBase">
                <Hash size={12} /> Valor Base Administración ($)
              </label>
              <input
                id="valorBase"
                className="form-input"
                type="number"
                value={form.valorBaseAdmin}
                onChange={set("valorBaseAdmin")}
                min={0}
                step={1000}
                required
              />
              <span className="form-hint">
                Formateado: ${Number(form.valorBaseAdmin).toLocaleString("es-CO")}
              </span>
            </div>

            {/* Método */}
            <div className="form-field">
              <label className="form-label" htmlFor="metodo">
                <Settings size={12} /> Método de cálculo
              </label>
              <select id="metodo" className="form-select" value={form.metodo} onChange={set("metodo")}>
                <option value="fijo">Fijo — mismo valor para todas las unidades</option>
                <option value="coeficiente">Coeficiente — proporcional al coeficiente</option>
              </select>
            </div>

            {/* Coeficiente hint */}
            {form.metodo === "coeficiente" && (
              <div style={{ background: "#f0f9ff", border: "1px solid #bae6fd", borderRadius: 10, padding: 14 }}>
                <p style={{ fontSize: 13, color: "#0369a1", fontWeight: 500 }}>
                  💡 Ejemplo: unidad con coeficiente 2.45% pagará $
                  {Math.round(form.valorBaseAdmin * 0.0245 * 100).toLocaleString("es-CO")}
                </p>
              </div>
            )}

            <button
              className="btn-success"
              type="submit"
              disabled={loading}
              style={{ width: "100%", padding: "13px", marginTop: 4 }}
            >
              {loading
                ? <><Loader2 size={17} className="spinner" /> Generando facturas...</>
                : <><FileText size={16} /> Generar Facturación Masiva</>
              }
            </button>
          </form>
        </div>

        {/* ── Preview ───────────────────────────────────────────────────────── */}
        <div className="card">
          <h3 style={{ fontSize: 15, fontWeight: 700, color: "#0f172a", marginBottom: 20 }}>
            Vista previa del período
          </h3>

          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {[
              { label: "Período",           value: `${MESES[form.mes - 1]} ${form.anio}` },
              { label: "Unidades a facturar", value: "48" },
            ].map(({ label, value }) => (
              <div key={label} style={{ background: "#f8fafc", borderRadius: 10, padding: "14px 16px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ fontSize: 13, color: "#64748b" }}>{label}</span>
                <span style={{ fontSize: 14, fontWeight: 600, color: "#0f172a" }}>{value}</span>
              </div>
            ))}

            <div style={{ background: "#f8fafc", borderRadius: 10, padding: "14px 16px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ fontSize: 13, color: "#64748b" }}>Valor base</span>
              <span style={{ fontSize: 14, fontWeight: 700, color: "#059669", fontFamily: "DM Mono, monospace" }}>
                ${Number(form.valorBaseAdmin).toLocaleString("es-CO")}
              </span>
            </div>

            <div style={{ background: "#f8fafc", borderRadius: 10, padding: "14px 16px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ fontSize: 13, color: "#64748b" }}>Método</span>
              <Badge variant={form.metodo === "fijo" ? "blue" : "green"}>
                {form.metodo === "fijo" ? "Fijo" : "Coeficiente"}
              </Badge>
            </div>

            {/* Total */}
            <div style={{ background: "#ecfdf5", borderRadius: 10, padding: "16px", display: "flex", justifyContent: "space-between", alignItems: "center", border: "1px solid #6ee7b7" }}>
              <span style={{ fontSize: 14, color: "#065f46", fontWeight: 700 }}>Total estimado</span>
              <span style={{ fontSize: 18, fontWeight: 800, color: "#059669", fontFamily: "DM Mono, monospace" }}>
                ${totalEstimado.toLocaleString("es-CO")}
              </span>
            </div>
          </div>

          {/* Success result */}
          {result && (
            <div style={{ marginTop: 20, background: "#ecfdf5", border: "1px solid #6ee7b7", borderRadius: 12, padding: 16, display: "flex", alignItems: "flex-start", gap: 12 }}>
              <CheckCircle size={20} color="#059669" style={{ flexShrink: 0, marginTop: 1 }} />
              <div>
                <p style={{ fontSize: 13, fontWeight: 700, color: "#065f46" }}>
                  ¡Facturación generada exitosamente!
                </p>
                <p style={{ fontSize: 12, color: "#6b7280", marginTop: 4 }}>{result}</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default FacturacionPage;
