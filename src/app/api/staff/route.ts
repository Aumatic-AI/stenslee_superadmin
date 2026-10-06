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

  // phone_confirm skips OTP verification — a platform admin is vouching for
  // this number, not the staff member verifying it themselves.
  const { data: authData, error: authError } = await service.auth.admin.createUser({
    phone: combinePhone(phoneCountryCode, phoneNumber),
    phone_confirm: true,
  });

  if (authError || !authData.user) {
    return NextResponse.json({ error: authError?.message ?? "Failed to create user" }, { status: 500 });
  }

  const { data: staffRow, error: staffError } = await service
    .from("staff")
    .insert({
      id: authData.user.id,
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
    await service.auth.admin.deleteUser(authData.user.id);
    return NextResponse.json({ error: staffError.message }, { status: 500 });
  }

  return NextResponse.json({ staff: staffRow }, { status: 201 });
}
