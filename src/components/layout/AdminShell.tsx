"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { createSupabaseBrowserClient } from "@/lib/supabase-client";
import SidebarNav, { NAV_ITEMS, isActive } from "./Sidebar";

interface AdminIdentity {
  name: string;
  email: string;
}

export default function AdminShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [admin, setAdmin] = useState<AdminIdentity | null | undefined>(undefined);

  useEffect(() => {
    const supabase = createSupabaseBrowserClient();
    let cancelled = false;
    let lastUserId: string | null = null;

    async function check() {
      const { data: { user } } = await supabase.auth.getUser();
      lastUserId = user?.id ?? null;
      if (!user) { if (!cancelled) setAdmin(null); return; }

      const { data: platformAdmin } = await supabase
        .from("platform_admins")
        .select("name, email, is_active")
        .eq("id", user.id)
        .maybeSingle();

      if (!cancelled) {
        setAdmin(platformAdmin && platformAdmin.is_active ? platformAdmin : null);
      }
    }
    check();

    // Only re-check on a real sign-in/sign-out, and on SIGNED_IN only if the
    // user id actually changed. Supabase's client re-fires SIGNED_IN on its
    // own for the *same* already-logged-in user whenever the browser tab
    // regains focus (its internal session-recovery check on visibility
    // regain notifies subscribers again even when nothing changed) --
    // reacting to every SIGNED_IN re-ran this check, and its two database
    // queries, on every tab-switch for no actual auth change.
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "SIGNED_OUT") { check(); return; }
      if (event === "SIGNED_IN") {
        const userId = session?.user?.id ?? null;
        if (userId && userId !== lastUserId) check();
      }
    });
    return () => { cancelled = true; subscription.unsubscribe(); };
  }, []);

  useEffect(() => {
    if (admin === null) router.replace("/login");
  }, [admin, router]);

  async function handleLogout() {
    const supabase = createSupabaseBrowserClient();
    await supabase.auth.signOut({ scope: "local" });
    router.push("/login");
    router.refresh();
  }

  if (admin === undefined || admin === null) {
    return (
      <main className="min-h-[100dvh] bg-bg flex flex-col items-center justify-center px-5">
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 border-2 border-gold/40 border-t-gold rounded-full animate-spin" />
          <span className="text-muted text-xs font-mono tracking-widest">Loading…</span>
        </div>
      </main>
    );
  }

  return (
    <div className="h-[100dvh] min-h-0 bg-bg flex flex-col lg:flex-row overflow-hidden">
      <aside className="hidden lg:flex lg:flex-col w-64 flex-shrink-0 min-h-0 border-r border-cleo-border bg-surface/40 px-4 py-6 gap-6 overflow-y-auto">
        <div className="px-2">
          <p className="font-cinzel text-sm font-bold tracking-[0.15em] text-gold uppercase leading-none">Stenslee</p>
          <p className="text-[10px] font-mono text-muted tracking-wider leading-none mt-1">Super Admin</p>
        </div>

        <SidebarNav />

        <div className="mt-auto flex flex-col gap-3">
          <div className="flex items-center gap-2.5 px-2">
            <div className="w-8 h-8 rounded-full bg-gold/10 border border-gold/30 flex items-center justify-center flex-shrink-0">
              <span className="font-cinzel text-xs font-black text-gold">{admin.name.charAt(0).toUpperCase()}</span>
            </div>
            <div className="min-w-0">
              <p className="text-ink text-xs font-semibold truncate">{admin.name}</p>
              <p className="text-muted text-[9px] font-mono truncate">{admin.email}</p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="text-muted hover:text-error transition-colors text-xs font-mono tracking-wider px-3 py-2 rounded-lg border border-cleo-border hover:border-error/40 cursor-pointer text-left"
          >
            Logout
          </button>
        </div>
      </aside>

      <div className="lg:hidden border-b border-cleo-border bg-surface/40 flex-shrink-0">
        <div className="flex items-center justify-between px-4 pt-4 pb-2">
          <p className="font-cinzel text-[11px] font-bold tracking-[0.15em] text-gold uppercase leading-none">Stenslee Admin</p>
          <button
            onClick={handleLogout}
            className="text-muted hover:text-error transition-colors text-[10px] font-mono tracking-wider px-2.5 py-1.5 rounded-lg border border-cleo-border cursor-pointer"
          >
            Logout
          </button>
        </div>
        <nav className="hidden sm:flex gap-1.5 px-3 pb-3 overflow-x-auto">
          {NAV_ITEMS.map((item) => {
            const active = isActive(pathname, item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex-shrink-0 flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-cinzel font-bold uppercase tracking-wider transition-colors ${
                  active ? "bg-gold text-bg" : "text-muted border border-cleo-border"
                }`}
              >
                {item.icon}
                {item.label}
              </Link>
            );
          })}
        </nav>
      </div>

      <main className="flex-1 min-w-0 min-h-0 flex flex-col overflow-y-auto pb-20 sm:pb-6">
        <div className="flex-1 w-full max-w-6xl mx-auto px-5 sm:px-8 py-6 sm:py-8 flex flex-col gap-6">
          {children}
        </div>
      </main>

      <nav className="sm:hidden fixed bottom-0 inset-x-0 z-30 bg-surface/95 backdrop-blur-md border-t border-cleo-border flex items-stretch pb-safe">
        {NAV_ITEMS.map((item) => {
          const active = isActive(pathname, item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex-1 flex flex-col items-center justify-center gap-1 py-2.5 transition-colors ${active ? "text-gold" : "text-muted"}`}
            >
              {item.icon}
              <span className="text-[9px] font-cinzel font-bold uppercase tracking-wide">{item.label}</span>
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
