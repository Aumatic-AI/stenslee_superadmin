"use client";

import { useState } from "react";
import { createClient } from "@supabase/supabase-js";
import { createSupabaseBrowserClient } from "@/lib/supabase-client";
import Modal from "@/components/ui/Modal";
import Input from "@/components/ui/Input";
import Button from "@/components/ui/Button";

// A stateless client (no session persistence) so signUp() below can't
// clobber the *current* platform admin's own cookie-based session — signUp
// signs the browser in as the newly created user by default, which would
// otherwise silently switch the person filling out this form to the new
// account they just created.
function createStatelessClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } }
  );
}

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
    if (!name.trim() || !email.trim() || password.length < 6) {
      setError("Name, email, and a password of at least 6 characters are required.");
      return;
    }
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
    const { error: insertError } = await supabase.from("platform_admins").insert({
      id: data.user.id,
      email: email.trim(),
      name: name.trim(),
    });

    setSaving(false);
    if (insertError) {
      setError(insertError.message);
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
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="At least 6 characters"
        />
        <p className="text-muted text-xs">
          If this project requires email confirmation, they&apos;ll need to confirm before signing in.
        </p>
        {error && <p className="text-error text-sm font-mono">{error}</p>}
        <Button type="submit" loading={saving} fullWidth>
          Create Account
        </Button>
      </form>
    </Modal>
  );
}
