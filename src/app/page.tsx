"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { createSupabaseBrowserClient } from "@/lib/supabase-client";

// Client-side fallback redirect. Normally proxy.ts (src/proxy.ts) already
// redirects "/" server-side before this ever renders -- but when its
// platform_admins verification call can't complete (flaky server-side
// Supabase connectivity on some dev machines, see studio/AGENTS.md's
// Node/Supabase note), it degrades gracefully by passing the request
// through rather than looping, which otherwise left this static splash
// with nothing to move it forward. This effect uses the browser client
// instead, which isn't affected by that same connectivity issue.
export default function Home() {
  const router = useRouter();

  useEffect(() => {
    async function redirect() {
      const supabase = createSupabaseBrowserClient();
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        router.replace("/login");
        return;
      }

      const { data: admin } = await supabase
        .from("platform_admins")
        .select("is_active")
        .eq("id", user.id)
        .maybeSingle();

      router.replace(admin?.is_active ? "/dashboard" : "/login");
    }
    redirect();
  }, [router]);

  return (
    <main className="min-h-[100dvh] bg-bg flex flex-col items-center justify-center px-5 relative overflow-hidden">
      <div
        className="absolute inset-0 opacity-[0.025]"
        style={{
          backgroundImage:
            "repeating-linear-gradient(0deg,#c9a84c 0px,#c9a84c 1px,transparent 1px,transparent 60px),repeating-linear-gradient(90deg,#c9a84c 0px,#c9a84c 1px,transparent 1px,transparent 60px)",
        }}
      />
      <div className="flex flex-col items-center gap-4 z-10 animate-fade-up">
        <h1>
          <Image src="/stenslee-logo.png" alt="Stenslee" width={886} height={167} priority className="h-12 sm:h-16 w-auto" />
        </h1>
        <p className="text-muted text-xs tracking-[0.28em] uppercase font-cinzel">
          Super Admin
        </p>
        <div className="flex items-center gap-2 mt-2">
          <div className="w-4 h-4 border-2 border-gold/40 border-t-gold rounded-full animate-spin" />
          <span className="text-muted text-xs font-mono tracking-widest">Loading…</span>
        </div>
      </div>
    </main>
  );
}
