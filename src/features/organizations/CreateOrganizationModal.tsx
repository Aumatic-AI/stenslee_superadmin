"use client";

import { useEffect, useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase-client";
import Modal from "@/components/ui/Modal";
import Input from "@/components/ui/Input";
import Button from "@/components/ui/Button";

interface Plan {
  id: string;
  name: string;
}

function slugify(name: string) {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

export default function CreateOrganizationModal({
  open,
  onClose,
  onCreated,
}: {
  open: boolean;
  onClose: () => void;
  onCreated: (id: string) => void;
}) {
  const [plans, setPlans] = useState<Plan[]>([]);
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [slugTouched, setSlugTouched] = useState(false);
  const [planId, setPlanId] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;

    async function init() {
      setName("");
      setSlug("");
      setSlugTouched(false);
      setPlanId("");
      setError("");

      const supabase = createSupabaseBrowserClient();
      const { data } = await supabase
        .from("plans")
        .select("id, name")
        .eq("is_active", true)
        .order("price_cents", { ascending: true });

      if (!cancelled) setPlans(data ?? []);
    }
    init();
    return () => { cancelled = true; };
  }, [open]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim() || !slug.trim()) {
      setError("Name and slug are required.");
      return;
    }
    setSaving(true);
    setError("");

    const supabase = createSupabaseBrowserClient();
    const { data, error: insertError } = await supabase
      .from("organizations")
      .insert({
        name: name.trim(),
        slug: slug.trim(),
        plan_id: planId || null,
      })
      .select("id")
      .single();

    if (insertError) {
      setError(insertError.message);
      setSaving(false);
      return;
    }

    setSaving(false);
    onCreated(data.id);
  }

  return (
    <Modal open={open} onClose={onClose} title="New Organization">
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <Input
          label="Studio Name"
          value={name}
          onChange={(e) => {
            setName(e.target.value);
            if (!slugTouched) setSlug(slugify(e.target.value));
          }}
          placeholder="e.g. Golden Needle Tattoo"
        />
        <Input
          label="Slug"
          value={slug}
          onChange={(e) => {
            setSlug(slugify(e.target.value));
            setSlugTouched(true);
          }}
          placeholder="golden-needle-tattoo"
        />
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-mono tracking-[0.15em] uppercase text-muted">Plan</label>
          <div className="flex flex-col gap-2">
            {plans.map((plan) => (
              <button
                type="button"
                key={plan.id}
                onClick={() => setPlanId(plan.id)}
                className={`text-left px-4 py-2.5 rounded-xl border text-sm transition-colors cursor-pointer ${
                  planId === plan.id
                    ? "border-gold bg-gold/10 text-gold"
                    : "border-cleo-border text-ink hover:border-gold/40"
                }`}
              >
                {plan.name}
              </button>
            ))}
            {plans.length === 0 && (
              <p className="text-muted text-xs">No active plans yet — create one first, or leave unassigned.</p>
            )}
          </div>
        </div>

        {error && <p className="text-error text-sm font-mono">{error}</p>}

        <Button type="submit" loading={saving} fullWidth>
          Create Organization
        </Button>
      </form>
    </Modal>
  );
}
