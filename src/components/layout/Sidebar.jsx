import { NavLink, useNavigate } from "react-router-dom";
import {
  LayoutDashboard, Home, FileText, CreditCard,
  Building2, LogOut, ChevronRight,
} from "lucide-react";
import { useAuth } from "../../context/AuthContext";

const NAV_ITEMS = [
  { to: "/dashboard",    label: "Dashboard",        icon: LayoutDashboard },
  { to: "/unidades",     label: "Unidades",          icon: Home },
  { to: "/facturacion",  label: "Facturación",       icon: FileText },
  { to: "/pagos",        label: "Pagos / Recaudos",  icon: CreditCard },
];

const Sidebar = ({ collapsed }) => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate("/login", { replace: true });
  };

  return (
    <aside
      className="sidebar-bg"
      style={{
        width: collapsed ? 0 : 240,
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        transition: "width 0.25s ease",
        overflow: "hidden",
        flexShrink: 0,
        borderRight: "1px solid rgba(255,255,255,0.05)",
      }}
    >
      {/* ── Logo ─────────────────────────────────────────────────────────── */}
      <div style={{ padding: "24px 20px 20px", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{
            width: 36, height: 36, borderRadius: 10, flexShrink: 0,
            background: "linear-gradient(135deg, #3b82f6, #1d4ed8)",
            display: "flex", alignItems: "center", justifyContent: "center",
            boxShadow: "0 4px 14px rgba(59,130,246,0.4)",
          }}>
            <Building2 size={18} color="white" />
          </div>
          <div>
            <div style={{ color: "white", fontSize: 14, fontWeight: 700, whiteSpace: "nowrap" }}>
              PH Inteligente
            </div>
            <div style={{ color: "#475569", fontSize: 11, whiteSpace: "nowrap" }}>v1.0 — Gestión PH</div>
          </div>
        </div>
      </div>

      {/* ── Navigation ───────────────────────────────────────────────────── */}
      <nav style={{ padding: "16px 12px", flex: 1 }}>
        <p style={{ fontSize: 11, fontWeight: 700, color: "#334155", letterSpacing: "0.08em", padding: "0 6px", marginBottom: 8 }}>
          MENÚ PRINCIPAL
        </p>

        {NAV_ITEMS.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) => `sidebar-item${isActive ? " active" : ""}`}
          >
            <Icon size={18} />
            <span style={{ whiteSpace: "nowrap", flex: 1 }}>{label}</span>
            <ChevronRight size={13} style={{ opacity: 0.4 }} />
          </NavLink>
        ))}
      </nav>

      {/* ── User + logout ─────────────────────────────────────────────────── */}
      <div style={{ padding: "14px 12px", borderTop: "1px solid rgba(255,255,255,0.06)" }}>
        {/* Avatar & name */}
        <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 6px", marginBottom: 6 }}>
          <div style={{
            width: 34, height: 34, borderRadius: "50%", flexShrink: 0,
            background: "linear-gradient(135deg, #3b82f6, #60a5fa)",
            display: "flex", alignItems: "center", justifyContent: "center",
          }}>
            <span style={{ color: "white", fontSize: 13, fontWeight: 700 }}>
              {user?.nombre_completo?.[0] ?? "U"}
            </span>
          </div>
          <div style={{ overflow: "hidden" }}>
            <div style={{ color: "#e2e8f0", fontSize: 13, fontWeight: 600, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
              {user?.nombre_completo}
            </div>
            <div style={{ color: "#64748b", fontSize: 11 }}>{user?.cargo}</div>
          </div>
        </div>

        {/* Logout */}
        <button
          onClick={handleLogout}
          className="sidebar-item danger"
          style={{ width: "100%", background: "none", border: "none", cursor: "pointer", fontFamily: "inherit" }}
        >
          <LogOut size={17} />
          <span>Cerrar sesión</span>
        </button>
      </div>
    </aside>
  );
};

export default Sidebar;
