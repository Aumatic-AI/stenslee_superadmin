"use client";

import { useEffect, useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase-client";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import EmptyState from "@/components/ui/EmptyState";
import AddCustomerModal from "@/features/customers/AddCustomerModal";

interface CustomerRow {
  id: string;
  name: string;
  phone: string;
  created_at: string;
}

interface Props {
  organizationId: string;
  organizationName: string;
}

export default function CustomersTab({ organizationId, organizationName }: Props) {
  const [customers, setCustomers] = useState<CustomerRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [addOpen, setAddOpen] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const supabase = createSupabaseBrowserClient();
    supabase
      .from("customers")
      .select("id, name, phone, created_at")
      .eq("organization_id", organizationId)
      .order("created_at", { ascending: false })
      .then(({ data }) => {
        if (cancelled) return;
        setCustomers(data ?? []);
        setLoading(false);
      });
    return () => { cancelled = true; };
  }, [organizationId]);

  return (
    <Card className="p-5 flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h2 className="font-cinzel text-sm font-bold tracking-wide text-ink uppercase">Customers</h2>
        <Button size="sm" onClick={() => setAddOpen(true)}>
          + Add Customer
        </Button>
      </div>

      {loading ? (
        <div className="flex flex-col gap-2">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-12 skeleton rounded-xl" />
          ))}
        </div>
      ) : customers.length === 0 ? (
        <EmptyState message="No customers yet." />
      ) : (
        <div className="flex flex-col divide-y divide-cleo-border">
          {customers.map((c) => (
            <div key={c.id} className="flex items-center justify-between py-3">
              <div className="min-w-0">
                <p className="text-ink text-sm font-semibold truncate">{c.name}</p>
                <p className="text-muted text-xs font-mono truncate">{c.phone}</p>
              </div>
              <p className="text-muted text-xs font-mono shrink-0">
                {new Date(c.created_at).toLocaleDateString()}
              </p>
            </div>
          ))}
        </div>
      )}

      <AddCustomerModal
        open={addOpen}
        onClose={() => setAddOpen(false)}
        fixedOrganizationId={organizationId}
        fixedOrganizationName={organizationName}
        onCreated={(customer) => {
          setCustomers((prev) => [customer, ...prev]);
          setAddOpen(false);
        }}
      />
    </Card>
  );
}
