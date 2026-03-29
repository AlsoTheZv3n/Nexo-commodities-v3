export default function Card({ label, trailing, span = 1, className = "", children }) {
  const spanClass = span === 3 ? "col-span-3" : span === 2 ? "col-span-2" : "";

  return (
    <div className={`bg-card border border-border rounded-xl p-4 animate-fade-in hover:border-border-hi transition-colors ${spanClass} ${className}`}>
      {label && (
        <div className="flex items-center gap-2 mb-3">
          <span className="text-[9px] tracking-[0.16em] text-muted uppercase">{label}</span>
          <div className="flex-1 h-px bg-border" />
          {trailing && <span className="text-[9px] tracking-wider text-muted/60">{trailing}</span>}
        </div>
      )}
      {children}
    </div>
  );
}
