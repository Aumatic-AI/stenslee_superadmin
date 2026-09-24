"use client";

import { useState } from "react";
import Card from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import EmptyState from "@/components/ui/EmptyState";
import AddStaffModal from "@/features/staff/AddStaffModal";

interface StaffRow {
  id: string;
  name: string;
  email: string;
  role: string;
  is_active: boolean;
  deleted_at: string | null;
}

interface Props {
  organizationId: string;
  organizationName: string;
  staff: StaffRow[];
  onStaffAdded: (staff: StaffRow) => void;
}

export default function StaffTab({ organizationId, organizationName, staff, onStaffAdded }: Props) {
  const [addOpen, setAddOpen] = useState(false);

  return (
    <Card className="p-5 flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h2 className="font-cinzel text-sm font-bold tracking-wide text-ink uppercase">Staff</h2>
        <Button size="sm" onClick={() => setAddOpen(true)}>
          + Add Designer
        </Button>
      </div>
      {staff.length === 0 ? (
        <EmptyState message="No staff accounts yet." />
      ) : (
        <div className="flex flex-col divide-y divide-cleo-border">
          {staff.map((member) => (
            <div key={member.id} className="flex items-center justify-between py-3">
              <div className="min-w-0">
                <p className="text-ink text-sm font-semibold truncate">{member.name}</p>
                <p className="text-muted text-xs font-mono truncate">{member.email}</p>
              </div>
              <div className="flex items-center gap-2">
                <Badge tone="muted">{member.role}</Badge>
                {member.deleted_at ? (
                  <Badge tone="error">Removed</Badge>
                ) : !member.is_active ? (
                  <Badge tone="error">Inactive</Badge>
                ) : (
                  <Badge tone="success">Active</Badge>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      <AddStaffModal
        open={addOpen}
        onClose={() => setAddOpen(false)}
        fixedOrganizationId={organizationId}
        fixedOrganizationName={organizationName}
        onCreated={(newStaff) => {
          onStaffAdded({
            id: newStaff.id,
            name: newStaff.name,
            email: newStaff.email,
            role: newStaff.role,
            is_active: true,
            deleted_at: null,
          });
          setAddOpen(false);
        }}
      />
    </Card>
  );
}
