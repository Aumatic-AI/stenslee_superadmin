"use client";

import { useEffect, useState, use } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase-client";
import PageHeader from "@/components/ui/PageHeader";
import EmptyState from "@/components/ui/EmptyState";
import Tabs, { type TabDef } from "@/components/ui/Tabs";
import AnalyticsTab from "@/features/organizations/tabs/AnalyticsTab";
import PlansTab from "@/features/organizations/tabs/PlansTab";
import PermissionsTab from "@/features/organizations/tabs/PermissionsTab";
import StaffTab from "@/features/organizations/tabs/StaffTab";
import CustomersTab from "@/features/organizations/tabs/CustomersTab";
import LibraryTab from "@/features/organizations/tabs/LibraryTab";

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

const TABS: TabDef[] = [
  { key: "analytics", label: "Analytics" },
  { key: "plans", label: "Plans" },
  { key: "permissions", label: "Permissions" },
  { key: "staff", label: "Staff" },
  { key: "customers", label: "Customers" },
  { key: "library", label: "Library" },
];

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

  const [activeTab, setActiveTab] = useState("analytics");
  // Tabs stay mounted (just hidden) once opened, rather than unmounting on
  // switch away -- Permissions/Customers do their own fetching and the
  // Permissions tab can hold unsaved edits, which a full unmount would
  // silently discard the moment you looked at another tab.
  const [visitedTabs, setVisitedTabs] = useState<Set<string>>(new Set(["analytics"]));

  function selectTab(key: string) {
    setActiveTab(key);
    setVisitedTabs((prev) => (prev.has(key) ? prev : new Set(prev).add(key)));
  }

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

  const activeStaffCount = staff.filter((s) => !s.deleted_at).length;

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title={org.name} description={org.slug} />

      <Tabs tabs={TABS} active={activeTab} onChange={selectTab} />

      <div className={activeTab === "analytics" ? "" : "hidden"}>
        <AnalyticsTab sessionCount={sessionCount} customerCount={customerCount} staffCount={activeStaffCount} />
      </div>

      {visitedTabs.has("plans") && (
        <div className={activeTab === "plans" ? "" : "hidden"}>
          <PlansTab currentPlanId={org.plan_id} plans={plans} saving={savingPlan} onSelectPlan={updatePlan} />
        </div>
      )}

      {visitedTabs.has("permissions") && (
        <div className={activeTab === "permissions" ? "" : "hidden"}>
          <PermissionsTab
            organizationId={org.id}
            planId={org.plan_id}
            status={org.status}
            savingStatus={savingStatus}
            onUpdateStatus={updateStatus}
          />
        </div>
      )}

      {visitedTabs.has("staff") && (
        <div className={activeTab === "staff" ? "" : "hidden"}>
          <StaffTab
            organizationId={org.id}
            organizationName={org.name}
            staff={staff}
            onStaffAdded={(newStaff) => setStaff((prev) => [...prev, newStaff])}
          />
        </div>
      )}

      {visitedTabs.has("customers") && (
        <div className={activeTab === "customers" ? "" : "hidden"}>
          <CustomersTab organizationId={org.id} organizationName={org.name} />
        </div>
      )}

      {visitedTabs.has("library") && (
        <div className={activeTab === "library" ? "" : "hidden"}>
          <LibraryTab organizationId={org.id} />
        </div>
      )}
    </div>
  );
}
