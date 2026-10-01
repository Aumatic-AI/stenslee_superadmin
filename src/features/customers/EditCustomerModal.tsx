"use client";

import { useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase-client";
import Modal from "@/components/ui/Modal";
import Input from "@/components/ui/Input";
import Button from "@/components/ui/Button";
import { combinePhone, isValidPhone, sanitizeCountryCodeInput, sanitizePhoneNumberInput } from "@/lib/phone";

interface CustomerRow {
  id: string;
  name: string;
  phone: string;
  phone_country_code: string;
  phone_number: string;
}

interface Props {
  customer: CustomerRow | null;
  onClose: () => void;
  onSaved: (customer: CustomerRow) => void;
}

// Keyed by customer.id at the call site so this remounts fresh (via
// useState's lazy initializer) whenever a different customer is opened for
// editing, instead of syncing props into state via an effect.
export default function EditCustomerModal({ customer, onClose, onSaved }: Props) {
  const [name, setName] = useState(customer?.name ?? "");
  const [countryCode, setCountryCode] = useState(customer?.phone_country_code ?? "");
  const [phoneNumber, setPhoneNumber] = useState(customer?.phone_number ?? "");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const canSubmit = name.trim().length > 0 && isValidPhone(countryCode, phoneNumber);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!customer || !canSubmit) return;
    setSaving(true);
    setError("");

    const supabase = createSupabaseBrowserClient();
    const { error: updateError } = await supabase
      .from("customers")
      .update({ name: name.trim(), phone_country_code: countryCode, phone_number: phoneNumber })
      .eq("id", customer.id);

    setSaving(false);
    if (updateError) {
      setError(updateError.message);
      return;
    }

    onSaved({
      id: customer.id,
      name: name.trim(),
      phone_country_code: countryCode,
      phone_number: phoneNumber,
      phone: combinePhone(countryCode, phoneNumber),
    });
  }

  return (
    <Modal open={!!customer} onClose={onClose} title="Edit Customer">
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <Input label="Full Name" value={name} onChange={(e) => setName(e.target.value)} />
        <div className="flex flex-col gap-1.5">
          <span className="text-xs font-mono tracking-[0.15em] uppercase text-muted">Phone</span>
          <div className="flex gap-2">
            <Input
              type="tel"
              inputMode="tel"
              value={countryCode}
              onChange={(e) => setCountryCode(sanitizeCountryCodeInput(e.target.value))}
              placeholder="+91"
              className="w-20 flex-shrink-0 text-center"
            />
            <Input
              type="tel"
              inputMode="numeric"
              value={phoneNumber}
              onChange={(e) => setPhoneNumber(sanitizePhoneNumberInput(e.target.value))}
              placeholder="98765 43210"
              className="flex-1 min-w-0"
            />
          </div>
        </div>

        {error && <p className="text-error text-sm font-mono">{error}</p>}

        <Button type="submit" loading={saving} disabled={!canSubmit} fullWidth>
          Save Changes
        </Button>
      </form>
    </Modal>
  );
}
