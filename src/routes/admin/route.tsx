import { createFileRoute, Link, Outlet, redirect, useNavigate, useRouterState } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export const Route = createFileRoute("/admin")({
  beforeLoad: async () => {
    const { data } = await supabase.auth.getSession();
    if (!data.session) {
      throw redirect({ to: "/auth" });
    }
    // Make sure first owner claims admin if needed.
    await supabase.rpc("claim_first_admin").catch(() => null);
    const { data: roles } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", data.session.user.id);
    if (!roles || roles.length === 0) {
      throw redirect({ to: "/auth" });
    }
  },
  component: AdminLayout,
});

const TABS = [
  { to: "/admin", label: "Заявки", exact: true },
  { to: "/admin/products", label: "Букеты", exact: false },
];

function AdminLayout() {
  const [email, setEmail] = useState<string | null>(null);
  const navigate = useNavigate();
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setEmail(data.user?.email ?? null));
  }, []);

  const signOut = async () => {
    await supabase.auth.signOut();
    toast.success("Вы вышли");
    navigate({ to: "/" });
  };

  return (
    <div className="min-h-screen flex flex-col bg-[color:var(--cream)]">
      <header className="border-b border-border bg-[color:var(--cream)]">
        <div className="mx-auto max-w-[1400px] px-6 lg:px-12 h-16 flex items-center justify-between">
          <Link to="/" className="serif text-2xl">
            tюlpa<span className="text-[color:var(--blush)]">.</span>
            <span className="ml-3 text-xs uppercase tracking-[0.25em] text-muted-foreground">
              кабинет
            </span>
          </Link>
          <div className="flex items-center gap-6 text-sm">
            <span className="hidden md:inline text-muted-foreground">{email}</span>
            <button onClick={signOut} className="text-xs uppercase tracking-[0.2em] hover:text-[color:var(--sage)]">
              Выйти
            </button>
          </div>
        </div>
        <nav className="mx-auto max-w-[1400px] px-6 lg:px-12 flex gap-6 -mb-px">
          {TABS.map((t) => {
            const active = t.exact ? pathname === t.to : pathname.startsWith(t.to);
            return (
              <Link
                key={t.to}
                to={t.to}
                className={`py-4 text-sm border-b-2 ${
                  active
                    ? "border-[color:var(--ink)] text-[color:var(--ink)]"
                    : "border-transparent text-muted-foreground hover:text-[color:var(--ink)]"
                }`}
              >
                {t.label}
              </Link>
            );
          })}
        </nav>
      </header>
      <main className="flex-1 mx-auto w-full max-w-[1400px] px-6 lg:px-12 py-10">
        <Outlet />
      </main>
    </div>
  );
}