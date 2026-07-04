import { createFileRoute, Link, Outlet, redirect, useNavigate, useRouterState } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { LayoutDashboard, ClipboardList, Flower2, Users, LogOut } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";

export const Route = createFileRoute("/admin")({
  beforeLoad: async () => {
    const { data } = await supabase.auth.getSession();
    if (!data.session) {
      throw redirect({ to: "/auth" });
    }
    // Make sure first owner claims admin if needed.
    try { await supabase.rpc("claim_first_admin"); } catch { /* noop */ }
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

type NavItem = {
  to: string;
  label: string;
  icon: typeof LayoutDashboard;
  exact?: boolean;
  badgeKey?: "new-orders";
};

const NAV: NavItem[] = [
  { to: "/admin", label: "Дашборд", icon: LayoutDashboard, exact: true },
  { to: "/admin/orders", label: "Заявки", icon: ClipboardList, badgeKey: "new-orders" },
  { to: "/admin/products", label: "Букеты", icon: Flower2 },
  { to: "/admin/customers", label: "Клиенты", icon: Users },
];

function AdminLayout() {
  const [email, setEmail] = useState<string | null>(null);
  const navigate = useNavigate();
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setEmail(data.user?.email ?? null));
  }, []);

  const { data: newOrdersCount } = useQuery({
    queryKey: ["admin", "new-orders-count"],
    queryFn: async () => {
      const { count, error } = await supabase
        .from("orders")
        .select("id", { count: "exact", head: true })
        .eq("status", "new");
      if (error) throw error;
      return count ?? 0;
    },
    refetchInterval: 30_000,
  });

  const currentTitle = NAV.find((n) => (n.exact ? pathname === n.to : pathname.startsWith(n.to)))?.label ?? "Кабинет";

  const signOut = async () => {
    await supabase.auth.signOut();
    toast.success("Вы вышли");
    navigate({ to: "/" });
  };

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-[color:var(--cream)]">
        <Sidebar collapsible="icon">
          <SidebarHeader className="border-b border-border">
            <Link to="/" className="serif text-xl px-2 py-1 block">
              tюlpa<span className="text-[color:var(--blush)]">.</span>
            </Link>
          </SidebarHeader>
          <SidebarContent>
            <SidebarGroup>
              <SidebarGroupLabel>Кабинет</SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  {NAV.map((item) => {
                    const active = item.exact ? pathname === item.to : pathname.startsWith(item.to);
                    const badge =
                      item.badgeKey === "new-orders" && newOrdersCount ? newOrdersCount : null;
                    return (
                      <SidebarMenuItem key={item.to}>
                        <SidebarMenuButton asChild isActive={active} tooltip={item.label}>
                          <Link to={item.to} className="flex items-center gap-2">
                            <item.icon className="h-4 w-4" />
                            <span>{item.label}</span>
                            {badge ? (
                              <span className="ml-auto text-[10px] bg-[color:var(--blush)] text-[color:var(--ink)] px-1.5 py-0.5 rounded-full">
                                {badge}
                              </span>
                            ) : null}
                          </Link>
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                    );
                  })}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          </SidebarContent>
          <SidebarFooter className="border-t border-border">
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton onClick={signOut} tooltip="Выйти">
                  <LogOut className="h-4 w-4" />
                  <span>Выйти</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
            <div className="px-2 py-1 text-[10px] text-muted-foreground truncate group-data-[collapsible=icon]:hidden">
              {email}
            </div>
          </SidebarFooter>
        </Sidebar>

        <div className="flex-1 flex flex-col min-w-0">
          <header className="h-14 border-b border-border bg-[color:var(--cream)] flex items-center gap-3 px-4 lg:px-8">
            <SidebarTrigger />
            <div className="serif text-lg">{currentTitle}</div>
          </header>
          <main className="flex-1 px-4 lg:px-8 py-8 overflow-x-auto">
            <Outlet />
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}