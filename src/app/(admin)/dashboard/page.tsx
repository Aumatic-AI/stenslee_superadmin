"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { createSupabaseBrowserClient } from "@/lib/supabase-client";
import PageHeader from "@/components/ui/PageHeader";
import StatCard from "@/components/ui/StatCard";
import Card from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";
import EmptyState from "@/components/ui/EmptyState";

interface Kpis {
  organizations: number;
  activeOrganizations: number;
  staff: number;
  sessions: number;
  customers: number;
  plans: number;
}

interface OrgRow {
  id: string;
  name: string;
  slug: string;
  status: string;
  created_at: string;
  plans: { name: string } | null;
}

export default function DashboardPage() {
  const [kpis, setKpis] = useState<Kpis | null>(null);
  const [recentOrgs, setRecentOrgs] = useState<OrgRow[]>([]);
  const [attentionOrgs, setAttentionOrgs] = useState<OrgRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const supabase = createSupabaseBrowserClient();
    let cancelled = false;

    async function load() {
      const [
        { count: orgCount },
        { count: activeOrgCount },
        { count: staffCount },
        { count: sessionCount },
        { count: customerCount },
        { count: planCount },
        { data: recent },
        { data: attention },
      ] = await Promise.all([
        supabase.from("organizations").select("id", { count: "exact", head: true }),
        supabase.from("organizations").select("id", { count: "exact", head: true }).eq("status", "active"),
        supabase.from("staff").select("id", { count: "exact", head: true }).is("deleted_at", null),
        supabase.from("sessions").select("id", { count: "exact", head: true }).is("deleted_at", null),
        supabase.from("customers").select("id", { count: "exact", head: true }),
        supabase.from("plans").select("id", { count: "exact", head: true }).eq("is_active", true),
        supabase
          .from("organizations")
          .select("id, name, slug, status, created_at, plans(name)")
          .order("created_at", { ascending: false })
          .limit(8),
        supabase
          .from("organizations")
          .select("id, name, slug, status, created_at, plans(name)")
          .or("status.eq.suspended,plan_id.is.null")
          .limit(8),
      ]);

      if (cancelled) return;
      setKpis({
        organizations: orgCount ?? 0,
        activeOrganizations: activeOrgCount ?? 0,
        staff: staffCount ?? 0,
        sessions: sessionCount ?? 0,
        customers: customerCount ?? 0,
        plans: planCount ?? 0,
      });
      setRecentOrgs((recent as unknown as OrgRow[]) ?? []);
      setAttentionOrgs((attention as unknown as OrgRow[]) ?? []);
      setLoading(false);
    }
    load();
    return () => { cancelled = true; };
  }, []);

  return (
    <div className="flex flex-col gap-8">
      <PageHeader title="Dashboard" description="Platform-wide overview across every studio." />

      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
        <StatCard label="Organizations" value={loading ? "—" : kpis!.organizations} accent />
        <StatCard label="Active Orgs" value={loading ? "—" : kpis!.activeOrganizations} />
        <StatCard label="Total Staff" value={loading ? "—" : kpis!.staff} />
        <StatCard label="Sessions" value={loading ? "—" : kpis!.sessions} />
        <StatCard label="Customers" value={loading ? "—" : kpis!.customers} />
        <StatCard label="Active Plans" value={loading ? "—" : kpis!.plans} />
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        <Card className="p-5 flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <h2 className="font-cinzel text-sm font-bold tracking-wide text-ink uppercase">Recent Organizations</h2>
            <Link href="/organizations" className="text-xs text-gold hover:text-gold-light transition-colors">
              View all →
            </Link>
          </div>
          {recentOrgs.length === 0 && !loading ? (
            <EmptyState message="No organizations yet." />
          ) : (
            <div className="flex flex-col divide-y divide-cleo-border">
              {recentOrgs.map((org) => (
                <Link
                  key={org.id}
                  href={`/organizations/${org.id}`}
                  className="flex items-center justify-between py-3 hover:bg-surface-2/50 -mx-2 px-2 rounded-lg transition-colors"
                >
                  <div className="min-w-0">
                    <p className="text-ink text-sm font-semibold truncate">{org.name}</p>
                    <p className="text-muted text-xs font-mono truncate">{org.plans?.name ?? "No plan"}</p>
                  </div>
                  <Badge tone={org.status === "active" ? "success" : org.status === "suspended" ? "error" : "muted"}>
                    {org.status}
                  </Badge>
                </Link>
              ))}
            </div>
          )}
        </Card>

        <Card className="p-5 flex flex-col gap-4">
          <h2 className="font-cinzel text-sm font-bold tracking-wide text-ink uppercase">Needs Attention</h2>
          {attentionOrgs.length === 0 && !loading ? (
            <EmptyState message="Nothing needs attention right now." />
          ) : (
            <div className="flex flex-col divide-y divide-cleo-border">
              {attentionOrgs.map((org) => (
                <Link
                  key={org.id}
                  href={`/organizations/${org.id}`}
                  className="flex items-center justify-between py-3 hover:bg-surface-2/50 -mx-2 px-2 rounded-lg transition-colors"
                >
                  <div className="min-w-0">
                    <p className="text-ink text-sm font-semibold truncate">{org.name}</p>
                    <p className="text-muted text-xs font-mono truncate">
                      {org.plans?.name ?? "No plan assigned"}
                    </p>
                  </div>
                  <Badge tone={org.status === "suspended" ? "error" : "gold"}>
                    {org.status === "suspended" ? "Suspended" : "No Plan"}
                  </Badge>
                </Link>
              ))}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
