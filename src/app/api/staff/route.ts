import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient, createServiceClient } from "@/lib/supabase-server";
import { isValidPhone, combinePhone } from "@/lib/phone";

// POST /api/staff — create a studio staff account (platform admin only).
// Needs the service role (phone-based admin.createUser), so this can't run
// client-side the way the old email+password signUp() did.
export async function POST(req: NextRequest) {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const service = createServiceClient();
  const { data: requester } = await service.from("platform_admins").select("is_active").eq("id", user.id).maybeSingle();
  if (!requester?.is_active) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { name, role, organizationId, phoneCountryCode, phoneNumber } = await req.json();
  if (!name?.trim() || !organizationId || (role !== "admin" && role !== "designer") || !isValidPhone(phoneCountryCode, phoneNumber)) {
    return NextResponse.json({ error: "name, role, organizationId and a valid phone number are required" }, { status: 400 });
  }

  const phone = combinePhone(phoneCountryCode, phoneNumber);
  const { data: existing, error: lookupError } = await service
    .from("staff")
    .select("organization_id, role, is_active, deleted_at, organizations(name)")
    .eq("phone", phone)
    .limit(1)
    .maybeSingle<{ organization_id: string; role: string; is_active: boolean; deleted_at: string | null; organizations: { name: string } | null }>();
  if (lookupError) return NextResponse.json({ error: "Couldn't check this number. Please try again." }, { status: 500 });
  if (existing) {
    const error =
      existing.organization_id !== organizationId
        ? `This number is already registered with ${existing.organizations?.name ?? "another studio"}. A number can only be in one studio for now.`
        : existing.deleted_at
          ? "This number belongs to a staff member who was removed from this studio."
          : existing.is_active
            ? `This number is already in this studio as ${existing.role === "admin" ? "an admin" : "a designer"}.`
            : "This number is already in this studio but deactivated.";
    return NextResponse.json({ error }, { status: 409 });
  }

  // phone_confirm skips OTP verification — a platform admin is vouching for
  // this number, not the staff member verifying it themselves.
  const { data: authData, error: authError } = await service.auth.admin.createUser({ phone, phone_confirm: true });
  let userId = authData.user?.id ?? null;
  let createdUser = !!userId;
  // A login left by an unfinished signup is reused rather than blocking the number.
  if (!userId && authError?.code === "phone_exists") {
    const { data: existingId } = await service.rpc("auth_user_id_by_phone", { p_phone: phone.replace(/\D/g, "") });
    userId = (existingId as string | null) ?? null;
    createdUser = false;
  }
  if (!userId) {
    return NextResponse.json({ error: authError?.message ?? "Failed to create user" }, { status: 500 });
  }

  const { data: staffRow, error: staffError } = await service
    .from("staff")
    .insert({
      id: userId,
      organization_id: organizationId,
      phone_country_code: phoneCountryCode,
      phone_number: phoneNumber,
      name: name.trim(),
      role,
      is_active: true,
    })
    .select()
    .single();

  if (staffError) {
    // Roll back only a login we just created, never a reused one.
    if (createdUser) await service.auth.admin.deleteUser(userId);
    return NextResponse.json({ error: staffError.message }, { status: 500 });
  }

  return NextResponse.json({ staff: staffRow }, { status: 201 });
}
