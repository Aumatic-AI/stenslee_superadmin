"use client";

import { useEffect, useState } from "react";
import { createClient } from "@supabase/supabase-js";
import { createSupabaseBrowserClient } from "@/lib/supabase-client";
import Modal from "@/components/ui/Modal";
import Input from "@/components/ui/Input";
import Button from "@/components/ui/Button";
import Select from "@/components/ui/Select";

interface NewStaff {
  id: string;
  name: string;
  email: string;
  role: "admin" | "designer";
  organization_id: string;
}

interface Props {
  open: boolean;
  onClose: () => void;
  onCreated: (staff: NewStaff) => void;
  // When set, the organization is fixed (e.g. from an org's own detail
  // page) and no organization picker is shown.
  fixedOrganizationId?: string;
  fixedOrganizationName?: string;
}

// Stateless client (no session persistence) so signUp() below can't
// clobber the *acting* platform admin's own cookie-based session -- see
// AddPlatformAdminModal for the same pattern and rationale.
function createStatelessClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } }
  );
}

export default function AddStaffModal({ open, onClose, onCreated, fixedOrganizationId, fixedOrganizationName }: Props) {
  const [organizations, setOrganizations] = useState<{ value: string; label: string }[]>([]);
  const [organizationId, setOrganizationId] = useState(fixedOrganizationId ?? "");
  const [role, setRole] = useState<"admin" | "designer">("designer");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;

    async function init() {
      setName("");
      setEmail("");
      setPassword("");
      setRole("designer");
      setOrganizationId(fixedOrganizationId ?? "");
      setError("");

      if (fixedOrganizationId) return;

      const supabase = createSupabaseBrowserClient();
      const { data } = await supabase.from("organizations").select("id, name").order("name", { ascending: true });
      if (!cancelled) setOrganizations((data ?? []).map((o) => ({ value: o.id, label: o.name })));
    }
    init();
    return () => { cancelled = true; };
  }, [open, fixedOrganizationId]);

  const canSubmit = name.trim().length > 0 && email.trim().length > 0 && password.length >= 6 && organizationId.length > 0;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit) return;
    setSaving(true);
    setError("");

    const authClient = createStatelessClient();
    const { data, error: signUpError } = await authClient.auth.signUp({ email: email.trim(), password });

    if (signUpError || !data.user) {
      setError(signUpError?.message ?? "Could not create the account.");
      setSaving(false);
      return;
    }

    const supabase = createSupabaseBrowserClient();
    const { error: insertError } = await supabase.from("staff").insert({
      id: data.user.id,
      organization_id: organizationId,
      email: email.trim(),
      name: name.trim(),
      role,
    });

    setSaving(false);
    if (insertError) {
      setError(insertError.message);
      return;
    }

    onCreated({ id: data.user.id, name: name.trim(), email: email.trim(), role, organization_id: organizationId });
  }

  return (
    <Modal open={open} onClose={onClose} title="Add Designer">
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        {fixedOrganizationId ? (
          <div className="flex flex-col gap-1.5">
            <span className="text-xs font-mono tracking-[0.15em] uppercase text-muted">Organization</span>
            <p className="text-ink text-sm bg-surface-2 border border-cleo-border rounded-xl px-4 py-2.5">
              {fixedOrganizationName}
            </p>
          </div>
        ) : (
          <Select
            label="Organization"
            value={organizationId}
            onChange={setOrganizationId}
            options={organizations}
            placeholder="Select an organization…"
          />
        )}

        <div className="flex flex-col gap-1.5">
          <span className="text-xs font-mono tracking-[0.15em] uppercase text-muted">Role</span>
          <div className="flex gap-2">
            {(["designer", "admin"] as const).map((r) => (
              <button
                key={r}
                type="button"
                onClick={() => setRole(r)}
                className={`flex-1 px-4 py-2 rounded-xl border text-xs font-mono uppercase tracking-wider transition-colors cursor-pointer ${
                  role === r ? "border-gold bg-gold/10 text-gold" : "border-cleo-border text-muted"
                }`}
              >
                {r}
              </button>
            ))}
          </div>
        </div>

        <Input label="Name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Jane Doe" />
        <Input
          label="Email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="jane@studio.com"
        />
        <Input
          label="Temporary Password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="At least 6 characters"
        />
        <p className="text-muted text-xs">
          If this project requires email confirmation, they&apos;ll need to confirm before signing in.
        </p>

        {error && <p className="text-error text-sm font-mono">{error}</p>}

        <Button type="submit" loading={saving} disabled={!canSubmit} fullWidth>
          Create Account
        </Button>
      </form>
    </Modal>
  );
}
