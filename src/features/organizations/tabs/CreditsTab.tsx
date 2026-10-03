"use client";

import { useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase-client";

interface Props {
  organizationId: string;
  creditsRemaining: number;
  onUpdated: (newBalance: number) => void;
}

// Direct balance edit -- not a plan/feature toggle like the Permissions tab.
// This is a prepaid wallet that only ever depletes through actual image
// generation (reserve_ai_credits()/refund_ai_credits() in
// supabase-schema.sql, called only by the studio app's own server). A
// platform admin setting it here is the one legitimate way to top it up --
// covered by the existing "organizations: platform admin full access" RLS
// policy, same path updateStatus()/updatePlan() already use on this page.
export default function CreditsTab({ organizationId, creditsRemaining, onUpdated }: Props) {
  const [value, setValue] = useState(String(creditsRemaining));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);

  const parsed = Number(value);
  const canSave = value.trim() !== "" && Number.isInteger(parsed) && parsed >= 0 && parsed !== creditsRemaining;

  async function handleSave() {
    if (!canSave) return;
    setSaving(true);
    setError("");
    setSaved(false);

    const supabase = createSupabaseBrowserClient();
    const { error: updateError } = await supabase
      .from("organizations")
      .update({ ai_credits_remaining: parsed })
      .eq("id", organizationId);

    setSaving(false);
    if (updateError) {
      setError(updateError.message);
      return;
    }
    onUpdated(parsed);
    setSaved(true);
  }

  return (
    <div className="flex flex-col gap-5 max-w-md">
      <div>
        <h2 className="font-cinzel text-sm font-bold tracking-wide text-ink uppercase">AI Credits</h2>
        <p className="text-muted text-xs mt-1">
          10 credits per generated image, across AI Design, Rework, Flash Isolate, and Placement. Doesn&rsquo;t auto-refill on its own — top up here, or switch the org&rsquo;s plan on the Plans tab to reset it to that plan&rsquo;s included amount.
        </p>
      </div>

      <div className="bg-surface border border-cleo-border rounded-2xl p-6 flex flex-col items-center gap-1">
        <p className="font-cinzel text-4xl font-black text-gold">{creditsRemaining.toLocaleString()}</p>
        <p className="text-muted text-xs font-mono uppercase tracking-wider">credits remaining</p>
      </div>

      <div className="flex items-end gap-3">
        <label className="flex flex-col gap-1.5 flex-1">
          <span className="text-xs font-mono tracking-[0.15em] uppercase text-muted">Set balance</span>
          <input
            type="number"
            min={0}
            step={1}
            value={value}
            onChange={(e) => { setValue(e.target.value); setSaved(false); }}
            className="bg-surface border border-cleo-border rounded-xl px-4 py-2.5 text-ink text-sm font-mono focus:outline-none focus:border-gold transition-colors"
          />
        </label>
        <button
          onClick={handleSave}
          disabled={!canSave || saving}
          className="bg-gold text-bg font-cinzel font-bold text-xs tracking-[0.08em] uppercase px-5 py-2.5 rounded-xl border border-gold hover:bg-gold-light transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
        >
          {saving ? "Saving…" : "Save"}
        </button>
      </div>

      {error && <p className="text-error text-sm font-mono">{error}</p>}
      {saved && <p className="text-success text-sm font-mono">Balance updated.</p>}
    </div>
  );
}
