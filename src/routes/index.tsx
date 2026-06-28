import { createFileRoute } from "@tanstack/react-router";
import { Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { motion } from "motion/react";
import heroImg from "@/assets/hero-tulips.jpg";
import { SiteLayout } from "@/components/site-layout";
import { supabase } from "@/integrations/supabase/client";
import { resolveProductImage } from "@/lib/product-images";
import { formatPrice } from "@/lib/format";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "tюlpa — букеты тюльпанов с доставкой по Москве за час" },
      { name: "description", content: "Авторские букеты тюльпанов. Доставка по Москве за один час. Бережная крафтовая упаковка, всегда свежие цветы." },
      { property: "og:title", content: "tюlpa — букеты тюльпанов в Москве" },
      { property: "og:description", content: "Доставим букет тюльпанов за один час по Москве." },
    ],
  }),
  component: Index,
});

function Index() {
  const { data: products } = useQuery({
    queryKey: ["products", "featured"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("products")
        .select("*")
        .eq("is_active", true)
        .order("sort_order")
        .limit(6);
      if (error) throw error;
      return data;
    },
  });

  return (
    <SiteLayout>
      {/* HERO */}
      <section className="relative">
        <div className="mx-auto max-w-[1400px] px-6 lg:px-12 pt-16 lg:pt-24 pb-20 grid lg:grid-cols-12 gap-10 items-center">
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.9, ease: "easeOut" }}
            className="lg:col-span-5"
          >
            <span className="text-xs uppercase tracking-[0.3em] text-[color:var(--sage)]">
              ателье · Москва
            </span>
            <h1 className="serif text-5xl md:text-6xl lg:text-7xl leading-[1.05] mt-6">
              Тюльпаны,<br />
              <em className="not-italic text-[color:var(--blush)]">которые успевают</em><br />
              к&nbsp;вашему утру.
            </h1>
            <p className="mt-8 text-base md:text-lg text-muted-foreground max-w-md leading-relaxed">
              Собираем букеты руками и&nbsp;привозим их по&nbsp;Москве за&nbsp;один час.
              Без&nbsp;шаблонов, без&nbsp;ленты-фольги, без&nbsp;101&nbsp;розы.
            </p>
            <div className="mt-10 flex flex-wrap gap-4">
              <Link
                to="/catalog"
                className="inline-flex items-center gap-3 bg-[color:var(--ink)] text-[color:var(--cream)] px-7 py-4 text-sm uppercase tracking-[0.2em] hover:bg-[color:var(--sage)] transition-colors"
              >
                Смотреть каталог
                <span aria-hidden>→</span>
              </Link>
              <Link
                to="/delivery"
                className="inline-flex items-center px-7 py-4 text-sm uppercase tracking-[0.2em] border-b border-[color:var(--ink)] hover:text-[color:var(--sage)] hover:border-[color:var(--sage)] transition-colors"
              >
                Как мы доставляем
              </Link>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 1.2, ease: "easeOut" }}
            className="lg:col-span-7 relative"
          >
            <img
              src={heroImg}
              alt="Букет розовых тюльпанов на льняном полотне"
              width={1600}
              height={1280}
              className="w-full h-[60vh] lg:h-[78vh] object-cover"
            />
            <div className="absolute -bottom-6 -left-6 hidden lg:block bg-[color:var(--cream)] border border-border px-6 py-5 max-w-xs">
              <div className="text-xs uppercase tracking-[0.25em] text-[color:var(--sage)] mb-2">
                сегодня в работе
              </div>
              <div className="serif text-2xl">17 букетов</div>
              <div className="text-sm text-muted-foreground mt-1">
                свежий завоз из голландской теплицы — этим утром
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* CATALOG PREVIEW */}
      <section className="border-t border-border/60">
        <div className="mx-auto max-w-[1400px] px-6 lg:px-12 py-20 lg:py-28">
          <div className="flex items-end justify-between mb-14">
            <div>
              <span className="text-xs uppercase tracking-[0.3em] text-[color:var(--sage)]">
                этой&nbsp;весной
              </span>
              <h2 className="serif text-4xl md:text-5xl mt-4">Шесть букетов</h2>
            </div>
            <Link
              to="/catalog"
              className="hidden md:inline-flex items-center gap-2 text-sm uppercase tracking-[0.2em] hover:text-[color:var(--sage)]"
            >
              Весь каталог <span aria-hidden>→</span>
            </Link>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-x-8 gap-y-14">
            {products?.map((p, i) => (
              <motion.div
                key={p.id}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-80px" }}
                transition={{ duration: 0.7, delay: i * 0.05 }}
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
                </Link>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* DELIVERY */}
      <section className="bg-[color:var(--ink)] text-[color:var(--cream)]">
        <div className="mx-auto max-w-[1400px] px-6 lg:px-12 py-24 lg:py-32 grid lg:grid-cols-12 gap-10">
          <div className="lg:col-span-5">
            <span className="text-xs uppercase tracking-[0.3em] text-[color:var(--blush)]">
              доставка
            </span>
            <h2 className="serif text-4xl md:text-5xl mt-4 leading-tight">
              Один час<br />от&nbsp;стола флориста<br />до&nbsp;вашего порога.
            </h2>
          </div>
          <div className="lg:col-span-7 grid sm:grid-cols-3 gap-10">
            {[
              { n: "01", t: "Заказ", d: "Оставляете заявку — менеджер перезванивает в течение пяти минут, подтверждает букет и адрес." },
              { n: "02", t: "Сборка", d: "Флорист собирает букет руками из свежих стеблей, упаковывает в крафт и шёлковую ленту." },
              { n: "03", t: "Курьер", d: "Доставляем по Москве в пределах МКАД за один час. Бережно, в фирменной коробке-переноске." },
            ].map((s) => (
              <div key={s.n}>
                <div className="serif text-3xl text-[color:var(--blush)]">{s.n}</div>
                <h3 className="serif text-2xl mt-4">{s.t}</h3>
                <p className="mt-3 text-sm text-[color:var(--cream)]/70 leading-relaxed">
                  {s.d}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* STORY */}
      <section id="story" className="border-b border-border/60">
        <div className="mx-auto max-w-[1100px] px-6 lg:px-12 py-24 lg:py-32 text-center">
          <span className="text-xs uppercase tracking-[0.3em] text-[color:var(--sage)]">
            про нас
          </span>
          <p className="serif text-3xl md:text-4xl mt-8 leading-snug">
            «Мы открыли ателье на&nbsp;Ордынке весной 2021&nbsp;года — потому&nbsp;что
            не&nbsp;хватало места, где тюльпаны не&nbsp;завёрнуты в&nbsp;фольгу
            и&nbsp;не&nbsp;продаются <em>сто&nbsp;одна&nbsp;штука</em>.»
          </p>
          <p className="mt-10 text-sm uppercase tracking-[0.25em] text-muted-foreground">
            Анна Левина, основательница
          </p>
        </div>
      </section>
    </SiteLayout>
  );
}
