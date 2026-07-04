import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { Phone } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { formatPrice, formatDate } from "@/lib/format";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";

export const Route = createFileRoute("/admin/customers")({
  component: CustomersAdmin,
});

type OrderLite = {
  id: string;
  customer_name: string;
  phone: string;
  address: string;
  total: number;
  status: string;
  created_at: string;
};

type Customer = {
  phone: string;
  name: string;
  orders: OrderLite[];
  total: number;
  last: string;
};

function CustomersAdmin() {
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<Customer | null>(null);

  const { data: orders, isLoading } = useQuery({
    queryKey: ["admin-customers-orders"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("orders")
        .select("id, customer_name, phone, address, total, status, created_at")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as OrderLite[];
    },
  });

  const customers = useMemo<Customer[]>(() => {
    const map = new Map<string, Customer>();
    for (const o of orders ?? []) {
      const key = o.phone.trim() || o.customer_name.trim();
      const cur = map.get(key);
      if (cur) {
        cur.orders.push(o);
        cur.total += o.total;
        if (o.created_at > cur.last) {
          cur.last = o.created_at;
          cur.name = o.customer_name;
        }
      } else {
        map.set(key, {
          phone: o.phone,
          name: o.customer_name,
          orders: [o],
          total: o.total,
          last: o.created_at,
        });
      }
    }
    return Array.from(map.values()).sort((a, b) => (a.last < b.last ? 1 : -1));
  }, [orders]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return customers;
    return customers.filter(
      (c) => c.name.toLowerCase().includes(q) || c.phone.toLowerCase().includes(q),
    );
  }, [customers, search]);

  return (
    <div>
      <div className="mb-6">
        <h1 className="serif text-4xl">Клиенты</h1>
        <p className="text-sm text-muted-foreground mt-2">
          Уникальных: {customers.length}
        </p>
      </div>

      <input
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="Поиск по имени или телефону…"
        className="w-full max-w-md bg-transparent border border-border px-3 py-2 text-sm mb-6"
      />

      {isLoading ? (
        <p className="text-muted-foreground">Загружаем…</p>
      ) : filtered.length === 0 ? (
        <div className="border border-dashed border-border py-20 text-center text-muted-foreground">
          Клиенты появятся после первой заявки
        </div>
      ) : (
        <div className="border border-border overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-[color:var(--secondary)]/50 text-left text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
              <tr>
                <th className="px-4 py-3">Имя</th>
                <th className="px-4 py-3">Телефон</th>
                <th className="px-4 py-3 text-center">Заказов</th>
                <th className="px-4 py-3 text-right">Всего</th>
                <th className="px-4 py-3 hidden md:table-cell">Последний</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filtered.map((c) => (
                <tr
                  key={c.phone + c.name}
                  onClick={() => setSelected(c)}
                  className="cursor-pointer hover:bg-[color:var(--secondary)]/40"
                >
                  <td className="px-4 py-3 serif text-base">{c.name}</td>
                  <td className="px-4 py-3 text-muted-foreground">{c.phone}</td>
                  <td className="px-4 py-3 text-center">{c.orders.length}</td>
                  <td className="px-4 py-3 text-right">{formatPrice(c.total)}</td>
                  <td className="px-4 py-3 hidden md:table-cell text-muted-foreground">
                    {formatDate(c.last)}
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
                <SheetTitle className="serif text-2xl">{selected.name}</SheetTitle>
                <a
                  href={`tel:${selected.phone}`}
                  className="inline-flex items-center gap-2 mt-2 text-sm text-muted-foreground hover:text-[color:var(--ink)]"
                >
                  <Phone className="h-3.5 w-3.5" /> {selected.phone}
                </a>
              </SheetHeader>
              <div className="mt-6 grid grid-cols-2 gap-3">
                <Stat label="Заказов" value={String(selected.orders.length)} />
                <Stat label="Всего" value={formatPrice(selected.total)} />
              </div>
              <div className="mt-6">
                <div className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground mb-2">
                  История
                </div>
                <ul className="divide-y divide-border border border-border">
                  {selected.orders.map((o) => (
                    <li key={o.id} className="px-3 py-3 text-sm">
                      <div className="flex justify-between gap-4">
                        <span>{formatDate(o.created_at)}</span>
                        <span>{formatPrice(o.total)}</span>
                      </div>
                      <div className="text-xs text-muted-foreground mt-1 flex justify-between gap-4">
                        <span className="truncate">{o.address}</span>
                        <span className="uppercase tracking-[0.15em] text-[10px]">{o.status}</span>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="border border-border p-3">
      <div className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">{label}</div>
      <div className="serif text-xl mt-1">{value}</div>
    </div>
  );
}