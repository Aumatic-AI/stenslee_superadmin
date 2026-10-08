"use client";

import { useEffect, useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase-client";
import Modal from "@/components/ui/Modal";
import Input from "@/components/ui/Input";
import Button from "@/components/ui/Button";
import Select from "@/components/ui/Select";
import { DEFAULT_COUNTRY_CODE, combinePhone, isValidPhone } from "@/lib/phone";
import PhoneInput from "@/components/ui/PhoneInput";

interface NewCustomer {
  id: string;
  name: string;
  phone: string;
  phone_country_code: string;
  phone_number: string;
  created_at: string;
  organization_id: string;
}

interface Props {
  open: boolean;
  onClose: () => void;
  onCreated: (customer: NewCustomer) => void;
  // When set, the organization is fixed (e.g. from an org's own detail
  // page) and no organization picker is shown -- mirrors AddStaffModal.
  fixedOrganizationId?: string;
  fixedOrganizationName?: string;
}

export default function AddCustomerModal({ open, onClose, onCreated, fixedOrganizationId, fixedOrganizationName }: Props) {
  const [organizations, setOrganizations] = useState<{ value: string; label: string }[]>([]);
  const [organizationId, setOrganizationId] = useState(fixedOrganizationId ?? "");
  const [name, setName] = useState("");
  const [countryCode, setCountryCode] = useState(DEFAULT_COUNTRY_CODE);
  const [phoneNumber, setPhoneNumber] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;

    async function init() {
      setName("");
      setCountryCode(DEFAULT_COUNTRY_CODE);
      setPhoneNumber("");
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

  const canSubmit = name.trim().length > 0 && isValidPhone(countryCode, phoneNumber) && organizationId.length > 0;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit) return;
    setSaving(true);
    setError("");

    const supabase = createSupabaseBrowserClient();
    const phone = combinePhone(countryCode, phoneNumber);

    const { data: existing } = await supabase
      .from("customers")
      .select("id, name")
      .eq("phone", phone)
      .eq("organization_id", organizationId)
      .maybeSingle();

    if (existing) {
      setSaving(false);
      setError(`A customer with this phone number already exists in that organization: ${existing.name}.`);
      return;
    }

    const { data: customer, error: insertError } = await supabase
      .from("customers")
      .insert({ name: name.trim(), phone_country_code: countryCode, phone_number: phoneNumber, organization_id: organizationId })
      .select("id, name, phone, phone_country_code, phone_number, created_at, organization_id")
      .single();

    setSaving(false);
    if (insertError || !customer) {
      setError(insertError?.message ?? "Couldn't create the customer.");
      return;
    }

    onCreated(customer);
  }

  return (
    <Modal open={open} onClose={onClose} title="Add Customer">
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
        <Input label="Full Name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Customer full name" />
        <div className="flex flex-col gap-1.5">
          <span className="text-xs font-mono tracking-[0.15em] uppercase text-muted">Phone</span>
          <PhoneInput
            countryCode={countryCode}
            phoneNumber={phoneNumber}
            onCountryCodeChange={setCountryCode}
            onPhoneNumberChange={setPhoneNumber}
          />
        </div>

        {error && <p className="text-error text-sm font-mono">{error}</p>}

        <Button type="submit" loading={saving} disabled={!canSubmit} fullWidth>
          Add Customer
        </Button>
      </form>
    </Modal>
  );
}
