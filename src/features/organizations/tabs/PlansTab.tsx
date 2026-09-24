import Card from "@/components/ui/Card";

interface Plan {
  id: string;
  name: string;
}

interface Props {
  currentPlanId: string | null;
  plans: Plan[];
  saving: boolean;
  onSelectPlan: (planId: string) => void;
}

export default function PlansTab({ currentPlanId, plans, saving, onSelectPlan }: Props) {
  const current = plans.find((p) => p.id === currentPlanId);

  return (
    <Card className="p-5 flex flex-col gap-4 max-w-md">
      <div>
        <h2 className="font-cinzel text-sm font-bold tracking-wide text-ink uppercase">Current Plan</h2>
        <p className="text-gold text-lg font-cinzel font-bold mt-1">{current?.name ?? "No plan assigned"}</p>
      </div>
      <div className="flex flex-col gap-2">
        <span className="text-[11px] font-mono uppercase tracking-wider text-muted">Change Plan</span>
        {plans.map((plan) => (
          <button
            key={plan.id}
            onClick={() => onSelectPlan(plan.id)}
            disabled={saving}
            className={`text-left px-4 py-2.5 rounded-xl border text-sm transition-colors cursor-pointer disabled:opacity-50 ${
              currentPlanId === plan.id
                ? "border-gold bg-gold/10 text-gold"
                : "border-cleo-border text-ink hover:border-gold/40"
            }`}
          >
            {plan.name}
          </button>
        ))}
      </div>
    </Card>
  );
}
