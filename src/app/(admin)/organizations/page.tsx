"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createSupabaseBrowserClient } from "@/lib/supabase-client";
import PageHeader from "@/components/ui/PageHeader";
import Card from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import SearchInput from "@/components/ui/SearchInput";
import FilterChips from "@/components/ui/FilterChips";
import EmptyState from "@/components/ui/EmptyState";
import CreateOrganizationModal from "@/features/organizations/CreateOrganizationModal";

interface OrgRow {
  id: string;
  name: string;
  slug: string;
  status: string;
  created_at: string;
  plans: { name: string } | null;
}

const STATUS_FILTERS = ["all", "active", "suspended", "cancelled"] as const;

export default function OrganizationsPage() {
  const router = useRouter();
  const [orgs, setOrgs] = useState<OrgRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<(typeof STATUS_FILTERS)[number]>("all");
  const [createOpen, setCreateOpen] = useState(false);

  useEffect(() => {
    const supabase = createSupabaseBrowserClient();
    supabase
      .from("organizations")
      .select("id, name, slug, status, created_at, plans(name)")
      .order("created_at", { ascending: false })
      .then(({ data }) => {
        setOrgs((data as unknown as OrgRow[]) ?? []);
        setLoading(false);
      });
  }, []);

  const filtered = useMemo(() => {
    return orgs.filter((org) => {
      if (status !== "all" && org.status !== status) return false;
      if (search && !org.name.toLowerCase().includes(search.toLowerCase()) && !org.slug.toLowerCase().includes(search.toLowerCase())) {
        return false;
      }
      return true;
    });
  }, [orgs, search, status]);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Organizations"
        description="Every studio running on the Stenslee platform."
        actions={<Button onClick={() => setCreateOpen(true)}>+ New Organization</Button>}
      />

      <div className="flex flex-col sm:flex-row gap-3 sm:items-center">
        <SearchInput value={search} onChange={setSearch} placeholder="Search by name or slug…" />
        <FilterChips
          options={STATUS_FILTERS.map((s) => ({ value: s, label: s === "all" ? "All" : s }))}
          value={status}
          onChange={(v) => setStatus(v as typeof status)}
        />
      </div>

      <Card className="overflow-hidden">
        {loading ? (
          <div className="p-5 flex flex-col gap-3">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-14 skeleton rounded-xl" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <EmptyState message="No organizations match." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-cleo-border text-left text-muted text-xs font-mono uppercase tracking-wider">
                  <th className="px-5 py-3 font-medium">Name</th>
                  <th className="px-5 py-3 font-medium">Plan</th>
                  <th className="px-5 py-3 font-medium">Status</th>
                  <th className="px-5 py-3 font-medium">Created</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-cleo-border">
                {filtered.map((org) => (
                  <tr
                    key={org.id}
                    onClick={() => router.push(`/organizations/${org.id}`)}
                    className="cursor-pointer hover:bg-surface-2/50 transition-colors"
                  >
                    <td className="px-5 py-4">
                      <Link href={`/organizations/${org.id}`} className="text-ink font-semibold hover:text-gold transition-colors">
                        {org.name}
                      </Link>
                      <p className="text-muted text-xs font-mono">{org.slug}</p>
                    </td>
                    <td className="px-5 py-4 text-muted">{org.plans?.name ?? "—"}</td>
                    <td className="px-5 py-4">
                      <Badge tone={org.status === "active" ? "success" : org.status === "suspended" ? "error" : "muted"}>
                        {org.status}
                      </Badge>
                    </td>
                    <td className="px-5 py-4 text-muted text-xs font-mono">
                      {new Date(org.created_at).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <CreateOrganizationModal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        onCreated={(id) => {
          setCreateOpen(false);
          router.push(`/organizations/${id}`);
        }}
      />
    </div>
  );
}
