"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { createSupabaseBrowserClient } from "@/lib/supabase-client";
import PageHeader from "@/components/ui/PageHeader";
import Card from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import EmptyState from "@/components/ui/EmptyState";

interface PlanRow {
  id: string;
  name: string;
  description: string | null;
  price_cents: number;
  billing_interval: string;
  is_active: boolean;
  orgCount: number;
}

function formatPrice(cents: number, interval: string) {
  if (cents === 0) return "Free";
  return `$${(cents / 100).toFixed(0)}/${interval === "month" ? "mo" : "yr"}`;
}

export default function PlansPage() {
  const [plans, setPlans] = useState<PlanRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const supabase = createSupabaseBrowserClient();
    (async () => {
      const { data: planRows } = await supabase
        .from("plans")
        .select("id, name, description, price_cents, billing_interval, is_active")
        .order("price_cents", { ascending: true });

      const { data: orgs } = await supabase.from("organizations").select("plan_id");
      const counts = new Map<string, number>();
      for (const org of orgs ?? []) {
        if (org.plan_id) counts.set(org.plan_id, (counts.get(org.plan_id) ?? 0) + 1);
      }

      setPlans(
        (planRows ?? []).map((p) => ({ ...p, orgCount: counts.get(p.id) ?? 0 }))
      );
      setLoading(false);
    })();
  }, []);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Plans"
        description="Subscription tiers and their default feature access."
        actions={
          <Link href="/plans/new">
            <Button>+ New Plan</Button>
          </Link>
        }
      />

      {loading ? (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-40 skeleton rounded-2xl" />
          ))}
        </div>
      ) : plans.length === 0 ? (
        <EmptyState message="No plans yet — create the first one." />
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {plans.map((plan) => (
            <Link key={plan.id} href={`/plans/${plan.id}`}>
              <Card className="p-5 flex flex-col gap-3 h-full hover:border-gold/40 transition-colors">
                <div className="flex items-start justify-between">
                  <h2 className="font-cinzel text-lg font-bold text-ink">{plan.name}</h2>
                  <Badge tone={plan.is_active ? "success" : "muted"}>{plan.is_active ? "Active" : "Retired"}</Badge>
                </div>
                <p className="text-gold font-mono text-xl font-bold">
                  {formatPrice(plan.price_cents, plan.billing_interval)}
                </p>
                {plan.description && <p className="text-muted text-sm line-clamp-2">{plan.description}</p>}
                <p className="text-muted text-xs font-mono mt-auto pt-2 border-t border-cleo-border">
                  {plan.orgCount} organization{plan.orgCount === 1 ? "" : "s"} on this plan
                </p>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
