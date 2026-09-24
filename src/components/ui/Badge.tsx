type Tone = "gold" | "success" | "error" | "muted";

const toneClasses: Record<Tone, string> = {
  gold: "bg-gold/10 text-gold border-gold/30",
  success: "bg-success/10 text-success border-success/30",
  error: "bg-error/10 text-error border-error/30",
  muted: "bg-surface-2 text-muted border-cleo-border",
};

export default function Badge({ tone = "muted", children }: { tone?: Tone; children: React.ReactNode }) {
  return (
    <span
      className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full border text-[11px] font-mono tracking-wide uppercase ${toneClasses[tone]}`}
    >
      {children}
    </span>
  );
}
