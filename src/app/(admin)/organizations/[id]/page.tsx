"use client";

import { useEffect, useState, use } from "react";
import Link from "next/link";
import { createSupabaseBrowserClient } from "@/lib/supabase-client";
import PageHeader from "@/components/ui/PageHeader";
import Card from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import StatCard from "@/components/ui/StatCard";
import EmptyState from "@/components/ui/EmptyState";
import AddStaffModal from "@/features/staff/AddStaffModal";

interface Org {
  id: string;
  name: string;
  slug: string;
  status: string;
  plan_id: string | null;
  created_at: string;
}

interface Plan {
  id: string;
  name: string;
}

interface StaffRow {
  id: string;
  name: string;
  email: string;
  role: string;
  is_active: boolean;
  deleted_at: string | null;
}

export default function OrganizationDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [org, setOrg] = useState<Org | null>(null);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [staff, setStaff] = useState<StaffRow[]>([]);
  const [sessionCount, setSessionCount] = useState(0);
  const [customerCount, setCustomerCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [savingStatus, setSavingStatus] = useState(false);
  const [savingPlan, setSavingPlan] = useState(false);
  const [addStaffOpen, setAddStaffOpen] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      const supabase = createSupabaseBrowserClient();
      const [{ data: orgData }, { data: planData }, { data: staffData }, { count: sessions }, { count: customers }] =
        await Promise.all([
          supabase.from("organizations").select("id, name, slug, status, plan_id, created_at").eq("id", id).maybeSingle(),
          supabase.from("plans").select("id, name").eq("is_active", true).order("price_cents", { ascending: true }),
          supabase
            .from("staff")
            .select("id, name, email, role, is_active, deleted_at")
            .eq("organization_id", id)
            .order("created_at", { ascending: true }),
          supabase.from("sessions").select("id", { count: "exact", head: true }).eq("organization_id", id).is("deleted_at", null),
          supabase.from("customers").select("id", { count: "exact", head: true }).eq("organization_id", id),
        ]);

      if (cancelled) return;
      setOrg(orgData ?? null);
      setPlans(planData ?? []);
      setStaff(staffData ?? []);
      setSessionCount(sessions ?? 0);
      setCustomerCount(customers ?? 0);
      setLoading(false);
    }
    load();
    return () => { cancelled = true; };
  }, [id]);

  async function updateStatus(status: string) {
    if (!org) return;
    setSavingStatus(true);
    const supabase = createSupabaseBrowserClient();
    const { error } = await supabase.from("organizations").update({ status }).eq("id", org.id);
    if (!error) setOrg({ ...org, status });
    setSavingStatus(false);
  }

  async function updatePlan(planId: string) {
    if (!org) return;
    setSavingPlan(true);
    const supabase = createSupabaseBrowserClient();
    const { error } = await supabase.from("organizations").update({ plan_id: planId }).eq("id", org.id);
    if (!error) setOrg({ ...org, plan_id: planId });
    setSavingPlan(false);
  }

  if (loading) {
    return (
      <div className="flex flex-col gap-4">
        <div className="h-8 w-64 skeleton rounded-lg" />
        <div className="h-40 skeleton rounded-2xl" />
      </div>
    );
  }

  if (!org) {
    return <EmptyState message="Organization not found." />;
  }

  const activeStaff = staff.filter((s) => !s.deleted_at);

  return (
    <div className="flex flex-col gap-8">
      <PageHeader
        title={org.name}
        description={org.slug}
        actions={
          <Link href={`/permissions?org=${org.id}`}>
            <Button variant="outline">Manage Overrides →</Button>
          </Link>
        }
      />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Sessions" value={sessionCount} />
        <StatCard label="Customers" value={customerCount} />
        <StatCard label="Staff" value={activeStaff.length} />
        <StatCard label="Status" value={org.status} accent={org.status === "active"} />
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        <Card className="p-5 flex flex-col gap-4">
          <h2 className="font-cinzel text-sm font-bold tracking-wide text-ink uppercase">Plan</h2>
          <div className="flex flex-col gap-2">
            {plans.map((plan) => (
              <button
                key={plan.id}
                onClick={() => updatePlan(plan.id)}
                disabled={savingPlan}
                className={`text-left px-4 py-2.5 rounded-xl border text-sm transition-colors cursor-pointer disabled:opacity-50 ${
                  org.plan_id === plan.id
                    ? "border-gold bg-gold/10 text-gold"
                    : "border-cleo-border text-ink hover:border-gold/40"
                }`}
              >
                {plan.name}
              </button>
            ))}
          </div>
        </Card>

        <Card className="p-5 flex flex-col gap-4">
          <h2 className="font-cinzel text-sm font-bold tracking-wide text-ink uppercase">Status</h2>
          <div className="flex flex-wrap gap-2">
            {["active", "suspended", "cancelled"].map((s) => (
              <button
                key={s}
                onClick={() => updateStatus(s)}
                disabled={savingStatus}
                className={`px-4 py-2 rounded-xl border text-xs font-mono uppercase tracking-wider transition-colors cursor-pointer disabled:opacity-50 ${
                  org.status === s
                    ? s === "active"
                      ? "border-success bg-success/10 text-success"
                      : s === "suspended"
                      ? "border-error bg-error/10 text-error"
                      : "border-muted bg-surface-2 text-muted"
                    : "border-cleo-border text-muted hover:border-gold/40"
                }`}
              >
                {s}
              </button>
            ))}
          </div>
          <p className="text-muted text-xs">
            Suspending blocks staff sign-in at the studio app; cancelling is intended for offboarded studios.
          </p>
        </Card>
      </div>

      <Card className="p-5 flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <h2 className="font-cinzel text-sm font-bold tracking-wide text-ink uppercase">Staff</h2>
          <Button size="sm" onClick={() => setAddStaffOpen(true)}>
            + Add Designer
          </Button>
        </div>
        {staff.length === 0 ? (
          <EmptyState message="No staff accounts yet." />
        ) : (
          <div className="flex flex-col divide-y divide-cleo-border">
            {staff.map((member) => (
              <div key={member.id} className="flex items-center justify-between py-3">
                <div className="min-w-0">
                  <p className="text-ink text-sm font-semibold truncate">{member.name}</p>
                  <p className="text-muted text-xs font-mono truncate">{member.email}</p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge tone="muted">{member.role}</Badge>
                  {member.deleted_at ? (
                    <Badge tone="error">Removed</Badge>
                  ) : !member.is_active ? (
                    <Badge tone="error">Inactive</Badge>
                  ) : (
                    <Badge tone="success">Active</Badge>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      <AddStaffModal
        open={addStaffOpen}
        onClose={() => setAddStaffOpen(false)}
        fixedOrganizationId={org.id}
        fixedOrganizationName={org.name}
        onCreated={(newStaff) => {
          setStaff((prev) => [
            ...prev,
            {
              id: newStaff.id,
              name: newStaff.name,
              email: newStaff.email,
              role: newStaff.role,
              is_active: true,
              deleted_at: null,
            },
          ]);
          setAddStaffOpen(false);
        }}
      />
    </div>
  );
}
