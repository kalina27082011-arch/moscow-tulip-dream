import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { formatPrice, formatDate } from "@/lib/format";

export const Route = createFileRoute("/admin/")({
  component: OrdersAdmin,
});

const STATUS = [
  { id: "new", label: "Новые" },
  { id: "confirmed", label: "Подтверждено" },
  { id: "delivered", label: "Доставлено" },
  { id: "cancelled", label: "Отменено" },
];

function OrdersAdmin() {
  const qc = useQueryClient();
  const [filter, setFilter] = useState<string>("all");
  const [open, setOpen] = useState<string | null>(null);

  const { data: orders, isLoading } = useQuery({
    queryKey: ["admin-orders"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("orders")
        .select("*, order_items(*)")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const updateStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const { error } = await supabase.from("orders").update({ status }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-orders"] });
      toast.success("Статус обновлён");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const filtered = (orders ?? []).filter((o) => filter === "all" || o.status === filter);

  return (
    <div>
      <div className="flex items-end justify-between mb-8">
        <div>
          <h1 className="serif text-4xl">Заявки</h1>
          <p className="text-sm text-muted-foreground mt-2">
            Всего: {orders?.length ?? 0}
          </p>
        </div>
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
          Заявок пока нет
        </div>
      ) : (
        <div className="border border-border divide-y divide-border">
          {filtered.map((o) => {
            const isOpen = open === o.id;
            return (
              <div key={o.id}>
                <button
                  onClick={() => setOpen(isOpen ? null : o.id)}
                  className="w-full text-left grid grid-cols-12 gap-4 px-6 py-4 hover:bg-[color:var(--secondary)]/50"
                >
                  <div className="col-span-3 serif text-lg">{o.customer_name}</div>
                  <div className="col-span-3 text-sm text-muted-foreground">{o.phone}</div>
                  <div className="col-span-3 text-sm text-muted-foreground">
                    {formatDate(o.created_at)}
                  </div>
                  <div className="col-span-2 text-sm">{formatPrice(o.total)}</div>
                  <div className="col-span-1 text-xs uppercase tracking-[0.15em] text-right">
                    <StatusBadge status={o.status} />
                  </div>
                </button>
                {isOpen && (
                  <div className="px-6 pb-6 bg-[color:var(--secondary)]/40 grid md:grid-cols-2 gap-8">
                    <div>
                      <Detail label="Адрес" value={o.address} />
                      <Detail label="Время" value={o.delivery_time} />
                      <Detail label="Комментарий" value={o.comment || "—"} />
                    </div>
                    <div>
                      <div className="text-xs uppercase tracking-[0.2em] text-muted-foreground mb-2">
                        Состав
                      </div>
                      <ul className="space-y-1 text-sm">
                        {o.order_items.map((it) => (
                          <li key={it.id} className="flex justify-between gap-4">
                            <span>{it.name_snapshot} × {it.qty}</span>
                            <span className="text-muted-foreground">
                              {formatPrice(it.price_snapshot * it.qty)}
                            </span>
                          </li>
                        ))}
                      </ul>
                      <div className="mt-6 flex flex-wrap gap-2">
                        {STATUS.map((s) => (
                          <button
                            key={s.id}
                            onClick={() => updateStatus.mutate({ id: o.id, status: s.id })}
                            disabled={o.status === s.id}
                            className={`text-xs uppercase tracking-[0.15em] px-3 py-2 border ${
                              o.status === s.id
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
                )}
              </div>
            );
          })}
        </div>
      )}
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
    <div className="mb-4">
      <div className="text-xs uppercase tracking-[0.2em] text-muted-foreground">{label}</div>
      <div className="mt-1 text-sm">{value}</div>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    new: "text-[color:var(--blush)]",
    confirmed: "text-[color:var(--sage)]",
    delivered: "text-muted-foreground",
    cancelled: "text-destructive",
  };
  const label = STATUS.find((s) => s.id === status)?.label ?? status;
  return <span className={map[status] ?? ""}>{label}</span>;
}