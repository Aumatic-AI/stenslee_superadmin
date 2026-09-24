import StatCard from "@/components/ui/StatCard";

interface Props {
  sessionCount: number;
  customerCount: number;
  staffCount: number;
}

export default function AnalyticsTab({ sessionCount, customerCount, staffCount }: Props) {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
      <StatCard label="Sessions" value={sessionCount} accent />
      <StatCard label="Customers" value={customerCount} />
      <StatCard label="Staff" value={staffCount} />
    </div>
  );
}
