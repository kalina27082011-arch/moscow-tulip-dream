import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMutation } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { motion, AnimatePresence } from "motion/react";
import { SiteLayout } from "@/components/site-layout";
import { useCart } from "@/lib/cart-store";
import { resolveProductImage } from "@/lib/product-images";
import { formatPrice } from "@/lib/format";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/cart")({
  head: () => ({
    meta: [{ title: "Корзина — tюlpa" }],
  }),
  component: CartPage,
});

function CartPage() {
  const items = useCart((s) => s.items);
  const total = useCart((s) => s.total());
  const setQty = useCart((s) => s.setQty);
  const remove = useCart((s) => s.remove);
  const clear = useCart((s) => s.clear);
  const navigate = useNavigate();

  const [form, setForm] = useState({
    name: "",
    phone: "",
    address: "",
    delivery_time: "asap",
    comment: "",
  });

  const mutation = useMutation({
    mutationFn: async () => {
      if (items.length === 0) throw new Error("Корзина пуста");
      if (!form.name.trim() || !form.phone.trim() || !form.address.trim()) {
        throw new Error("Заполните имя, телефон и адрес");
      }
      const { data: order, error } = await supabase
        .from("orders")
        .insert({
          customer_name: form.name.trim(),
          phone: form.phone.trim(),
          address: form.address.trim(),
          delivery_time: form.delivery_time,
          comment: form.comment.trim(),
          total,
        })
        .select("id")
        .single();
      if (error) throw error;
      const { error: itemsError } = await supabase.from("order_items").insert(
        items.map((i) => ({
          order_id: order.id,
          product_id: i.productId,
          name_snapshot: i.name,
          price_snapshot: i.price,
          qty: i.qty,
        })),
      );
      if (itemsError) throw itemsError;
      return order.id;
    },
    onSuccess: () => {
      clear();
      toast.success("Заявка принята — мы перезвоним в течение пяти минут");
      navigate({ to: "/" });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <SiteLayout>
      <section className="mx-auto max-w-[1400px] px-6 lg:px-12 pt-16 lg:pt-24 pb-24">
        <span className="text-xs uppercase tracking-[0.3em] text-[color:var(--sage)]">
          оформление
        </span>
        <h1 className="serif text-5xl md:text-6xl mt-4">Ваш букет</h1>

        {items.length === 0 ? (
          <div className="mt-16 border border-border p-12 text-center">
            <p className="serif text-2xl">Корзина пока пуста</p>
            <p className="mt-3 text-muted-foreground">
              Выберите букет — он окажется здесь.
            </p>
            <Link
              to="/catalog"
              className="inline-block mt-8 bg-[color:var(--ink)] text-[color:var(--cream)] px-7 py-4 text-sm uppercase tracking-[0.2em]"
            >
              В каталог
            </Link>
          </div>
        ) : (
          <div className="mt-12 grid lg:grid-cols-12 gap-12">
            <div className="lg:col-span-7 divide-y divide-border border-y border-border">
              <AnimatePresence initial={false}>
                {items.map((i) => (
                  <motion.div
                    key={i.productId}
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    className="flex gap-5 py-6 overflow-hidden"
                  >
                    <Link
                      to="/product/$slug"
                      params={{ slug: i.slug }}
                      className="block w-24 h-32 shrink-0 bg-[color:var(--secondary)] overflow-hidden"
                    >
                      <img
                        src={resolveProductImage(i.image_url)}
                        alt={i.name}
                        className="w-full h-full object-cover"
                      />
                    </Link>
                    <div className="flex-1 flex flex-col">
                      <div className="flex justify-between gap-4">
                        <Link
                          to="/product/$slug"
                          params={{ slug: i.slug }}
                          className="serif text-2xl hover:text-[color:var(--sage)]"
                        >
                          {i.name}
                        </Link>
                        <div className="serif text-xl whitespace-nowrap">
                          {formatPrice(i.price * i.qty)}
                        </div>
                      </div>
                      <div className="mt-auto flex items-center justify-between pt-4">
                        <div className="flex items-center border border-border">
                          <button
                            onClick={() => setQty(i.productId, i.qty - 1)}
                            className="px-3 py-2 hover:bg-secondary"
                          >
                            −
                          </button>
                          <span className="px-4 min-w-10 text-center">{i.qty}</span>
                          <button
                            onClick={() => setQty(i.productId, i.qty + 1)}
                            className="px-3 py-2 hover:bg-secondary"
                          >
                            +
                          </button>
                        </div>
                        <button
                          onClick={() => remove(i.productId)}
                          className="text-xs uppercase tracking-[0.2em] text-muted-foreground hover:text-destructive"
                        >
                          убрать
                        </button>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>

            <div className="lg:col-span-5">
              <div className="bg-[color:var(--secondary)]/50 p-8">
                <h2 className="serif text-3xl">Доставка и&nbsp;заявка</h2>
                <p className="mt-2 text-sm text-muted-foreground">
                  Оплата не&nbsp;онлайн — менеджер перезвонит и&nbsp;уточнит детали.
                </p>
                <form
                  className="mt-6 space-y-4"
                  onSubmit={(e) => {
                    e.preventDefault();
                    mutation.mutate();
                  }}
                >
                  <Field label="Имя" value={form.name} onChange={(v) => setForm({ ...form, name: v })} placeholder="Анна" />
                  <Field label="Телефон" value={form.phone} onChange={(v) => setForm({ ...form, phone: v })} placeholder="+7 (___) ___-__-__" type="tel" />
                  <Field label="Адрес доставки" value={form.address} onChange={(v) => setForm({ ...form, address: v })} placeholder="Москва, Большая Ордынка, 24, кв. 5" />
                  <div>
                    <label className="block text-xs uppercase tracking-[0.2em] text-muted-foreground mb-2">
                      Когда привезти
                    </label>
                    <select
                      value={form.delivery_time}
                      onChange={(e) => setForm({ ...form, delivery_time: e.target.value })}
                      className="w-full bg-transparent border border-border px-3 py-3 text-sm"
                    >
                      <option value="asap">В&nbsp;течение часа</option>
                      <option value="today_evening">Сегодня вечером</option>
                      <option value="tomorrow_morning">Завтра утром</option>
                      <option value="custom">Уточню по&nbsp;телефону</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs uppercase tracking-[0.2em] text-muted-foreground mb-2">
                      Комментарий
                    </label>
                    <textarea
                      rows={3}
                      value={form.comment}
                      onChange={(e) => setForm({ ...form, comment: e.target.value })}
                      placeholder="Открытка, домофон, повод…"
                      className="w-full bg-transparent border border-border px-3 py-3 text-sm resize-none"
                    />
                  </div>
                  <div className="pt-4 flex items-baseline justify-between hairline">
                    <span className="text-sm uppercase tracking-[0.2em]">Итого</span>
                    <span className="serif text-3xl">{formatPrice(total)}</span>
                  </div>
                  <button
                    type="submit"
                    disabled={mutation.isPending}
                    className="w-full bg-[color:var(--ink)] text-[color:var(--cream)] px-7 py-4 text-sm uppercase tracking-[0.2em] hover:bg-[color:var(--sage)] transition-colors disabled:opacity-60"
                  >
                    {mutation.isPending ? "Отправляем…" : "Оформить заявку"}
                  </button>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    Отправляя заявку, вы соглашаетесь с&nbsp;
                    <Link to="/privacy" className="underline">политикой конфиденциальности</Link> и&nbsp;
                    <Link to="/offer" className="underline">офертой</Link>.
                  </p>
                </form>
              </div>
            </div>
          </div>
        )}
      </section>
    </SiteLayout>
  );
}

function Field({
  label,
  value,
  onChange,
  placeholder,
  type = "text",
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  type?: string;
}) {
  return (
    <div>
      <label className="block text-xs uppercase tracking-[0.2em] text-muted-foreground mb-2">
        {label}
      </label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full bg-transparent border border-border px-3 py-3 text-sm focus:outline-none focus:border-[color:var(--ink)]"
      />
    </div>
  );
}