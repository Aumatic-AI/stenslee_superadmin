"use client";

import { useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase-client";
import Modal from "@/components/ui/Modal";
import Input from "@/components/ui/Input";
import Button from "@/components/ui/Button";

interface CustomerRow {
  id: string;
  name: string;
  phone: string;
}

interface Props {
  customer: CustomerRow | null;
  onClose: () => void;
  onSaved: (customer: CustomerRow) => void;
}

function formatPhone(value: string) {
  const d = value.replace(/\D/g, "").slice(0, 10);
  if (d.length <= 3) return d;
  if (d.length <= 6) return `(${d.slice(0, 3)}) ${d.slice(3)}`;
  return `(${d.slice(0, 3)}) ${d.slice(3, 6)}-${d.slice(6)}`;
}

// Keyed by customer.id at the call site so this remounts fresh (via
// useState's lazy initializer) whenever a different customer is opened for
// editing, instead of syncing props into state via an effect.
export default function EditCustomerModal({ customer, onClose, onSaved }: Props) {
  const [name, setName] = useState(customer?.name ?? "");
  const [phone, setPhone] = useState(customer?.phone ?? "");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const canSubmit = name.trim().length > 0 && phone.replace(/\D/g, "").length === 10;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!customer || !canSubmit) return;
    setSaving(true);
    setError("");

    const supabase = createSupabaseBrowserClient();
    const { error: updateError } = await supabase
      .from("customers")
      .update({ name: name.trim(), phone })
      .eq("id", customer.id);

    setSaving(false);
    if (updateError) {
      setError(updateError.message);
      return;
    }

    onSaved({ id: customer.id, name: name.trim(), phone });
  }

  return (
    <Modal open={!!customer} onClose={onClose} title="Edit Customer">
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <Input label="Full Name" value={name} onChange={(e) => setName(e.target.value)} />
        <Input
          label="Phone"
          type="tel"
          inputMode="numeric"
          value={phone}
          onChange={(e) => setPhone(formatPhone(e.target.value))}
        />

        {error && <p className="text-error text-sm font-mono">{error}</p>}

        <Button type="submit" loading={saving} disabled={!canSubmit} fullWidth>
          Save Changes
        </Button>
      </form>
    </Modal>
  );
}
