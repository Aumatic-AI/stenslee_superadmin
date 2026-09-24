"use client";

import { useEffect, useMemo, useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase-client";
import PageHeader from "@/components/ui/PageHeader";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import SearchInput from "@/components/ui/SearchInput";
import Select from "@/components/ui/Select";
import EmptyState from "@/components/ui/EmptyState";
import AddCustomerModal from "@/features/customers/AddCustomerModal";
import EditCustomerModal from "@/features/customers/EditCustomerModal";

interface CustomerRow {
  id: string;
  name: string;
  phone: string;
  created_at: string;
  organization_id: string;
  organizations: { name: string } | null;
}

export default function CustomersPage() {
  const [customers, setCustomers] = useState<CustomerRow[]>([]);
  const [organizations, setOrganizations] = useState<{ value: string; label: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [orgFilter, setOrgFilter] = useState("");
  const [addOpen, setAddOpen] = useState(false);
  const [editing, setEditing] = useState<CustomerRow | null>(null);

  useEffect(() => {
    const supabase = createSupabaseBrowserClient();
    Promise.all([
      supabase
        .from("customers")
        .select("id, name, phone, created_at, organization_id, organizations(name)")
        .order("created_at", { ascending: false })
        .limit(200),
      supabase.from("organizations").select("id, name").order("name", { ascending: true }),
    ]).then(([customersRes, orgsRes]) => {
      setCustomers((customersRes.data as unknown as CustomerRow[]) ?? []);
      setOrganizations((orgsRes.data ?? []).map((o) => ({ value: o.id, label: o.name })));
      setLoading(false);
    });
  }, []);

  const filtered = useMemo(() => {
    return customers.filter((c) => {
      if (orgFilter && c.organization_id !== orgFilter) return false;
      if (!search) return true;
      const q = search.toLowerCase();
      return c.name.toLowerCase().includes(q) || c.phone.includes(q) || c.organizations?.name.toLowerCase().includes(q);
    });
  }, [customers, search, orgFilter]);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Customers"
        description="Every studio's customer roster across the platform."
        actions={<Button onClick={() => setAddOpen(true)}>+ Add Customer</Button>}
      />

      <div className="flex flex-col sm:flex-row gap-3 sm:items-center">
        <SearchInput value={search} onChange={setSearch} placeholder="Search by name, phone, or studio…" />
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
          <EmptyState message="No customers match." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-cleo-border text-left text-muted text-xs font-mono uppercase tracking-wider">
                  <th className="px-5 py-3 font-medium">Name</th>
                  <th className="px-5 py-3 font-medium">Phone</th>
                  <th className="px-5 py-3 font-medium">Organization</th>
                  <th className="px-5 py-3 font-medium">Added</th>
                  <th className="px-5 py-3 font-medium"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-cleo-border">
                {filtered.map((c) => (
                  <tr key={c.id} className="hover:bg-surface-2/50 transition-colors">
                    <td className="px-5 py-4 text-ink font-medium">{c.name}</td>
                    <td className="px-5 py-4 text-muted font-mono">{c.phone}</td>
                    <td className="px-5 py-4 text-muted">{c.organizations?.name ?? "—"}</td>
                    <td className="px-5 py-4 text-muted text-xs font-mono">
                      {new Date(c.created_at).toLocaleDateString()}
                    </td>
                    <td className="px-5 py-4 text-right">
                      <button
                        onClick={() => setEditing(c)}
                        className="text-muted hover:text-gold transition-colors text-xs font-mono tracking-wider px-2.5 py-1.5 rounded-lg border border-cleo-border cursor-pointer"
                      >
                        Edit
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <AddCustomerModal
        open={addOpen}
        onClose={() => setAddOpen(false)}
        onCreated={(customer) => {
          const org = organizations.find((o) => o.value === customer.organization_id);
          setCustomers((prev) => [
            { ...customer, organizations: org ? { name: org.label } : null },
            ...prev,
          ]);
          setAddOpen(false);
        }}
      />

      <EditCustomerModal
        key={editing?.id ?? "none"}
        customer={editing}
        onClose={() => setEditing(null)}
        onSaved={(updated) => {
          setCustomers((prev) => prev.map((c) => (c.id === updated.id ? { ...c, ...updated } : c)));
          setEditing(null);
        }}
      />
    </div>
  );
}
