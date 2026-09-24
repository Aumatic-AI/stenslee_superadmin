"use client";

import { createBrowserClient } from "@supabase/ssr";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

// Browser-only Supabase client. Safe to import in "use client" components.
// Uses cookies (not localStorage) so the session is readable by proxy.ts.
//
// cookieOptions.name is set explicitly (not left to the @supabase/ssr
// default of `sb-<project-ref>-auth-token`) because the studio app
// connects to this SAME Supabase project. Browsers scope cookies by
// domain+path only, never by port -- so on localhost, super-admin (:3001)
// and studio (:3000) share one cookie jar, and two apps using the same
// default cookie name would silently overwrite each other's session on
// every login (logging into one would look like it logged the other out).
// Must match the name used in supabase-server.ts and proxy.ts in this app
// exactly, or the proxy won't find the cookie this sets.
export function createSupabaseBrowserClient() {
  return createBrowserClient(url, anonKey, {
    cookieOptions: { name: "sb-stenslee-superadmin-auth" },
  });
}
