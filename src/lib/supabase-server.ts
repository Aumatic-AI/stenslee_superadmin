// SERVER-ONLY — do not import this in "use client" components.
// It uses next/headers which is only available in Server Components and Route Handlers.
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

// Server Component / Route Handler client (reads session from cookies).
// cookieOptions.name must match supabase-client.ts and proxy.ts exactly --
// see the comment there for why this app doesn't use the @supabase/ssr
// default cookie name.
export async function createSupabaseServerClient() {
  const cookieStore = await cookies();
  return createServerClient(url, anonKey, {
    cookieOptions: { name: "sb-stenslee-superadmin-auth" },
    cookies: {
      getAll() { return cookieStore.getAll(); },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value, options }) =>
          cookieStore.set(name, value, options)
        );
      },
    },
  });
}

// Service-role client — bypasses RLS. Only use for operations a platform
// admin's own RLS-scoped session genuinely can't do (e.g. auth.admin calls).
export function createServiceClient() {
  return createClient(url, process.env.SUPABASE_SERVICE_ROLE_KEY!);
}

export interface PlatformAdmin {
  id: string;
  email: string;
  name: string;
  is_active: boolean;
}

// Get the logged-in platform admin from a server context.
export async function getPlatformAdminSession(): Promise<PlatformAdmin | null> {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: admin } = await supabase
    .from("platform_admins")
    .select("id, email, name, is_active")
    .eq("id", user.id)
    .maybeSingle();

  if (!admin || !admin.is_active) return null;
  return admin as PlatformAdmin;
}
