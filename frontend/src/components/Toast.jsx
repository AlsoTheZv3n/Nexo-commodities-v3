import { useEffect, useState } from "react";
import { CheckCircle, AlertCircle, Info, X } from "lucide-react";

const icons = {
  success: CheckCircle,
  error: AlertCircle,
  info: Info,
};

const styles = {
  success: "border-positive/30 bg-positive/[0.08]",
  error: "border-negative/30 bg-negative/[0.08]",
  info: "border-accent/30 bg-accent/[0.08]",
};

const iconColors = {
  success: "text-positive",
  error: "text-negative",
  info: "text-accent",
};

function ToastItem({ toast, onDismiss }) {
  const [exiting, setExiting] = useState(false);
  const Icon = icons[toast.type] || icons.info;

  useEffect(() => {
    const timer = setTimeout(() => {
      setExiting(true);
      setTimeout(() => onDismiss(toast.id), 300);
    }, toast.duration || 4000);
    return () => clearTimeout(timer);
  }, [toast, onDismiss]);

  return (
    <div className={`flex items-start gap-3 px-4 py-3 rounded-lg border backdrop-blur-sm shadow-lg transition-all duration-300 ${
      styles[toast.type] || styles.info
    } ${exiting ? "opacity-0 translate-x-8" : "opacity-100 translate-x-0"}`}>
      <Icon size={16} className={`mt-0.5 shrink-0 ${iconColors[toast.type] || iconColors.info}`} />
      <div className="flex-1 min-w-0">
        {toast.title && <div className="text-xs font-semibold text-text-primary mb-0.5">{toast.title}</div>}
        <div className="text-[11px] text-text-secondary leading-relaxed">{toast.message}</div>
      </div>
      <button onClick={() => { setExiting(true); setTimeout(() => onDismiss(toast.id), 300); }}
        className="text-muted hover:text-text-primary transition-colors cursor-pointer shrink-0">
        <X size={14} />
      </button>
    </div>
  );
}

export default function ToastContainer({ toasts, onDismiss }) {
  if (!toasts.length) return null;
  return (
    <div className="fixed bottom-5 right-5 z-50 flex flex-col gap-2 w-80">
      {toasts.map(t => (
        <ToastItem key={t.id} toast={t} onDismiss={onDismiss} />
      ))}
    </div>
  );
}
