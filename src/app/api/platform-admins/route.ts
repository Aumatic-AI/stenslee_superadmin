import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient, createServiceClient } from "@/lib/supabase-server";
import { isValidPhone, combinePhone } from "@/lib/phone";

// POST /api/platform-admins — create a new platform admin account (platform
// admin only). Needs the service role (phone-based admin.createUser), so
// this can't run client-side the way the old email+password signUp() did.
export async function POST(req: NextRequest) {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const service = createServiceClient();
  const { data: requester } = await service.from("platform_admins").select("is_active").eq("id", user.id).maybeSingle();
  if (!requester?.is_active) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { name, phoneCountryCode, phoneNumber } = await req.json();
  if (!name?.trim() || !isValidPhone(phoneCountryCode, phoneNumber)) {
    return NextResponse.json({ error: "name and a valid phone number are required" }, { status: 400 });
  }

  const { data: authData, error: authError } = await service.auth.admin.createUser({
    phone: combinePhone(phoneCountryCode, phoneNumber),
    phone_confirm: true,
  });

  if (authError || !authData.user) {
    return NextResponse.json({ error: authError?.message ?? "Failed to create user" }, { status: 500 });
  }

  const { data: adminRow, error: adminError } = await service
    .from("platform_admins")
    .insert({ id: authData.user.id, phone_country_code: phoneCountryCode, phone_number: phoneNumber, name: name.trim() })
    .select()
    .single();

  if (adminError) {
    await service.auth.admin.deleteUser(authData.user.id);
    return NextResponse.json({ error: adminError.message }, { status: 500 });
  }

  return NextResponse.json({ admin: adminRow }, { status: 201 });
}
