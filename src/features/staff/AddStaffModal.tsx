"use client";

import { useEffect, useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase-client";
import { DEFAULT_COUNTRY_CODE, isValidPhone, sanitizeCountryCodeInput, sanitizePhoneNumberInput } from "@/lib/phone";
import Modal from "@/components/ui/Modal";
import Input from "@/components/ui/Input";
import Button from "@/components/ui/Button";
import Select from "@/components/ui/Select";

interface NewStaff {
  id: string;
  name: string;
  phone: string;
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

export default function AddStaffModal({ open, onClose, onCreated, fixedOrganizationId, fixedOrganizationName }: Props) {
  const [organizations, setOrganizations] = useState<{ value: string; label: string }[]>([]);
  const [organizationId, setOrganizationId] = useState(fixedOrganizationId ?? "");
  const [role, setRole] = useState<"admin" | "designer">("designer");
  const [name, setName] = useState("");
  const [phoneCountryCode, setPhoneCountryCode] = useState(DEFAULT_COUNTRY_CODE);
  const [phoneNumber, setPhoneNumber] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;

    async function init() {
      setName("");
      setPhoneCountryCode(DEFAULT_COUNTRY_CODE);
      setPhoneNumber("");
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

  const canSubmit = name.trim().length > 0 && isValidPhone(phoneCountryCode, phoneNumber) && organizationId.length > 0;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit) return;
    setSaving(true);
    setError("");

    const res = await fetch("/api/staff", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: name.trim(), role, organizationId, phoneCountryCode, phoneNumber }),
    });
    const body = await res.json();
    setSaving(false);

    if (!res.ok) {
      setError(body.error ?? "Could not create the account.");
      return;
    }

    onCreated(body.staff as NewStaff);
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
        <div className="flex flex-col gap-1.5">
          <span className="text-xs font-mono tracking-[0.15em] uppercase text-muted">Phone Number</span>
          <div className="flex gap-2">
            <Input
              className="w-16 text-center"
              value={phoneCountryCode}
              onChange={(e) => setPhoneCountryCode(sanitizeCountryCodeInput(e.target.value))}
            />
            <Input
              className="flex-1"
              value={phoneNumber}
              onChange={(e) => setPhoneNumber(sanitizePhoneNumberInput(e.target.value))}
              placeholder="98765 43210"
            />
          </div>
        </div>
        <p className="text-muted text-xs">
          They&apos;ll log in with this phone number via a WhatsApp code.
        </p>

        {error && <p className="text-error text-sm font-mono">{error}</p>}

        <Button type="submit" loading={saving} disabled={!canSubmit} fullWidth>
          Create Account
        </Button>
      </form>
    </Modal>
  );
}
