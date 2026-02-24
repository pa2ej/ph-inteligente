import { useEffect } from "react";
import { CheckCircle, AlertCircle, Info, X } from "lucide-react";
import { useToast } from "../../context/ToastContext";

const ICONS = {
  success: <CheckCircle size={18} />,
  error:   <AlertCircle size={18} />,
  info:    <Info size={18} />,
};

const AUTO_DISMISS_MS = 4000;

const Toast = () => {
  const { toast, hideToast } = useToast();

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(hideToast, AUTO_DISMISS_MS);
    return () => clearTimeout(t);
  }, [toast, hideToast]);

  if (!toast) return null;

  return (
    <div className={`toast toast-${toast.type}`} role="alert" aria-live="polite">
      <span style={{ flexShrink: 0 }}>{ICONS[toast.type] ?? ICONS.info}</span>
      <span style={{ fontSize: 14, fontWeight: 500, flex: 1, lineHeight: 1.4 }}>
        {toast.message}
      </span>
      <button
        onClick={hideToast}
        aria-label="Cerrar"
        style={{ background: "none", border: "none", cursor: "pointer", color: "inherit", display: "flex", padding: 2, flexShrink: 0 }}
      >
        <X size={16} />
      </button>
    </div>
  );
};

export default Toast;
