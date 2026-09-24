"use client";

import { useEffect, useMemo, useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase-client";
import PageHeader from "@/components/ui/PageHeader";
import Card from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import SearchInput from "@/components/ui/SearchInput";
import Select from "@/components/ui/Select";
import EmptyState from "@/components/ui/EmptyState";
import AddStaffModal from "@/features/staff/AddStaffModal";

interface StaffRow {
  id: string;
  name: string;
  email: string;
  role: string;
  is_active: boolean;
  deleted_at: string | null;
  created_at: string;
  organization_id: string;
  organizations: { name: string } | null;
}

export default function DesignersPage() {
  const [staff, setStaff] = useState<StaffRow[]>([]);
  const [organizations, setOrganizations] = useState<{ value: string; label: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [orgFilter, setOrgFilter] = useState("");
  const [addOpen, setAddOpen] = useState(false);

  useEffect(() => {
    const supabase = createSupabaseBrowserClient();
    Promise.all([
      supabase
        .from("staff")
        .select("id, name, email, role, is_active, deleted_at, created_at, organization_id, organizations(name)")
        .order("created_at", { ascending: false })
        .limit(200),
      supabase.from("organizations").select("id, name").order("name", { ascending: true }),
    ]).then(([staffRes, orgsRes]) => {
      setStaff((staffRes.data as unknown as StaffRow[]) ?? []);
      setOrganizations((orgsRes.data ?? []).map((o) => ({ value: o.id, label: o.name })));
      setLoading(false);
    });
  }, []);

  const filtered = useMemo(() => {
    return staff.filter((s) => {
      if (orgFilter && s.organization_id !== orgFilter) return false;
      if (!search) return true;
      const q = search.toLowerCase();
      return s.name.toLowerCase().includes(q) || s.email.toLowerCase().includes(q) || s.organizations?.name.toLowerCase().includes(q);
    });
  }, [staff, search, orgFilter]);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Designers"
        description="Every studio's staff — designers and admins — across the platform."
        actions={<Button onClick={() => setAddOpen(true)}>+ Add Designer</Button>}
      />

      <div className="flex flex-col sm:flex-row gap-3 sm:items-center">
        <SearchInput value={search} onChange={setSearch} placeholder="Search by name, email, or studio…" />
        <Select
          value={orgFilter}
          onChange={setOrgFilter}
          options={[{ value: "", label: "All Organizations" }, ...organizations]}
          placeholder="All Organizations"
          className="sm:w-64"
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
          <EmptyState message="No staff match." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-cleo-border text-left text-muted text-xs font-mono uppercase tracking-wider">
                  <th className="px-5 py-3 font-medium">Name</th>
                  <th className="px-5 py-3 font-medium">Role</th>
                  <th className="px-5 py-3 font-medium">Organization</th>
                  <th className="px-5 py-3 font-medium">Status</th>
                  <th className="px-5 py-3 font-medium">Added</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-cleo-border">
                {filtered.map((s) => (
                  <tr key={s.id} className="hover:bg-surface-2/50 transition-colors">
                    <td className="px-5 py-4">
                      <p className="text-ink font-medium">{s.name}</p>
                      <p className="text-muted text-xs font-mono">{s.email}</p>
                    </td>
                    <td className="px-5 py-4">
                      <Badge tone="muted">{s.role}</Badge>
                    </td>
                    <td className="px-5 py-4 text-muted">{s.organizations?.name ?? "—"}</td>
                    <td className="px-5 py-4">
                      {s.deleted_at ? (
                        <Badge tone="error">Removed</Badge>
                      ) : !s.is_active ? (
                        <Badge tone="error">Inactive</Badge>
                      ) : (
                        <Badge tone="success">Active</Badge>
                      )}
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

      <AddStaffModal
        open={addOpen}
        onClose={() => setAddOpen(false)}
        onCreated={(newStaff) => {
          const org = organizations.find((o) => o.value === newStaff.organization_id);
          setStaff((prev) => [
            {
              id: newStaff.id,
              name: newStaff.name,
              email: newStaff.email,
              role: newStaff.role,
              is_active: true,
              deleted_at: null,
              created_at: new Date().toISOString(),
              organization_id: newStaff.organization_id,
              organizations: org ? { name: org.label } : null,
            },
            ...prev,
          ]);
          setAddOpen(false);
        }}
      />
    </div>
  );
}
