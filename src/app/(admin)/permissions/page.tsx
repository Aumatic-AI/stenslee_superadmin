"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { createSupabaseBrowserClient } from "@/lib/supabase-client";
import { FEATURE_KEYS, type FeatureKey } from "@/lib/feature-registry";
import PermissionsMatrix, {
  type RowValueState,
  type PlanDefaultState,
} from "@/features/permissions/PermissionsMatrix";
import PageHeader from "@/components/ui/PageHeader";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import EmptyState from "@/components/ui/EmptyState";

interface Org {
  id: string;
  name: string;
  slug: string;
  plan_id: string | null;
  plans: { name: string } | null;
}

function emptyPlanDefaults(): PlanDefaultState {
  return Object.fromEntries(FEATURE_KEYS.map((k) => [k, { enabled: false, limit_value: null }])) as PlanDefaultState;
}

function rowsEqual(a: { enabled: boolean; limit_value: number | null }, b: { enabled: boolean; limit_value: number | null }) {
  return a.enabled === b.enabled && a.limit_value === b.limit_value;
}

function PermissionsContent() {
  const params = useSearchParams();
  const orgId = params.get("org");

  const [org, setOrg] = useState<Org | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [planDefaults, setPlanDefaults] = useState<PlanDefaultState>(emptyPlanDefaults());
  const [values, setValues] = useState<RowValueState>(emptyPlanDefaults());
  const [originalValues, setOriginalValues] = useState<RowValueState>(emptyPlanDefaults());
  const [loading, setLoading] = useState(!!orgId);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!orgId) return;
    let cancelled = false;

    async function load() {
      setLoading(true);
      const supabase = createSupabaseBrowserClient();
      const { data: orgData } = await supabase
        .from("organizations")
        .select("id, name, slug, plan_id, plans(name)")
        .eq("id", orgId!)
        .maybeSingle();

      if (cancelled) return;
      if (!orgData) {
        setNotFound(true);
        setLoading(false);
        return;
      }
      setOrg(orgData as unknown as Org);

      const [{ data: planFeatures }, { data: overrideRows }] = await Promise.all([
        orgData.plan_id
          ? supabase.from("plan_features").select("feature_key, enabled, limit_value").eq("plan_id", orgData.plan_id)
          : Promise.resolve({ data: [] }),
        supabase
          .from("organization_feature_overrides")
          .select("feature_key, enabled, limit_value")
          .eq("organization_id", orgId!),
      ]);

      if (cancelled) return;

      const defaults = emptyPlanDefaults();
      for (const row of planFeatures ?? []) {
        if ((FEATURE_KEYS as readonly string[]).includes(row.feature_key)) {
          defaults[row.feature_key as FeatureKey] = { enabled: row.enabled, limit_value: row.limit_value };
        }
      }
      setPlanDefaults(defaults);

      // Effective value per key: an override always wins wholesale, otherwise
      // it's whatever the plan grants. This is what the toggle/limit input
      // shows and edits directly -- there's no separate "has an override"
      // step to turn on first.
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
  }, [orgId]);

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
    if (!org) return;
    setSaving(true);
    setError("");
    const supabase = createSupabaseBrowserClient();
    const { data: { user } } = await supabase.auth.getUser();

    // Only touch rows that actually changed. Within those, a value that now
    // exactly matches the plan default needs no override row at all (delete
    // it if one existed); anything else needs an explicit override.
    const toUpsert = Array.from(changedKeys)
      .filter((key) => !rowsEqual(values[key], planDefaults[key]))
      .map((key) => ({
        organization_id: org.id,
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
            .eq("organization_id", org.id)
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
    <div className="flex flex-col gap-6">
      <div>
        <Link
          href={org ? `/organizations/${org.id}` : "/organizations"}
          className="inline-flex items-center gap-1.5 text-muted hover:text-gold transition-colors text-xs font-mono tracking-wider mb-3"
        >
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
          {org ? `Back to ${org.name}` : "Back to Organizations"}
        </Link>
        <PageHeader
          title="Permissions"
          description="Per-organization feature overrides. A changed row here always wins over the plan default."
        />
      </div>

      {!orgId || notFound ? (
        <Card className="p-10">
          <EmptyState message="Open an organization and click “Manage Overrides” to edit its permissions." />
        </Card>
      ) : loading ? (
        <div className="flex flex-col gap-3">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-24 skeleton rounded-xl" />
          ))}
        </div>
      ) : (
        <div className="flex flex-col gap-6 pb-20">
          <div>
            <h2 className="font-cinzel text-lg font-bold text-ink">{org!.name}</h2>
            <p className="text-muted text-xs font-mono">
              Plan: {org!.plans?.name ?? "No plan assigned"}
            </p>
          </div>

          {error && <p className="text-error text-sm font-mono">{error}</p>}

          <PermissionsMatrix
            planDefaults={planDefaults}
            values={values}
            changedKeys={changedKeys}
            onChange={(key, patch) => setValues((v) => ({ ...v, [key]: { ...v[key], ...patch } }))}
          />
        </div>
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

export default function PermissionsPage() {
  return (
    <Suspense fallback={<div className="h-96 skeleton rounded-2xl" />}>
      <PermissionsContent />
    </Suspense>
  );
}
