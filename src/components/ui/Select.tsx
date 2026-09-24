"use client";

import { useEffect, useRef, useState } from "react";

export interface SelectOption {
  value: string;
  label: string;
}

interface SelectProps {
  label?: string;
  value: string;
  onChange: (value: string) => void;
  options: SelectOption[];
  placeholder?: string;
  className?: string;
}

// Custom dropdown -- this app never uses a native <select>, to match the
// studio app's visual language (see AGENTS.md).
export default function Select({ label, value, onChange, options, placeholder = "Select…", className = "" }: SelectProps) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const selected = options.find((o) => o.value === value);

  useEffect(() => {
    if (!open) return;
    function onClickOutside(e: MouseEvent) {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false);
    }
    window.addEventListener("mousedown", onClickOutside);
    return () => window.removeEventListener("mousedown", onClickOutside);
  }, [open]);

  return (
    <div ref={rootRef} className={`relative ${className}`}>
      {label && <label className="text-xs font-mono tracking-[0.15em] uppercase text-muted block mb-1.5">{label}</label>}
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between gap-2 bg-surface border border-cleo-border rounded-xl px-4 py-2.5 text-sm text-left transition-colors hover:border-gold/40 cursor-pointer"
      >
        <span className={selected ? "text-ink" : "text-muted/60"}>{selected?.label ?? placeholder}</span>
        <svg
          className={`w-4 h-4 text-muted shrink-0 transition-transform ${open ? "rotate-180" : ""}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {open && (
        <div className="absolute z-20 top-full left-0 right-0 mt-1.5 bg-surface border border-cleo-border rounded-xl shadow-2xl max-h-64 overflow-y-auto scrollbar-thin py-1.5">
          {options.length === 0 ? (
            <p className="px-4 py-2.5 text-muted text-xs">No options.</p>
          ) : (
            options.map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => {
                  onChange(opt.value);
                  setOpen(false);
                }}
                className={`w-full text-left px-4 py-2 text-sm transition-colors cursor-pointer ${
                  opt.value === value ? "text-gold bg-gold/10" : "text-ink hover:bg-surface-2"
                }`}
              >
                {opt.label}
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}
