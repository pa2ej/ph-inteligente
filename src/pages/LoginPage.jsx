import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Building2, Shield, Eye, EyeOff, Loader2, AlertCircle } from "lucide-react";
import { useAuth } from "../context/AuthContext";

const LoginPage = () => {
  const { login } = useAuth();
  const navigate  = useNavigate();

  const [email,    setEmail]    = useState("admin@ph.com");
  const [password, setPassword] = useState("123456");
  const [showPass, setShowPass] = useState(false);
  const [loading,  setLoading]  = useState(false);
  const [error,    setError]    = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await login(email, password);
      navigate("/dashboard", { replace: true });
    } catch (err) {
      setError(err.message || "Credenciales incorrectas");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="login-bg"
      style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}
    >
      <div className="grid-pattern" />

      {/* Glow orbs */}
      <div style={{ position: "absolute", top: "10%", right: "15%", width: 320, height: 320, borderRadius: "50%", background: "radial-gradient(circle, rgba(59,130,246,0.09) 0%, transparent 70%)", pointerEvents: "none" }} />
      <div style={{ position: "absolute", bottom: "15%", left: "8%",  width: 220, height: 220, borderRadius: "50%", background: "radial-gradient(circle, rgba(99,179,237,0.06) 0%, transparent 70%)", pointerEvents: "none" }} />

      <div className="fade-in-up" style={{ width: "100%", maxWidth: 420, position: "relative", zIndex: 1 }}>
        {/* Branding */}
        <div style={{ textAlign: "center", marginBottom: 36 }}>
          <div style={{
            width: 58, height: 58, borderRadius: 17, margin: "0 auto 16px",
            background: "linear-gradient(135deg, #3b82f6, #1d4ed8)",
            display: "flex", alignItems: "center", justifyContent: "center",
            boxShadow: "0 8px 32px rgba(59,130,246,0.45)",
          }}>
            <Building2 size={28} color="white" />
          </div>
          <h1 style={{ color: "white", fontSize: 26, fontWeight: 700, letterSpacing: "-0.02em" }}>
            PH Inteligente
          </h1>
          <p style={{ color: "#64748b", fontSize: 14, marginTop: 6 }}>
            Sistema de gestión de propiedad horizontal
          </p>
        </div>

        {/* Card */}
        <div style={{
          background: "rgba(255,255,255,0.97)", borderRadius: 20, padding: "36px 32px",
          boxShadow: "0 25px 60px rgba(0,0,0,0.35), 0 0 0 1px rgba(255,255,255,0.08)",
        }}>
          <h2 style={{ fontSize: 20, fontWeight: 700, color: "#0f172a", marginBottom: 4 }}>
            Bienvenido
          </h2>
          <p style={{ fontSize: 14, color: "#64748b", marginBottom: 28 }}>
            Ingresa tus credenciales para continuar
          </p>

          {/* Error alert */}
          {error && (
            <div style={{
              background: "#fef2f2", border: "1px solid #fca5a5", borderRadius: 10,
              padding: "10px 14px", marginBottom: 20,
              display: "flex", alignItems: "center", gap: 8, fontSize: 13, color: "#dc2626",
            }}>
              <AlertCircle size={15} /> {error}
            </div>
          )}

          <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 18 }}>
            {/* Email */}
            <div className="form-field">
              <label className="form-label" htmlFor="email">Correo electrónico</label>
              <input
                id="email"
                className="form-input"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="admin@copropiedad.com"
                required
                autoComplete="username"
              />
            </div>

            {/* Password */}
            <div className="form-field">
              <label className="form-label" htmlFor="password">Contraseña</label>
              <div style={{ position: "relative" }}>
                <input
                  id="password"
                  className="form-input"
                  type={showPass ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  autoComplete="current-password"
                  style={{ paddingRight: 44 }}
                />
                <button
                  type="button"
                  onClick={() => setShowPass((v) => !v)}
                  aria-label={showPass ? "Ocultar contraseña" : "Mostrar contraseña"}
                  style={{
                    position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)",
                    background: "none", border: "none", cursor: "pointer", color: "#94a3b8", display: "flex",
                  }}
                >
                  {showPass ? <EyeOff size={17} /> : <Eye size={17} />}
                </button>
              </div>
            </div>

            {/* Submit */}
            <button
              className="btn-primary"
              type="submit"
              disabled={loading}
              style={{ width: "100%", padding: "13px 22px", marginTop: 4 }}
            >
              {loading
                ? <><Loader2 size={17} className="spinner" /> Autenticando...</>
                : <><Shield size={16} /> Iniciar sesión</>
              }
            </button>
          </form>

          {/* Demo hint */}
          <p style={{ textAlign: "center", fontSize: 12, color: "#94a3b8", marginTop: 22 }}>
            Demo:{" "}
            <span style={{ fontFamily: "DM Mono, monospace", color: "#64748b" }}>admin@ph.com</span>
            {" / "}
            <span style={{ fontFamily: "DM Mono, monospace", color: "#64748b" }}>123456</span>
          </p>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
