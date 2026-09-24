"use client";

import { FEATURE_CATEGORIES, featuresByCategory, type FeatureKey } from "@/lib/feature-registry";
import Toggle from "@/components/ui/Toggle";
import Badge from "@/components/ui/Badge";

export interface RowValue {
  enabled: boolean;
  limit_value: number | null;
}

export type RowValueState = Record<FeatureKey, RowValue>;

export interface PlanDefault {
  enabled: boolean;
  limit_value: number | null;
}

export type PlanDefaultState = Record<FeatureKey, PlanDefault>;

interface PermissionsMatrixProps {
  planDefaults: PlanDefaultState;
  values: RowValueState;
  changedKeys: Set<FeatureKey>;
  onChange: (key: FeatureKey, patch: Partial<RowValue>) => void;
}

function describePlanDefault(plan: PlanDefault, kind: "toggle" | "limit", unit?: string) {
  if (!plan.enabled) return "Off";
  if (kind === "toggle") return "On";
  return plan.limit_value === null ? "Unlimited" : `${plan.limit_value} ${unit ?? ""}`.trim();
}

export default function PermissionsMatrix({ planDefaults, values, changedKeys, onChange }: PermissionsMatrixProps) {
  return (
    <div className="flex flex-col gap-6">
      {FEATURE_CATEGORIES.map((category) => {
        const features = featuresByCategory(category);
        return (
          <div key={category} className="flex flex-col gap-2">
            <h3 className="text-[11px] font-mono uppercase tracking-[0.15em] text-muted">{category}</h3>
            <div className="flex flex-col divide-y divide-cleo-border rounded-xl border border-cleo-border overflow-hidden">
              {features.map((feature) => {
                const plan = planDefaults[feature.key] ?? { enabled: false, limit_value: null };
                const value = values[feature.key] ?? { enabled: false, limit_value: null };
                const changed = changedKeys.has(feature.key);

                return (
                  <div
                    key={feature.key}
                    className={`flex flex-wrap items-center gap-3 px-4 py-3 transition-colors ${changed ? "bg-gold/5" : "bg-surface"}`}
                  >
                    <div className="flex-1 min-w-40">
                      <div className="flex items-center gap-2">
                        <p className="text-ink text-sm font-semibold">{feature.label}</p>
                        {changed && <span className="w-1.5 h-1.5 rounded-full bg-gold shrink-0" title="Unsaved change" />}
                      </div>
                      <p className="text-muted text-xs truncate">{feature.description}</p>
                    </div>
                    <div className="flex flex-wrap items-center gap-3 shrink-0 ml-auto">
                      <Badge tone={plan.enabled ? "gold" : "muted"}>
                        Plan: {describePlanDefault(plan, feature.kind, feature.unit)}
                      </Badge>
                      {feature.kind === "limit" && value.enabled && (
                        <div className="flex items-center gap-1.5">
                          <input
                            type="number"
                            min={0}
                            value={value.limit_value ?? ""}
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
                      <Toggle
                        checked={value.enabled}
                        onChange={(checked) =>
                          onChange(feature.key, {
                            enabled: checked,
                            // Pre-fill a sensible limit the first time this is turned
                            // on with nothing set yet, instead of showing an empty
                            // "0 requests allowed" field.
                            limit_value: checked && value.limit_value === null ? plan.limit_value : value.limit_value,
                          })
                        }
                        aria-label={`${feature.label} enabled`}
                      />
                    </div>
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
