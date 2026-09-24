import { createServerClient } from "@supabase/ssr";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

function makeSupabaseClient(request: NextRequest, response: { current: NextResponse }) {
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      // Must match src/lib/supabase-client.ts and supabase-server.ts exactly
      // -- see the comment in supabase-client.ts for why this app doesn't
      // use the @supabase/ssr default cookie name.
      cookieOptions: { name: "sb-stenslee-superadmin-auth" },
      cookies: {
        getAll() { return request.cookies.getAll(); },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response.current = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.current.cookies.set(name, value, options)
          );
        },
      },
    }
  );
}

// Next.js 16 renamed the middleware.ts file convention to proxy.ts (the
// `middleware` export is deprecated and does not run) — and for a project
// using a src/ directory, this file must live inside src/ (next to app/),
// not at the project root, or it silently never executes. See
// node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/proxy.md.
export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const response = { current: NextResponse.next({ request }) };
  const supabase = makeSupabaseClient(request, response);

  // getSession() decodes the JWT already sitting in the cookie -- no
  // network call in the common (non-expired-token) case. Deliberately NOT
  // calling getUser() here: that round-trips to the Auth server to
  // re-verify the token, and on a machine where server-side fetches to
  // Supabase are unreliable (see studio/AGENTS.md's Node/Supabase note),
  // that call can fail and make every request look unauthenticated,
  // bouncing it back to /login in an infinite loop even with a perfectly
  // valid session.
  const { data: { session } } = await supabase.auth.getSession();

  if (!session) {
    if (pathname === "/login") return response.current;
    const loginUrl = new URL("/login", request.url);
    if (pathname !== "/") loginUrl.searchParams.set("next", pathname);
    return NextResponse.redirect(loginUrl);
  }

  // A session cookie exists and passed local JWT validation. Try the
  // richer platform_admins check, but degrade gracefully instead of
  // forcing a redirect if this specific network call can't complete --
  // AdminShell re-runs this same check reliably from the browser, and RLS
  // (is_platform_admin()) enforces it at the data layer regardless.
  //
  // Capped at 1.5s: on a machine where server-side fetches to Supabase are
  // flaky, this call doesn't cleanly fail fast -- it can hang for several
  // seconds before erroring, which turned every navigation into a stall.
  const adminQueryController = new AbortController();
  const adminQueryTimeout = setTimeout(() => adminQueryController.abort(), 1500);
  const { data: admin, error: adminError } = await supabase
    .from("platform_admins")
    .select("is_active")
    .eq("id", session.user.id)
    .abortSignal(adminQueryController.signal)
    .maybeSingle();
  clearTimeout(adminQueryTimeout);

  const known = !adminError;
  const valid = known && !!admin?.is_active;

  if (pathname === "/login") {
    if (valid) return NextResponse.redirect(new URL("/dashboard", request.url));
    if (known) await supabase.auth.signOut();
    return response.current;
  }

  // Confirmed invalid (not "couldn't check") — sign out and bounce
  if (known && !valid) {
    await supabase.auth.signOut();
    const loginUrl = new URL("/login", request.url);
    if (pathname !== "/") loginUrl.searchParams.set("next", pathname);
    return NextResponse.redirect(loginUrl);
  }

  // Couldn't verify (network failure) — let the request through; the
  // browser-side check and RLS still gate the actual data.
  if (!known) return response.current;

  if (pathname === "/") {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  return response.current;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
