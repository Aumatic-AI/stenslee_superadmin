import type { InputHTMLAttributes } from "react";

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
}

export default function Input({ label, className = "", id, ...props }: InputProps) {
  return (
    <div className="flex flex-col gap-1.5">
      {label && (
        <label htmlFor={id} className="text-xs font-mono tracking-[0.15em] uppercase text-muted">
          {label}
        </label>
      )}
      <input
        id={id}
        className={`bg-surface border border-cleo-border rounded-xl px-4 py-2.5 text-ink text-sm placeholder:text-muted/50 focus:outline-none focus:border-gold transition-colors ${className}`}
        {...props}
      />
    </div>
  );
}
