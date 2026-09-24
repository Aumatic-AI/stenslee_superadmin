"use client";

import { FEATURE_CATEGORIES, featuresByCategory, type FeatureKey } from "@/lib/feature-registry";
import Toggle from "@/components/ui/Toggle";

export interface FeatureGridValue {
  enabled: boolean;
  limit_value: number | null;
}

export type FeatureGridState = Record<FeatureKey, FeatureGridValue>;

interface PlanFeatureEditorProps {
  value: FeatureGridState;
  onChange: (key: FeatureKey, patch: Partial<FeatureGridValue>) => void;
}

export default function PlanFeatureEditor({ value, onChange }: PlanFeatureEditorProps) {
  return (
    <div className="flex flex-col gap-6">
      {FEATURE_CATEGORIES.map((category) => {
        const features = featuresByCategory(category);
        return (
          <div key={category} className="flex flex-col gap-2">
            <h3 className="text-[11px] font-mono uppercase tracking-[0.15em] text-muted">{category}</h3>
            <div className="flex flex-col divide-y divide-cleo-border rounded-xl border border-cleo-border overflow-hidden">
              {features.map((feature) => {
                const state = value[feature.key] ?? { enabled: false, limit_value: null };
                return (
                  <div key={feature.key} className="flex items-center gap-4 px-4 py-3 bg-surface">
                    <Toggle
                      checked={state.enabled}
                      onChange={(checked) => onChange(feature.key, { enabled: checked })}
                      aria-label={`Toggle ${feature.label}`}
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-ink text-sm font-semibold">{feature.label}</p>
                      <p className="text-muted text-xs truncate">{feature.description}</p>
                    </div>
                    {feature.kind === "limit" && state.enabled && (
                      <div className="flex items-center gap-1.5 shrink-0">
                        <input
                          type="number"
                          min={0}
                          value={state.limit_value ?? ""}
                          onChange={(e) =>
                            onChange(feature.key, {
                              limit_value: e.target.value === "" ? null : Number(e.target.value),
                            })
                          }
                          placeholder="∞"
                          className="w-20 bg-surface-2 border border-cleo-border rounded-lg px-2 py-1.5 text-ink text-sm text-right focus:outline-none focus:border-gold transition-colors"
                        />
                        <span className="text-muted text-[10px] font-mono whitespace-nowrap">{feature.unit}</span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}
