import Badge from "../components/ui/Badge";

const UNIDADES = [
  { id: "101", piso: 1, tipo: "Apartamento", propietario: "Ana García",   coeficiente: "2.45%", estado: "Al día" },
  { id: "102", piso: 1, tipo: "Apartamento", propietario: "Luis Torres",  coeficiente: "2.30%", estado: "Al día" },
  { id: "201", piso: 2, tipo: "Apartamento", propietario: "María López",  coeficiente: "2.45%", estado: "Al día" },
  { id: "205", piso: 2, tipo: "Apartamento", propietario: "Pedro Soto",   coeficiente: "2.50%", estado: "Mora" },
  { id: "301", piso: 3, tipo: "Apartamento", propietario: "Carmen Ruiz",  coeficiente: "2.45%", estado: "Pendiente" },
  { id: "302", piso: 3, tipo: "Apartamento", propietario: "Jorge Mora",   coeficiente: "2.45%", estado: "Al día" },
  { id: "401", piso: 4, tipo: "Penthouse",   propietario: "Sandra Reyes", coeficiente: "3.80%", estado: "Al día" },
  { id: "P01", piso: -1, tipo: "Parqueadero", propietario: "Ana García",  coeficiente: "0.50%", estado: "Al día" },
  { id: "P02", piso: -1, tipo: "Parqueadero", propietario: "Luis Torres", coeficiente: "0.50%", estado: "Al día" },
];

const tipoBadge = (t) => {
  if (t === "Penthouse")   return "purple";
  if (t === "Parqueadero") return "yellow";
  return "blue";
};

const estadoBadge = (e) => {
  if (e === "Al día")   return "green";
  if (e === "Pendiente") return "yellow";
  return "red";
};

const UnidadesPage = () => (
  <div className="fade-in-up">
    {/* Header */}
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 24 }}>
      <div>
        <h2 style={{ fontSize: 20, fontWeight: 700, color: "#0f172a" }}>Unidades</h2>
        <p style={{ fontSize: 14, color: "#94a3b8", marginTop: 4 }}>Inventario de unidades de la copropiedad</p>
      </div>
      <Badge variant="green" style={{ padding: "6px 14px", fontSize: 13 }}>
        {UNIDADES.length} unidades registradas
      </Badge>
    </div>

    {/* Summary chips */}
    <div style={{ display: "flex", gap: 12, marginBottom: 24, flexWrap: "wrap" }}>
      {[
        { label: "Al día",    val: UNIDADES.filter(u => u.estado === "Al día").length,    variant: "green" },
        { label: "Pendiente", val: UNIDADES.filter(u => u.estado === "Pendiente").length, variant: "yellow" },
        { label: "Mora",      val: UNIDADES.filter(u => u.estado === "Mora").length,      variant: "red" },
      ].map(({ label, val, variant }) => (
        <div key={label} style={{ background: "white", border: "1px solid #e2e8f0", borderRadius: 10, padding: "10px 18px", display: "flex", gap: 10, alignItems: "center" }}>
          <Badge variant={variant}>{val}</Badge>
          <span style={{ fontSize: 13, color: "#64748b", fontWeight: 500 }}>{label}</span>
        </div>
      ))}
    </div>

    {/* Table */}
    <div className="card">
      <div style={{ overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ borderBottom: "2px solid #f1f5f9" }}>
              {["ID Unidad", "Piso", "Tipo", "Propietario / Arrendatario", "Coeficiente", "Estado"].map((h) => (
                <th key={h} className="th">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {UNIDADES.map((u, i) => (
              <tr key={i} className="table-row" style={{ borderBottom: "1px solid #f8fafc" }}>
                <td className="td">
                  <span style={{ fontFamily: "DM Mono, monospace", fontSize: 13, fontWeight: 700, color: "#1d4ed8" }}>
                    {u.id}
                  </span>
                </td>
                <td className="td" style={{ color: "#64748b" }}>
                  {u.piso > 0 ? `Piso ${u.piso}` : "Sótano"}
                </td>
                <td className="td">
                  <Badge variant={tipoBadge(u.tipo)}>{u.tipo}</Badge>
                </td>
                <td className="td">{u.propietario}</td>
                <td className="td" style={{ fontFamily: "DM Mono, monospace", color: "#64748b" }}>
                  {u.coeficiente}
                </td>
                <td className="td">
                  <Badge variant={estadoBadge(u.estado)}>{u.estado}</Badge>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  </div>
);

export default UnidadesPage;
