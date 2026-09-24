import Card from "./Card";

interface StatCardProps {
  label: string;
  value: string | number;
  hint?: string;
  accent?: boolean;
}

export default function StatCard({ label, value, hint, accent = false }: StatCardProps) {
  return (
    <Card className="p-5 flex flex-col gap-2">
      <span className="text-[11px] font-mono tracking-[0.15em] uppercase text-muted">{label}</span>
      <span className={`font-cinzel text-3xl font-bold ${accent ? "text-gold" : "text-ink"}`}>{value}</span>
      {hint && <span className="text-xs text-muted">{hint}</span>}
    </Card>
  );
}
