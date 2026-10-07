"use client";

import { useState } from "react";
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
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim() || !email.trim() || password.length < 8) {
      setError("Name, email, and a password of at least 8 characters are required.");
      return;
    }
    setSaving(true);
    setError("");

    const res = await fetch("/api/platform-admins", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: name.trim(), email: email.trim(), password }),
    });
    const body = await res.json();
    setSaving(false);

    if (!res.ok) {
      setError(body.error ?? "Could not create the account.");
      return;
    }

    setName("");
    setEmail("");
    setPassword("");
    onCreated();
  }

  return (
    <Modal open={open} onClose={onClose} title="Add Platform Admin">
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <Input label="Name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Jane Doe" />
        <Input
          label="Email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="jane@stenslee.com"
        />
        <Input
          label="Temporary Password"
          type="password"
          autoComplete="new-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="At least 8 characters"
        />
        <p className="text-muted text-xs">
          Share these with them; they can change the password in Settings after signing in.
        </p>
        {error && <p className="text-error text-sm font-mono">{error}</p>}
        <Button type="submit" loading={saving} fullWidth>
          Create Account
        </Button>
      </form>
    </Modal>
  );
}
