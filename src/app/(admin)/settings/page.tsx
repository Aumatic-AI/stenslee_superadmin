"use client";

import { useEffect, useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase-client";
import PageHeader from "@/components/ui/PageHeader";
import Card from "@/components/ui/Card";
import Input from "@/components/ui/Input";
import Button from "@/components/ui/Button";
import Badge from "@/components/ui/Badge";
import EmptyState from "@/components/ui/EmptyState";
import AddPlatformAdminModal from "@/features/settings/AddPlatformAdminModal";

interface Me {
  id: string;
  name: string;
  email: string;
}

interface AdminRow {
  id: string;
  name: string;
  email: string;
  is_active: boolean;
  created_at: string;
}

export default function SettingsPage() {
  const [me, setMe] = useState<Me | null>(null);
  const [admins, setAdmins] = useState<AdminRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [password, setPassword] = useState("");
  const [passwordStatus, setPasswordStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [passwordError, setPasswordError] = useState("");
  const [addOpen, setAddOpen] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      const supabase = createSupabaseBrowserClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user || cancelled) return;

      const [{ data: meRow }, { data: adminRows }] = await Promise.all([
        supabase.from("platform_admins").select("id, name, email").eq("id", user.id).maybeSingle(),
        supabase.from("platform_admins").select("id, name, email, is_active, created_at").order("created_at", { ascending: true }),
      ]);

      if (cancelled) return;
      setMe(meRow);
      setAdmins(adminRows ?? []);
      setLoading(false);
    }
    load();
    return () => { cancelled = true; };
  }, [refreshKey]);

  async function handlePasswordChange(e: React.FormEvent) {
    e.preventDefault();
    if (password.length < 6) {
      setPasswordStatus("error");
      setPasswordError("Password must be at least 6 characters.");
      return;
    }
    setPasswordStatus("saving");
    const supabase = createSupabaseBrowserClient();
    const { error } = await supabase.auth.updateUser({ password });
    if (error) {
      setPasswordStatus("error");
      setPasswordError(error.message);
      return;
    }
    setPassword("");
    setPasswordStatus("saved");
  }

  async function toggleAdminActive(admin: AdminRow) {
    const supabase = createSupabaseBrowserClient();
    await supabase.from("platform_admins").update({ is_active: !admin.is_active }).eq("id", admin.id);
    setAdmins((list) => list.map((a) => (a.id === admin.id ? { ...a, is_active: !a.is_active } : a)));
  }

  return (
    <div className="flex flex-col gap-8">
      <PageHeader title="Settings" description="Your profile and the platform admin roster." />

      <div className="grid lg:grid-cols-2 gap-6">
        <Card className="p-5 flex flex-col gap-4">
          <h2 className="font-cinzel text-sm font-bold tracking-wide text-ink uppercase">Profile</h2>
          {loading ? (
            <div className="h-16 skeleton rounded-xl" />
          ) : me ? (
            <div className="flex flex-col gap-1">
              <p className="text-ink text-sm font-semibold">{me.name}</p>
              <p className="text-muted text-xs font-mono">{me.email}</p>
            </div>
          ) : (
            <EmptyState message="Could not load your profile." />
          )}
        </Card>

        <Card className="p-5 flex flex-col gap-4">
          <h2 className="font-cinzel text-sm font-bold tracking-wide text-ink uppercase">Change Password</h2>
          <form onSubmit={handlePasswordChange} className="flex flex-col gap-3">
            <Input
              type="password"
              label="New Password"
              value={password}
              onChange={(e) => { setPassword(e.target.value); setPasswordStatus("idle"); }}
              placeholder="At least 6 characters"
            />
            {passwordStatus === "error" && <p className="text-error text-sm font-mono">{passwordError}</p>}
            {passwordStatus === "saved" && <p className="text-success text-sm font-mono">Password updated.</p>}
            <Button type="submit" loading={passwordStatus === "saving"}>
              Update Password
            </Button>
          </form>
        </Card>
      </div>

      <Card className="p-5 flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <h2 className="font-cinzel text-sm font-bold tracking-wide text-ink uppercase">Platform Admins</h2>
          <Button size="sm" onClick={() => setAddOpen(true)}>
            + Add Admin
          </Button>
        </div>
        {loading ? (
          <div className="h-24 skeleton rounded-xl" />
        ) : admins.length === 0 ? (
          <EmptyState message="No platform admins yet." />
        ) : (
          <div className="flex flex-col divide-y divide-cleo-border">
            {admins.map((admin) => (
              <div key={admin.id} className="flex items-center justify-between py-3">
                <div className="min-w-0">
                  <p className="text-ink text-sm font-semibold truncate">
                    {admin.name} {admin.id === me?.id && <span className="text-muted text-xs">(you)</span>}
                  </p>
                  <p className="text-muted text-xs font-mono truncate">{admin.email}</p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge tone={admin.is_active ? "success" : "muted"}>{admin.is_active ? "Active" : "Deactivated"}</Badge>
                  {admin.id !== me?.id && (
                    <button
                      onClick={() => toggleAdminActive(admin)}
                      className="text-muted hover:text-gold transition-colors text-xs font-mono tracking-wider px-2.5 py-1.5 rounded-lg border border-cleo-border cursor-pointer"
                    >
                      {admin.is_active ? "Deactivate" : "Reactivate"}
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      <AddPlatformAdminModal
        open={addOpen}
        onClose={() => setAddOpen(false)}
        onCreated={() => {
          setAddOpen(false);
          setRefreshKey((k) => k + 1);
        }}
      />
    </div>
  );
}
