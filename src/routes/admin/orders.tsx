import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Download, Phone, Copy } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { formatPrice, formatDate } from "@/lib/format";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";

export const Route = createFileRoute("/admin/orders")({
  component: OrdersAdmin,
});

const STATUS = [
  { id: "new", label: "Новые", color: "var(--blush)" },
  { id: "confirmed", label: "Подтверждено", color: "var(--sage)" },
  { id: "delivered", label: "Доставлено", color: "hsl(var(--muted-foreground))" },
  { id: "cancelled", label: "Отменено", color: "hsl(var(--destructive))" },
];

type OrderRow = {
  id: string;
  customer_name: string;
  phone: string;
  address: string;
  delivery_time: string;
  comment: string;
  total: number;
  status: string;
  created_at: string;
  order_items: {
    id: string;
    name_snapshot: string;
    price_snapshot: number;
    qty: number;
  }[];
};

function OrdersAdmin() {
  const qc = useQueryClient();
  const [filter, setFilter] = useState<string>("all");
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<OrderRow | null>(null);

  const { data: orders, isLoading } = useQuery({
    queryKey: ["admin-orders"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("orders")
        .select("*, order_items(*)")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as OrderRow[];
    },
  });

  const updateStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const { error } = await supabase.from("orders").update({ status }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: ["admin-orders"] });
      qc.invalidateQueries({ queryKey: ["admin", "new-orders-count"] });
      qc.invalidateQueries({ queryKey: ["admin", "dashboard-orders"] });
      toast.success("Статус обновлён");
      if (selected?.id === vars.id) {
        setSelected({ ...selected, status: vars.status });
      }
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return (orders ?? []).filter((o) => {
      if (filter !== "all" && o.status !== filter) return false;
      if (!q) return true;
      return (
        o.customer_name.toLowerCase().includes(q) ||
        o.phone.toLowerCase().includes(q) ||
        o.address.toLowerCase().includes(q)
      );
    });
  }, [orders, search, filter]);

  const totals = useMemo(() => {
    const sum = filtered.reduce((s, o) => s + o.total, 0);
    return { count: filtered.length, sum };
  }, [filtered]);

  const exportCsv = () => {
    const rows = [
      ["Дата", "Клиент", "Телефон", "Адрес", "Время", "Комментарий", "Сумма", "Статус"],
      ...filtered.map((o) => [
        formatDate(o.created_at),
        o.customer_name,
        o.phone,
        o.address,
        o.delivery_time,
        o.comment,
        String(o.total),
        o.status,
      ]),
    ];
    const csv = rows
      .map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(","))
      .join("\n");
    const blob = new Blob(["\ufeff" + csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `orders-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div>
      <div className="flex items-end justify-between mb-6 gap-4 flex-wrap">
        <div>
          <h1 className="serif text-4xl">Заявки</h1>
          <p className="text-sm text-muted-foreground mt-2">
            {totals.count} шт. · сумма {formatPrice(totals.sum)}
          </p>
        </div>
        <button
          onClick={exportCsv}
          disabled={filtered.length === 0}
          className="flex items-center gap-2 px-4 py-2 text-xs uppercase tracking-[0.2em] border border-border hover:bg-[color:var(--secondary)] disabled:opacity-50"
        >
          <Download className="h-3.5 w-3.5" /> CSV
        </button>
      </div>

      <div className="flex flex-wrap gap-3 mb-6 items-center">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Имя, телефон, адрес…"
          className="flex-1 min-w-[220px] bg-transparent border border-border px-3 py-2 text-sm"
        />
        <div className="flex gap-2 flex-wrap">
          <FilterBtn active={filter === "all"} onClick={() => setFilter("all")}>Все</FilterBtn>
          {STATUS.map((s) => (
            <FilterBtn key={s.id} active={filter === s.id} onClick={() => setFilter(s.id)}>
              {s.label}
            </FilterBtn>
          ))}
        </div>
      </div>

      {isLoading ? (
        <p className="text-muted-foreground">Загружаем…</p>
      ) : filtered.length === 0 ? (
        <div className="border border-dashed border-border py-20 text-center text-muted-foreground">
          Заявок не найдено
        </div>
      ) : (
        <div className="border border-border overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-[color:var(--secondary)]/50 text-left text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
              <tr>
                <th className="px-4 py-3">Клиент</th>
                <th className="px-4 py-3">Телефон</th>
                <th className="px-4 py-3 hidden md:table-cell">Когда</th>
                <th className="px-4 py-3 hidden lg:table-cell">Позиции</th>
                <th className="px-4 py-3 text-right">Сумма</th>
                <th className="px-4 py-3 text-right">Статус</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filtered.map((o) => (
                <tr
                  key={o.id}
                  onClick={() => setSelected(o)}
                  className="cursor-pointer hover:bg-[color:var(--secondary)]/40"
                >
                  <td className="px-4 py-3 serif text-base">{o.customer_name}</td>
                  <td className="px-4 py-3 text-muted-foreground">{o.phone}</td>
                  <td className="px-4 py-3 hidden md:table-cell text-muted-foreground">
                    {formatDate(o.created_at)}
                  </td>
                  <td className="px-4 py-3 hidden lg:table-cell text-muted-foreground">
                    {o.order_items.reduce((s, i) => s + i.qty, 0)} шт.
                  </td>
                  <td className="px-4 py-3 text-right">{formatPrice(o.total)}</td>
                  <td className="px-4 py-3 text-right">
                    <StatusBadge status={o.status} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Sheet open={!!selected} onOpenChange={(o) => !o && setSelected(null)}>
        <SheetContent className="w-full sm:max-w-lg overflow-y-auto bg-[color:var(--cream)]">
          {selected && (
            <>
              <SheetHeader>
                <SheetTitle className="serif text-2xl">{selected.customer_name}</SheetTitle>
                <div className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
                  {formatDate(selected.created_at)}
                </div>
              </SheetHeader>
              <div className="mt-6 space-y-5">
                <div className="flex gap-2 flex-wrap">
                  <a
                    href={`tel:${selected.phone}`}
                    className="flex items-center gap-2 border border-border px-3 py-2 text-xs uppercase tracking-[0.15em] hover:bg-[color:var(--secondary)]"
                  >
                    <Phone className="h-3.5 w-3.5" /> {selected.phone}
                  </a>
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(selected.address);
                      toast.success("Адрес скопирован");
                    }}
                    className="flex items-center gap-2 border border-border px-3 py-2 text-xs uppercase tracking-[0.15em] hover:bg-[color:var(--secondary)]"
                  >
                    <Copy className="h-3.5 w-3.5" /> Адрес
                  </button>
                </div>
                <Detail label="Адрес" value={selected.address} />
                <Detail label="Время доставки" value={selected.delivery_time || "—"} />
                <Detail label="Комментарий" value={selected.comment || "—"} />

                <div>
                  <div className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground mb-2">
                    Состав
                  </div>
                  <ul className="divide-y divide-border border border-border">
                    {selected.order_items.map((it) => (
                      <li key={it.id} className="flex justify-between gap-4 px-3 py-2 text-sm">
                        <span>{it.name_snapshot} × {it.qty}</span>
                        <span className="text-muted-foreground">
                          {formatPrice(it.price_snapshot * it.qty)}
                        </span>
                      </li>
                    ))}
                    <li className="flex justify-between px-3 py-2 text-sm serif">
                      <span>Итого</span>
                      <span>{formatPrice(selected.total)}</span>
                    </li>
                  </ul>
                </div>

                <div>
                  <div className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground mb-2">
                    Статус
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {STATUS.map((s) => (
                      <button
                        key={s.id}
                        onClick={() => updateStatus.mutate({ id: selected.id, status: s.id })}
                        disabled={selected.status === s.id || updateStatus.isPending}
                        className={`text-xs uppercase tracking-[0.15em] px-3 py-2 border ${
                          selected.status === s.id
                            ? "bg-[color:var(--ink)] text-[color:var(--cream)] border-[color:var(--ink)]"
                            : "border-border hover:border-[color:var(--ink)]"
                        }`}
                      >
                        {s.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}

function FilterBtn({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={`px-3 py-2 text-xs uppercase tracking-[0.15em] border ${
        active
          ? "bg-[color:var(--ink)] text-[color:var(--cream)] border-[color:var(--ink)]"
          : "border-border hover:border-[color:var(--ink)]"
      }`}
    >
      {children}
    </button>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">{label}</div>
      <div className="mt-1 text-sm">{value}</div>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const s = STATUS.find((x) => x.id === status);
  return (
    <span
      className="inline-block text-[10px] uppercase tracking-[0.15em]"
      style={{ color: s?.color ?? "inherit" }}
    >
      {s?.label ?? status}
    </span>
  );
}