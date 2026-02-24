import { Loader2 } from "lucide-react";

/**
 * Spinner de carga inline o de pantalla completa.
 * @param {{ size?: number, fullScreen?: boolean, label?: string }} props
 */
const Spinner = ({ size = 20, fullScreen = false, label = "Cargando..." }) => {
  if (fullScreen) {
    return (
      <div
        style={{
          position: "fixed", inset: 0, display: "flex", flexDirection: "column",
          alignItems: "center", justifyContent: "center", background: "rgba(255,255,255,0.85)",
          backdropFilter: "blur(4px)", zIndex: 9999, gap: 12,
        }}
        aria-label={label}
      >
        <Loader2 size={36} color="#3b82f6" className="spinner" />
        <span style={{ fontSize: 14, color: "#64748b", fontWeight: 500 }}>{label}</span>
      </div>
    );
  }

  return <Loader2 size={size} className="spinner" aria-label={label} />;
};

export default Spinner;
