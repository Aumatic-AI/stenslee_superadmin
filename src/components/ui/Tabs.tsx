"use client";

export interface TabDef {
  key: string;
  label: string;
}

interface TabsProps {
  tabs: TabDef[];
  active: string;
  onChange: (key: string) => void;
}

// Reusable tab bar -- segmented-pill style to match this app's other
// single-select controls (FilterChips, the Plan/Status pickers). Add a new
// tab anywhere in this app by just adding another { key, label } entry to
// the `tabs` array passed in.
export default function Tabs({ tabs, active, onChange }: TabsProps) {
  return (
    <div className="flex items-center gap-2 flex-wrap border-b border-cleo-border pb-3">
      {tabs.map((tab) => {
        const isActive = tab.key === active;
        return (
          <button
            key={tab.key}
            type="button"
            onClick={() => onChange(tab.key)}
            className={`px-4 py-2 rounded-xl text-xs font-cinzel font-bold uppercase tracking-wider transition-colors cursor-pointer border ${
              isActive
                ? "bg-gold text-bg border-gold"
                : "bg-transparent text-muted border-cleo-border hover:border-gold/40 hover:text-ink"
            }`}
          >
            {tab.label}
          </button>
        );
      })}
    </div>
  );
}
