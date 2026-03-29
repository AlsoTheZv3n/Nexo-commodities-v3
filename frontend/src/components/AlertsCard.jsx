import { AlertTriangle, AlertCircle, Info } from "lucide-react";
import Card from "./Card";

const alertStyles = {
  warn:   { bg: "bg-warning/[0.05]", border: "border-warning/20", text: "text-warning", Icon: AlertTriangle },
  danger: { bg: "bg-negative/[0.05]", border: "border-negative/20", text: "text-negative", Icon: AlertCircle },
  info:   { bg: "bg-accent/[0.05]", border: "border-accent/20", text: "text-accent", Icon: Info },
};

export default function AlertsCard({ alerts }) {
  return (
    <Card label="Live Alerts">
      <div className="flex flex-col gap-1.5 max-h-[160px] overflow-y-auto">
        {!alerts.length ? (
          <div className="text-[11px] text-muted py-2">No alerts yet.</div>
        ) : alerts.map(a => {
          const s = alertStyles[a.type] || alertStyles.info;
          return (
            <div key={a.id} className={`flex items-start gap-2 px-2.5 py-2 rounded-md border text-[10px] leading-relaxed animate-fade-in ${s.bg} ${s.border} ${s.text}`}>
              <s.Icon size={12} className="mt-0.5 shrink-0" />
              <span className="flex-1">{a.msg}</span>
              <span className="text-[9px] opacity-50 whitespace-nowrap mt-0.5">{a.time}</span>
            </div>
          );
        })}
      </div>
    </Card>
  );
}
