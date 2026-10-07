import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient, createServiceClient } from "@/lib/supabase-server";

const MIN_PASSWORD_LENGTH = 8;

// POST /api/platform-admins — create an email + password platform admin (platform admin only).
export async function POST(req: NextRequest) {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const service = createServiceClient();
  const { data: requester } = await service.from("platform_admins").select("is_active").eq("id", user.id).maybeSingle();
  if (!requester?.is_active) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { name, email, password } = await req.json();
  const cleanEmail = typeof email === "string" ? email.trim().toLowerCase() : "";
  if (!name?.trim() || !/^\S+@\S+\.\S+$/.test(cleanEmail) || typeof password !== "string" || password.length < MIN_PASSWORD_LENGTH) {
    return NextResponse.json(
      { error: `Name, a valid email and a password of at least ${MIN_PASSWORD_LENGTH} characters are required.` },
      { status: 400 }
    );
  }

  // Server-side create: confirmed straight away and doesn't touch the current admin's session.
  const { data: authData, error: authError } = await service.auth.admin.createUser({
    email: cleanEmail,
    password,
    email_confirm: true,
  });

  if (authError || !authData.user) {
    return NextResponse.json({ error: authError?.message ?? "Failed to create user" }, { status: 500 });
  }

  const { data: adminRow, error: adminError } = await service
    .from("platform_admins")
    .insert({ id: authData.user.id, email: cleanEmail, name: name.trim() })
    .select()
    .single();

  if (adminError) {
    await service.auth.admin.deleteUser(authData.user.id);
    return NextResponse.json({ error: adminError.message }, { status: 500 });
  }

  return NextResponse.json({ admin: adminRow }, { status: 201 });
}
