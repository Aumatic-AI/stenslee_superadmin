"use client";

import { useEffect, useMemo, useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase-client";
import PageHeader from "@/components/ui/PageHeader";
import Card from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";
import SearchInput from "@/components/ui/SearchInput";
import FilterChips from "@/components/ui/FilterChips";
import EmptyState from "@/components/ui/EmptyState";

interface SessionRow {
  id: string;
  style: string | null;
  description: string | null;
  flow_type: string;
  status: string;
  created_at: string;
  organizations: { name: string } | null;
  customers: { name: string; phone: string } | null;
}

const STATUS_FILTERS = ["all", "active", "completed", "abandoned"] as const;

export default function SessionsPage() {
  const [sessions, setSessions] = useState<SessionRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<(typeof STATUS_FILTERS)[number]>("all");

  useEffect(() => {
    const supabase = createSupabaseBrowserClient();
    supabase
      .from("sessions")
      .select("id, style, description, flow_type, status, created_at, organizations(name), customers(name, phone)")
      .is("deleted_at", null)
      .order("created_at", { ascending: false })
      .limit(200)
      .then(({ data }) => {
        setSessions((data as unknown as SessionRow[]) ?? []);
        setLoading(false);
      });
  }, []);

  const filtered = useMemo(() => {
    return sessions.filter((s) => {
      if (status !== "all" && s.status !== status) return false;
      if (search) {
        const haystack = `${s.organizations?.name ?? ""} ${s.customers?.name ?? ""} ${s.style ?? ""}`.toLowerCase();
        if (!haystack.includes(search.toLowerCase())) return false;
      }
      return true;
    });
  }, [sessions, search, status]);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="Sessions" description="Every tattoo design session across every studio (read-only)." />

      <div className="flex flex-col sm:flex-row gap-3 sm:items-center">
        <SearchInput value={search} onChange={setSearch} placeholder="Search org, customer, or style…" />
        <FilterChips
          options={STATUS_FILTERS.map((s) => ({ value: s, label: s === "all" ? "All" : s }))}
          value={status}
          onChange={(v) => setStatus(v as typeof status)}
        />
      </div>

      <Card className="overflow-hidden">
        {loading ? (
          <div className="p-5 flex flex-col gap-3">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-14 skeleton rounded-xl" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <EmptyState message="No sessions match." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-cleo-border text-left text-muted text-xs font-mono uppercase tracking-wider">
                  <th className="px-5 py-3 font-medium">Organization</th>
                  <th className="px-5 py-3 font-medium">Customer</th>
                  <th className="px-5 py-3 font-medium">Style</th>
                  <th className="px-5 py-3 font-medium">Flow</th>
                  <th className="px-5 py-3 font-medium">Status</th>
                  <th className="px-5 py-3 font-medium">Created</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-cleo-border">
                {filtered.map((s) => (
                  <tr key={s.id} className="hover:bg-surface-2/50 transition-colors">
                    <td className="px-5 py-4 text-ink font-medium">{s.organizations?.name ?? "—"}</td>
                    <td className="px-5 py-4 text-muted">{s.customers?.name ?? "—"}</td>
                    <td className="px-5 py-4 text-muted">{s.style ?? "—"}</td>
                    <td className="px-5 py-4">
                      <Badge tone="muted">{s.flow_type}</Badge>
                    </td>
                    <td className="px-5 py-4">
                      <Badge tone={s.status === "completed" ? "success" : s.status === "abandoned" ? "error" : "gold"}>
                        {s.status}
                      </Badge>
                    </td>
                    <td className="px-5 py-4 text-muted text-xs font-mono">
                      {new Date(s.created_at).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
