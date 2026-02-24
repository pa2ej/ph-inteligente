import { useNavigate } from "react-router-dom";
import { Home, AlertTriangle } from "lucide-react";

const NotFoundPage = () => {
  const navigate = useNavigate();

  return (
    <div style={{
      minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center",
      background: "#f0f4f8", flexDirection: "column", gap: 20, padding: 24, textAlign: "center",
    }}>
      <div style={{ width: 70, height: 70, background: "#fef9c3", borderRadius: 20, display: "flex", alignItems: "center", justifyContent: "center" }}>
        <AlertTriangle size={36} color="#ca8a04" />
      </div>
      <h1 style={{ fontSize: 64, fontWeight: 800, color: "#1e293b", lineHeight: 1 }}>404</h1>
      <p style={{ fontSize: 18, fontWeight: 600, color: "#475569" }}>Página no encontrada</p>
      <p style={{ fontSize: 14, color: "#94a3b8", maxWidth: 360 }}>
        La ruta que buscas no existe o fue movida. Regresa al dashboard para continuar.
      </p>
      <button className="btn-primary" onClick={() => navigate("/dashboard")}>
        <Home size={16} /> Ir al Dashboard
      </button>
    </div>
  );
};

export default NotFoundPage;
