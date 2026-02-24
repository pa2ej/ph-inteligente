import { Menu, Bell } from "lucide-react";
import { useAuth } from "../../context/AuthContext";

/**
 * Barra de navegación superior.
 * @param {{ title: string, onMenuToggle: () => void }} props
 */
const Navbar = ({ title, onMenuToggle }) => {
  const { user } = useAuth();

  return (
    <header
      style={{
        height: 64, background: "white", borderBottom: "1px solid #e2e8f0",
        display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "0 24px", flexShrink: 0, position: "sticky", top: 0, zIndex: 30,
      }}
    >
      {/* Left: hamburger + breadcrumb */}
      <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
        <button
          onClick={onMenuToggle}
          aria-label="Alternar menú"
          style={{ background: "none", border: "none", cursor: "pointer", color: "#64748b", display: "flex", padding: 4, borderRadius: 8 }}
        >
          <Menu size={20} />
        </button>

        <div>
          <div style={{ fontSize: 16, fontWeight: 700, color: "#0f172a", lineHeight: 1.2 }}>{title}</div>
          <div style={{ fontSize: 12, color: "#94a3b8" }}>{user?.nombre_ph}</div>
        </div>
      </div>

      {/* Right: bell + profile */}
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        {/* Notification bell */}
        <button
          aria-label="Notificaciones"
          style={{
            background: "#f1f5f9", border: "none", borderRadius: 10,
            width: 38, height: 38, cursor: "pointer", display: "flex",
            alignItems: "center", justifyContent: "center",
            color: "#64748b", position: "relative",
          }}
        >
          <Bell size={17} />
          <span style={{
            position: "absolute", top: 8, right: 9,
            width: 7, height: 7, background: "#ef4444",
            borderRadius: "50%", border: "1.5px solid white",
          }} />
        </button>

        {/* User chip */}
        <div style={{
          display: "flex", alignItems: "center", gap: 10,
          background: "#f8fafc", border: "1px solid #e2e8f0",
          borderRadius: 10, padding: "7px 14px",
        }}>
          <div style={{
            width: 28, height: 28, borderRadius: "50%",
            background: "linear-gradient(135deg, #3b82f6, #60a5fa)",
            display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
          }}>
            <span style={{ color: "white", fontSize: 12, fontWeight: 700 }}>
              {user?.nombre_completo?.[0] ?? "U"}
            </span>
          </div>
          <div>
            <div style={{ fontSize: 13, fontWeight: 600, color: "#1e293b", lineHeight: 1.2 }}>
              {user?.nombre_completo}
            </div>
            <div style={{ fontSize: 11, color: "#94a3b8" }}>{user?.cargo}</div>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Navbar;
