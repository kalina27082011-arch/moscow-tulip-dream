import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";
import { supabase } from "@/integrations/supabase/client";
import { formatPrice, formatDate } from "@/lib/format";

export const Route = createFileRoute("/admin/")({
  component: Dashboard,
});

function startOfDay(d: Date) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

function Dashboard() {
  const since = useMemo(() => {
    const d = startOfDay(new Date());
    d.setDate(d.getDate() - 13);
    return d.toISOString();
  }, []);

  const { data: orders } = useQuery({
    queryKey: ["admin", "dashboard-orders", since],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("orders")
        .select("id, total, status, customer_name, created_at")
        .gte("created_at", since)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  const { data: topItems } = useQuery({
    queryKey: ["admin", "dashboard-top-items"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("order_items")
        .select("name_snapshot, qty, price_snapshot")
        .limit(2000);
      if (error) throw error;
      const map = new Map<string, { qty: number; revenue: number }>();
      for (const it of data ?? []) {
        const cur = map.get(it.name_snapshot) ?? { qty: 0, revenue: 0 };
        cur.qty += it.qty;
        cur.revenue += it.qty * it.price_snapshot;
        map.set(it.name_snapshot, cur);
      }
      return Array.from(map.entries())
        .map(([name, v]) => ({ name, ...v }))
        .sort((a, b) => b.qty - a.qty)
        .slice(0, 5);
    },
  });

  const stats = useMemo(() => {
    const list = orders ?? [];
    const todayStart = startOfDay(new Date()).getTime();
    const weekStart = todayStart - 6 * 86400_000;
    const today = list.filter((o) => new Date(o.created_at).getTime() >= todayStart);
    const week = list.filter((o) => new Date(o.created_at).getTime() >= weekStart);
    const revToday = today.reduce((s, o) => s + o.total, 0);
    const avg = list.length ? Math.round(list.reduce((s, o) => s + o.total, 0) / list.length) : 0;
    const newCount = list.filter((o) => o.status === "new").length;
    return {
      todayCount: today.length,
      revToday,
      avg,
      weekCount: week.length,
      newCount,
    };
  }, [orders]);

  const chartData = useMemo(() => {
    const days: { day: string; label: string; count: number; revenue: number }[] = [];
    for (let i = 13; i >= 0; i--) {
      const d = startOfDay(new Date());
      d.setDate(d.getDate() - i);
      days.push({
        day: d.toISOString().slice(0, 10),
        label: d.toLocaleDateString("ru-RU", { day: "2-digit", month: "2-digit" }),
        count: 0,
        revenue: 0,
      });
    }
    const index = new Map(days.map((d, i) => [d.day, i]));
    for (const o of orders ?? []) {
      const key = new Date(o.created_at).toISOString().slice(0, 10);
      const i = index.get(key);
      if (i != null) {
        days[i].count += 1;
        days[i].revenue += o.total;
      }
    }
    return days;
  }, [orders]);

  const recent = (orders ?? []).slice(0, 5);

  return (
    <div className="space-y-10">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Kpi label="Заявок сегодня" value={String(stats.todayCount)} hint={`${stats.newCount} в статусе «новые»`} />
        <Kpi label="Выручка сегодня" value={formatPrice(stats.revToday)} />
        <Kpi label="Средний чек" value={formatPrice(stats.avg)} hint="за 14 дней" />
        <Kpi label="Заявок за неделю" value={String(stats.weekCount)} />
      </div>

      <section className="border border-border p-6 bg-[color:var(--cream)]">
        <div className="flex items-baseline justify-between mb-6">
          <h2 className="serif text-2xl">Заявки за 14 дней</h2>
          <span className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
            всего: {orders?.length ?? 0}
          </span>
        </div>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="label" stroke="currentColor" fontSize={11} />
              <YAxis stroke="currentColor" fontSize={11} allowDecimals={false} />
              <Tooltip
                contentStyle={{
                  background: "var(--cream)",
                  border: "1px solid hsl(var(--border))",
                  borderRadius: 0,
                }}
                labelStyle={{ color: "var(--ink)" }}
                formatter={(v: number, k) =>
                  k === "revenue" ? [formatPrice(v), "Выручка"] : [v, "Заявки"]
                }
              />
              <Line type="monotone" dataKey="count" stroke="var(--ink)" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </section>

      <div className="grid lg:grid-cols-2 gap-6">
        <section className="border border-border p-6 bg-[color:var(--cream)]">
          <div className="flex items-baseline justify-between mb-4">
            <h2 className="serif text-2xl">Последние заявки</h2>
            <Link to="/admin/orders" className="text-xs uppercase tracking-[0.2em] hover:text-[color:var(--sage)]">
              все →
            </Link>
          </div>
          {recent.length === 0 ? (
            <p className="text-sm text-muted-foreground">Пока пусто.</p>
          ) : (
            <ul className="divide-y divide-border">
              {recent.map((o) => (
                <li key={o.id} className="py-3 flex items-center justify-between gap-4">
                  <div className="min-w-0">
                    <div className="serif text-lg truncate">{o.customer_name}</div>
                    <div className="text-xs text-muted-foreground">{formatDate(o.created_at)}</div>
                  </div>
                  <div className="text-sm text-right">
                    <div>{formatPrice(o.total)}</div>
                    <div className="text-[10px] uppercase tracking-[0.15em] text-muted-foreground">{o.status}</div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="border border-border p-6 bg-[color:var(--cream)]">
          <div className="flex items-baseline justify-between mb-4">
            <h2 className="serif text-2xl">Топ-5 букетов</h2>
            <Link to="/admin/products" className="text-xs uppercase tracking-[0.2em] hover:text-[color:var(--sage)]">
              каталог →
            </Link>
          </div>
          {!topItems || topItems.length === 0 ? (
            <p className="text-sm text-muted-foreground">Продаж пока нет.</p>
          ) : (
            <ul className="divide-y divide-border">
              {topItems.map((it) => (
                <li key={it.name} className="py-3 flex items-center justify-between gap-4">
                  <div className="serif text-lg truncate">{it.name}</div>
                  <div className="text-sm text-right">
                    <div>{it.qty} шт.</div>
                    <div className="text-[10px] uppercase tracking-[0.15em] text-muted-foreground">
                      {formatPrice(it.revenue)}
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}

function Kpi({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="border border-border p-5 bg-[color:var(--cream)]">
      <div className="text-[10px] uppercase tracking-[0.25em] text-muted-foreground">{label}</div>
      <div className="serif text-3xl mt-2">{value}</div>
      {hint && <div className="text-xs text-muted-foreground mt-1">{hint}</div>}
    </div>
  );
}