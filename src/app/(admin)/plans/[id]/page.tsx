"use client";

import { useEffect, useState, use } from "react";
import { useRouter } from "next/navigation";
import { createSupabaseBrowserClient } from "@/lib/supabase-client";
import { FEATURE_KEYS } from "@/lib/feature-registry";
import { emptyFeatureGrid, gridFromRows } from "@/lib/feature-grid";
import PlanFeatureEditor from "@/features/plans/PlanFeatureEditor";
import PageHeader from "@/components/ui/PageHeader";
import Card from "@/components/ui/Card";
import Input from "@/components/ui/Input";
import Button from "@/components/ui/Button";
import Toggle from "@/components/ui/Toggle";
import EmptyState from "@/components/ui/EmptyState";

export default function EditPlanPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState("0");
  const [interval, setInterval] = useState<"month" | "year">("month");
  const [isActive, setIsActive] = useState(true);
  const [grid, setGrid] = useState(emptyFeatureGrid());
  const [notFound, setNotFound] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const supabase = createSupabaseBrowserClient();
    (async () => {
      const [{ data: plan }, { data: features }] = await Promise.all([
        supabase.from("plans").select("*").eq("id", id).maybeSingle(),
        supabase.from("plan_features").select("feature_key, enabled, limit_value").eq("plan_id", id),
      ]);

      if (!plan) {
        setNotFound(true);
        setLoading(false);
        return;
      }

      setName(plan.name);
      setDescription(plan.description ?? "");
      setPrice(String(plan.price_cents / 100));
      setInterval(plan.billing_interval);
      setIsActive(plan.is_active);
      setGrid(gridFromRows(features ?? []));
      setLoading(false);
    })();
  }, [id]);

  async function handleSave() {
    if (!name.trim()) {
      setError("Plan name is required.");
      return;
    }
    setSaving(true);
    setError("");
    const supabase = createSupabaseBrowserClient();

    const { error: planError } = await supabase
      .from("plans")
      .update({
        name: name.trim(),
        description: description.trim() || null,
        price_cents: Math.round(Number(price) * 100) || 0,
        billing_interval: interval,
        is_active: isActive,
      })
      .eq("id", id);

    if (planError) {
      setError(planError.message);
      setSaving(false);
      return;
    }

    const rows = FEATURE_KEYS.map((key) => ({
      plan_id: id,
      feature_key: key,
      enabled: grid[key].enabled,
      limit_value: grid[key].limit_value,
    }));
    const { error: featuresError } = await supabase
      .from("plan_features")
      .upsert(rows, { onConflict: "plan_id,feature_key" });

    setSaving(false);
    if (featuresError) {
      setError(featuresError.message);
      return;
    }
    router.push("/plans");
  }

  if (loading) {
    return (
      <div className="flex flex-col gap-4">
        <div className="h-8 w-64 skeleton rounded-lg" />
        <div className="h-96 skeleton rounded-2xl" />
      </div>
    );
  }

  if (notFound) {
    return <EmptyState message="Plan not found." />;
  }

  return (
    <div className="flex flex-col gap-8">
      <PageHeader title={`Edit ${name}`} description="Update pricing and default feature access." />

      <Card className="p-5 flex flex-col gap-4">
        <div className="grid sm:grid-cols-2 gap-4">
          <Input label="Plan Name" value={name} onChange={(e) => setName(e.target.value)} />
          <Input label="Price (USD)" type="number" min={0} value={price} onChange={(e) => setPrice(e.target.value)} />
        </div>
        <Input label="Description" value={description} onChange={(e) => setDescription(e.target.value)} />
        <div className="flex items-center gap-6">
          <div className="flex flex-col gap-1.5">
            <span className="text-xs font-mono tracking-[0.15em] uppercase text-muted">Billing Interval</span>
            <div className="flex gap-2">
              {(["month", "year"] as const).map((opt) => (
                <button
                  key={opt}
                  type="button"
                  onClick={() => setInterval(opt)}
                  className={`px-4 py-2 rounded-xl border text-xs font-mono uppercase tracking-wider transition-colors cursor-pointer ${
                    interval === opt ? "border-gold bg-gold/10 text-gold" : "border-cleo-border text-muted"
                  }`}
                >
                  {opt}ly
                </button>
              ))}
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Toggle checked={isActive} onChange={setIsActive} />
            <span className="text-sm text-ink">Active (visible for new signups)</span>
          </div>
        </div>
      </Card>

      <div>
        <h2 className="font-cinzel text-sm font-bold tracking-wide text-ink uppercase mb-3">Feature Access</h2>
        <PlanFeatureEditor value={grid} onChange={(key, patch) => setGrid((g) => ({ ...g, [key]: { ...g[key], ...patch } }))} />
      </div>

      {error && <p className="text-error text-sm font-mono">{error}</p>}

      <div className="flex justify-end gap-3">
        <Button variant="ghost" onClick={() => router.push("/plans")}>
          Cancel
        </Button>
        <Button onClick={handleSave} loading={saving}>
          Save Changes
        </Button>
      </div>
    </div>
  );
}
