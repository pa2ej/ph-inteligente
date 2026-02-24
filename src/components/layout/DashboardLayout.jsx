import { useState } from "react";
import { Outlet, useLocation } from "react-router-dom";
import Sidebar from "./Sidebar";
import Navbar from "./Navbar";
import Toast from "../ui/Toast";

/** Mapeo ruta → título de la página */
const PAGE_TITLES = {
  "/dashboard":   "Dashboard",
  "/unidades":    "Unidades",
  "/facturacion": "Facturación Masiva",
  "/pagos":       "Pagos / Recaudos",
};

const DashboardLayout = () => {
  const [collapsed, setCollapsed] = useState(false);
  const { pathname } = useLocation();

  const title = PAGE_TITLES[pathname] ?? "PH Inteligente";

  return (
    <div style={{ display: "flex", minHeight: "100vh", background: "#f0f4f8" }}>
      {/* Sidebar */}
      <Sidebar collapsed={collapsed} />

      {/* Main area */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden", minWidth: 0 }}>
        <Navbar title={title} onMenuToggle={() => setCollapsed((v) => !v)} />

        <main style={{ flex: 1, padding: 28, overflowY: "auto" }}>
          {/* Cada página se renderiza aquí gracias a Outlet */}
          <Outlet />
        </main>
      </div>

      {/* Notificaciones globales */}
      <Toast />
    </div>
  );
};

export default DashboardLayout;
