import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { motion } from "motion/react";
import { SiteLayout } from "@/components/site-layout";
import { supabase } from "@/integrations/supabase/client";
import { resolveProductImage } from "@/lib/product-images";
import { formatPrice } from "@/lib/format";

export const Route = createFileRoute("/catalog")({
  head: () => ({
    meta: [
      { title: "Каталог тюльпанов — tюlpa" },
      { name: "description", content: "Авторские букеты тюльпанов в Москве. Розовые, белые, бордовые, пастельные композиции с доставкой за один час." },
      { property: "og:title", content: "Каталог букетов — tюlpa" },
      { property: "og:description", content: "Авторские букеты тюльпанов с доставкой по Москве за час." },
    ],
  }),
  component: Catalog,
});

const COLORS = [
  { id: "all", label: "Все" },
  { id: "pink", label: "Розовые" },
  { id: "white", label: "Белые" },
  { id: "red", label: "Бордовые" },
  { id: "yellow", label: "Жёлтые" },
  { id: "mixed", label: "Микс" },
];

function Catalog() {
  const [color, setColor] = useState("all");
  const { data: products, isLoading } = useQuery({
    queryKey: ["products", "all"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("products")
        .select("*")
        .eq("is_active", true)
        .order("sort_order");
      if (error) throw error;
      return data;
    },
  });

  const filtered = (products ?? []).filter(
    (p) => color === "all" || p.color_tag === color,
  );

  return (
    <SiteLayout>
      <section className="mx-auto max-w-[1400px] px-6 lg:px-12 pt-16 lg:pt-24 pb-10">
        <span className="text-xs uppercase tracking-[0.3em] text-[color:var(--sage)]">
          каталог
        </span>
        <h1 className="serif text-5xl md:text-6xl mt-4">Букеты этой весной</h1>
        <p className="mt-6 text-muted-foreground max-w-xl">
          Каждый букет собран руками в&nbsp;день доставки. Выберите оттенок или
          посмотрите всё разом.
        </p>

        <div className="mt-10 flex flex-wrap gap-2">
          {COLORS.map((c) => (
            <button
              key={c.id}
              onClick={() => setColor(c.id)}
              className={`px-4 py-2 text-sm border border-border transition-colors ${
                color === c.id
                  ? "bg-[color:var(--ink)] text-[color:var(--cream)] border-[color:var(--ink)]"
                  : "hover:border-[color:var(--ink)]"
              }`}
            >
              {c.label}
            </button>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-[1400px] px-6 lg:px-12 pb-32">
        {isLoading ? (
          <div className="py-20 text-center text-muted-foreground">Загружаем букеты…</div>
        ) : filtered.length === 0 ? (
          <div className="py-20 text-center text-muted-foreground">
            В&nbsp;этом оттенке сейчас пусто. Загляните в&nbsp;другую вкладку.
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-x-8 gap-y-16">
            {filtered.map((p, i) => (
              <motion.div
                key={p.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: i * 0.04 }}
              >
                <Link
                  to="/product/$slug"
                  params={{ slug: p.slug }}
                  className="group block"
                >
                  <div className="aspect-[3/4] overflow-hidden bg-[color:var(--secondary)]">
                    <img
                      src={resolveProductImage(p.image_url)}
                      alt={p.name}
                      loading="lazy"
                      className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-[1.04]"
                    />
                  </div>
                  <div className="mt-5 flex items-baseline justify-between">
                    <h3 className="serif text-2xl">{p.name}</h3>
                    <span className="text-sm text-muted-foreground">
                      {formatPrice(p.price)}
                    </span>
                  </div>
                  <p className="mt-2 text-sm text-muted-foreground line-clamp-2">
                    {p.description}
                  </p>
                </Link>
              </motion.div>
            ))}
          </div>
        )}
      </section>
    </SiteLayout>
  );
}