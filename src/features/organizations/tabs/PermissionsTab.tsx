"use client";

import { useEffect, useMemo, useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase-client";
import { FEATURE_KEYS, type FeatureKey } from "@/lib/feature-registry";
import PermissionsMatrix, {
  type RowValueState,
  type PlanDefaultState,
} from "@/features/permissions/PermissionsMatrix";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";

function emptyPlanDefaults(): PlanDefaultState {
  return Object.fromEntries(FEATURE_KEYS.map((k) => [k, { enabled: false, limit_value: null }])) as PlanDefaultState;
}

function rowsEqual(a: { enabled: boolean; limit_value: number | null }, b: { enabled: boolean; limit_value: number | null }) {
  return a.enabled === b.enabled && a.limit_value === b.limit_value;
}

const STATUS_OPTIONS = ["active", "suspended", "cancelled"] as const;

interface Props {
  organizationId: string;
  planId: string | null;
  status: string;
  savingStatus: boolean;
  onUpdateStatus: (status: string) => void;
}

export default function PermissionsTab({ organizationId, planId, status, savingStatus, onUpdateStatus }: Props) {
  const [planDefaults, setPlanDefaults] = useState<PlanDefaultState>(emptyPlanDefaults());
  const [values, setValues] = useState<RowValueState>(emptyPlanDefaults());
  const [originalValues, setOriginalValues] = useState<RowValueState>(emptyPlanDefaults());
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      const supabase = createSupabaseBrowserClient();
      const [{ data: planFeatures }, { data: overrideRows }] = await Promise.all([
        planId
          ? supabase.from("plan_features").select("feature_key, enabled, limit_value").eq("plan_id", planId)
          : Promise.resolve({ data: [] }),
        supabase
          .from("organization_feature_overrides")
          .select("feature_key, enabled, limit_value")
          .eq("organization_id", organizationId),
      ]);

      if (cancelled) return;

      const defaults = emptyPlanDefaults();
      for (const row of planFeatures ?? []) {
        if ((FEATURE_KEYS as readonly string[]).includes(row.feature_key)) {
          defaults[row.feature_key as FeatureKey] = { enabled: row.enabled, limit_value: row.limit_value };
        }
      }
      setPlanDefaults(defaults);

      const overrideByKey = new Map(
        (overrideRows ?? [])
          .filter((r) => (FEATURE_KEYS as readonly string[]).includes(r.feature_key))
          .map((r) => [r.feature_key as FeatureKey, { enabled: r.enabled, limit_value: r.limit_value }])
      );
      const effective = Object.fromEntries(
        FEATURE_KEYS.map((k) => [k, overrideByKey.get(k) ?? defaults[k]])
      ) as RowValueState;

      setValues(effective);
      setOriginalValues(effective);
      setError("");
      setLoading(false);
    }
    load();
    return () => { cancelled = true; };
    // planId changing (a plan switch on the Plans tab) should refresh what
    // "Plan: X" badges show here too.
  }, [organizationId, planId]);

  const changedKeys = useMemo(() => {
    const changed = new Set<FeatureKey>();
    for (const key of FEATURE_KEYS) {
      if (!rowsEqual(values[key], originalValues[key])) changed.add(key);
    }
    return changed;
  }, [values, originalValues]);

  const isDirty = changedKeys.size > 0;

  function handleDiscard() {
    setValues(originalValues);
    setError("");
  }

  async function handleSave() {
    setSaving(true);
    setError("");
    const supabase = createSupabaseBrowserClient();
    const { data: { user } } = await supabase.auth.getUser();

    const toUpsert = Array.from(changedKeys)
      .filter((key) => !rowsEqual(values[key], planDefaults[key]))
      .map((key) => ({
        organization_id: organizationId,
        feature_key: key,
        enabled: values[key].enabled,
        limit_value: values[key].limit_value,
        updated_by: user?.id ?? null,
      }));
    const toDelete = Array.from(changedKeys).filter((key) => rowsEqual(values[key], planDefaults[key]));

    const [{ error: upsertError }, { error: deleteError }] = await Promise.all([
      toUpsert.length > 0
        ? supabase.from("organization_feature_overrides").upsert(toUpsert, { onConflict: "organization_id,feature_key" })
        : Promise.resolve({ error: null }),
      toDelete.length > 0
        ? supabase
            .from("organization_feature_overrides")
            .delete()
            .eq("organization_id", organizationId)
            .in("feature_key", toDelete)
        : Promise.resolve({ error: null }),
    ]);

    setSaving(false);
    if (upsertError || deleteError) {
      setError(upsertError?.message ?? deleteError?.message ?? "Failed to save changes.");
      return;
    }
    setOriginalValues(values);
  }

  return (
    <div className="flex flex-col gap-6 pb-20">
      <Card className="p-5 flex flex-col gap-3">
        <h2 className="font-cinzel text-sm font-bold tracking-wide text-ink uppercase">Status</h2>
        <div className="flex flex-wrap gap-2">
          {STATUS_OPTIONS.map((s) => (
            <button
              key={s}
              onClick={() => onUpdateStatus(s)}
              disabled={savingStatus}
              className={`px-4 py-2 rounded-xl border text-xs font-mono uppercase tracking-wider transition-colors cursor-pointer disabled:opacity-50 ${
                status === s
                  ? s === "active"
                    ? "border-success bg-success/10 text-success"
                    : s === "suspended"
                    ? "border-error bg-error/10 text-error"
                    : "border-muted bg-surface-2 text-muted"
                  : "border-cleo-border text-muted hover:border-gold/40"
              }`}
            >
              {s}
            </button>
          ))}
        </div>
        <p className="text-muted text-xs">
          Suspending blocks staff sign-in at the studio app; cancelling is intended for offboarded studios.
        </p>
      </Card>

      {error && <p className="text-error text-sm font-mono">{error}</p>}

      {loading ? (
        <div className="flex flex-col gap-3">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-24 skeleton rounded-xl" />
          ))}
        </div>
      ) : (
        <PermissionsMatrix
          planDefaults={planDefaults}
          values={values}
          changedKeys={changedKeys}
          onChange={(key, patch) => setValues((v) => ({ ...v, [key]: { ...v[key], ...patch } }))}
        />
      )}

      {isDirty && (
        <div className="fixed bottom-6 inset-x-0 z-40 flex justify-center px-4 pointer-events-none">
          <div className="pointer-events-auto bg-surface border border-gold/40 rounded-2xl shadow-2xl px-5 py-3.5 flex items-center gap-4 animate-fade-up">
            <span className="text-ink text-sm">
              <span className="text-gold font-bold">{changedKeys.size}</span>{" "}
              unsaved change{changedKeys.size === 1 ? "" : "s"}
            </span>
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="sm" onClick={handleDiscard} disabled={saving}>
                Discard
              </Button>
              <Button size="sm" onClick={handleSave} loading={saving}>
                Save Permissions
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
