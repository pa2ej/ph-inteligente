import { TrendingUp, Home, DollarSign, Users, ArrowUpRight, Clock } from "lucide-react";
import Badge from "../components/ui/Badge";

const STATS = [
  { label: "Unidades Totales", value: "48",     icon: Home,       color: "#3b82f6", bg: "#eff6ff",  change: "+2 este mes" },
  { label: "Recaudado Mes",    value: "$12.4M",  icon: TrendingUp, color: "#059669", bg: "#ecfdf5",  change: "+8% vs anterior" },
  { label: "Pendiente Cobro",  value: "$2.1M",   icon: DollarSign, color: "#d97706", bg: "#fffbeb",  change: "5 unidades en mora" },
  { label: "Propietarios",     value: "44",      icon: Users,      color: "#8b5cf6", bg: "#f5f3ff",  change: "4 en arrendamiento" },
];

const RECENT_PAYMENTS = [
  { id: 1, unidad: "101", propietario: "Ana García",   monto: 320000, fecha: "22 Feb", metodo: "Transferencia", estado: "Pagado" },
  { id: 2, unidad: "205", propietario: "Luis Torres",  monto: 280000, fecha: "21 Feb", metodo: "Efectivo",       estado: "Pagado" },
  { id: 3, unidad: "312", propietario: "María López",  monto: 350000, fecha: "20 Feb", metodo: "Transferencia", estado: "Pagado" },
  { id: 4, unidad: "408", propietario: "Pedro Soto",   monto: 295000, fecha: "18 Feb", metodo: "Transferencia", estado: "Pendiente" },
  { id: 5, unidad: "502", propietario: "Carmen Ruiz",  monto: 310000, fecha: "15 Feb", metodo: "Efectivo",       estado: "Mora" },
];

const estadoBadge = (e) => {
  if (e === "Pagado")   return "green";
  if (e === "Pendiente") return "yellow";
  return "red";
};

const DashboardPage = () => (
  <div className="fade-in-up">
    {/* Banner */}
    <div style={{
      background: "linear-gradient(135deg, #1e3a5f 0%, #1e293b 100%)",
      borderRadius: 16, padding: "24px 28px", marginBottom: 24,
      position: "relative", overflow: "hidden",
    }}>
      <div style={{ position: "absolute", right: -20, top: -20, width: 180, height: 180, borderRadius: "50%", background: "rgba(59,130,246,0.08)", pointerEvents: "none" }} />
      <p style={{ color: "#94a3b8", fontSize: 13, marginBottom: 6 }}>Panel de control — Febrero 2025</p>
      <h2 style={{ color: "white", fontSize: 22, fontWeight: 700, marginBottom: 4 }}>Residencial El Roble</h2>
      <p style={{ color: "#64748b", fontSize: 14 }}>Administración y gestión de copropiedad horizontal</p>
    </div>

    {/* Stat cards */}
    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 16, marginBottom: 24 }}>
      {STATS.map(({ label, value, icon: Icon, color, bg, change }, i) => (
        <div key={i} className="stat-card">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16 }}>
            <div style={{ width: 44, height: 44, background: bg, borderRadius: 12, display: "flex", alignItems: "center", justifyContent: "center" }}>
              <Icon size={20} color={color} />
            </div>
            <ArrowUpRight size={15} color="#94a3b8" />
          </div>
          <div style={{ fontSize: 26, fontWeight: 700, color: "#0f172a", marginBottom: 4 }}>{value}</div>
          <div style={{ fontSize: 13, fontWeight: 500, color: "#64748b", marginBottom: 6 }}>{label}</div>
          <div style={{ fontSize: 12, color, fontWeight: 500 }}>{change}</div>
        </div>
      ))}
    </div>

    {/* Recent payments */}
    <div className="card">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
        <div>
          <h3 style={{ fontSize: 16, fontWeight: 700, color: "#0f172a" }}>Pagos Recientes</h3>
          <p style={{ fontSize: 13, color: "#94a3b8", marginTop: 2 }}>Últimos recaudos registrados</p>
        </div>
        <Badge variant="blue">Febrero 2025</Badge>
      </div>

      <div style={{ overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ borderBottom: "2px solid #f1f5f9" }}>
              {["Unidad", "Propietario", "Monto", "Fecha", "Método", "Estado"].map((h) => (
                <th key={h} className="th">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {RECENT_PAYMENTS.map((p) => (
              <tr key={p.id} className="table-row" style={{ borderBottom: "1px solid #f8fafc" }}>
                <td className="td">
                  <span style={{ fontFamily: "DM Mono, monospace", fontSize: 13, fontWeight: 600, color: "#1d4ed8", background: "#eff6ff", padding: "2px 8px", borderRadius: 6 }}>
                    #{p.unidad}
                  </span>
                </td>
                <td className="td">{p.propietario}</td>
                <td className="td" style={{ fontFamily: "DM Mono, monospace", fontWeight: 600, color: "#059669" }}>
                  ${p.monto.toLocaleString()}
                </td>
                <td className="td" style={{ color: "#94a3b8", fontSize: 13 }}>
                  <Clock size={12} style={{ marginRight: 4, display: "inline", verticalAlign: "middle" }} />
                  {p.fecha}
                </td>
                <td className="td" style={{ color: "#64748b" }}>{p.metodo}</td>
                <td className="td">
                  <Badge variant={estadoBadge(p.estado)}>{p.estado}</Badge>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  </div>
);

export default DashboardPage;
