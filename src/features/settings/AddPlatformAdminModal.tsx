"use client";

import { useState } from "react";
import { DEFAULT_COUNTRY_CODE, isValidPhone, sanitizeCountryCodeInput, sanitizePhoneNumberInput } from "@/lib/phone";
import Modal from "@/components/ui/Modal";
import Input from "@/components/ui/Input";
import Button from "@/components/ui/Button";

export default function AddPlatformAdminModal({
  open,
  onClose,
  onCreated,
}: {
  open: boolean;
  onClose: () => void;
  onCreated: () => void;
}) {
  const [name, setName] = useState("");
  const [phoneCountryCode, setPhoneCountryCode] = useState(DEFAULT_COUNTRY_CODE);
  const [phoneNumber, setPhoneNumber] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim() || !isValidPhone(phoneCountryCode, phoneNumber)) {
      setError("Name and a valid phone number are required.");
      return;
    }
    setSaving(true);
    setError("");

    const res = await fetch("/api/platform-admins", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: name.trim(), phoneCountryCode, phoneNumber }),
    });
    const body = await res.json();
    setSaving(false);

    if (!res.ok) {
      setError(body.error ?? "Could not create the account.");
      return;
    }

    setName("");
    setPhoneCountryCode(DEFAULT_COUNTRY_CODE);
    setPhoneNumber("");
    onCreated();
  }

  return (
    <Modal open={open} onClose={onClose} title="Add Platform Admin">
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
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
        <Button type="submit" loading={saving} fullWidth>
          Create Account
        </Button>
      </form>
    </Modal>
  );
}
