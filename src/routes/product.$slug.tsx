import { createFileRoute, Link, notFound, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { SiteLayout } from "@/components/site-layout";
import { supabase } from "@/integrations/supabase/client";
import { resolveProductImage } from "@/lib/product-images";
import { formatPrice } from "@/lib/format";
import { useCart } from "@/lib/cart-store";

export const Route = createFileRoute("/product/$slug")({
  component: ProductPage,
  notFoundComponent: () => (
    <SiteLayout>
      <div className="mx-auto max-w-3xl px-6 py-32 text-center">
        <h1 className="serif text-4xl">Букет не найден</h1>
        <p className="mt-4 text-muted-foreground">
          Возможно, его уже разобрали. Загляните в каталог.
        </p>
        <Link to="/catalog" className="inline-block mt-8 underline">
          В каталог
        </Link>
      </div>
    </SiteLayout>
  ),
  errorComponent: ({ error }) => (
    <SiteLayout>
      <div className="mx-auto max-w-3xl px-6 py-32 text-center">
        <h1 className="serif text-3xl">Что-то пошло не так</h1>
        <p className="mt-4 text-sm text-muted-foreground">{error.message}</p>
      </div>
    </SiteLayout>
  ),
});

function ProductPage() {
  const { slug } = Route.useParams();
  const navigate = useNavigate();
  const [qty, setQty] = useState(1);
  const add = useCart((s) => s.add);

  const { data: product, isLoading } = useQuery({
    queryKey: ["product", slug],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("products")
        .select("*")
        .eq("slug", slug)
        .eq("is_active", true)
        .maybeSingle();
      if (error) throw error;
      if (!data) throw notFound();
      return data;
    },
  });

  if (isLoading) {
    return (
      <SiteLayout>
        <div className="py-32 text-center text-muted-foreground">Загружаем букет…</div>
      </SiteLayout>
    );
  }
  if (!product) return null;

  const handleAdd = () => {
    add(
      {
        productId: product.id,
        slug: product.slug,
        name: product.name,
        price: product.price,
        image_url: product.image_url,
      },
      qty,
    );
    toast.success(`«${product.name}» — в корзине`, {
      action: { label: "К корзине", onClick: () => navigate({ to: "/cart" }) },
    });
  };

  return (
    <SiteLayout>
      <section className="mx-auto max-w-[1400px] px-6 lg:px-12 pt-12 lg:pt-16 pb-24">
        <Link to="/catalog" className="text-xs uppercase tracking-[0.25em] text-muted-foreground hover:text-[color:var(--sage)]">
          ← Все букеты
        </Link>
        <div className="mt-8 grid lg:grid-cols-12 gap-10 lg:gap-16">
          <div className="lg:col-span-7">
            <div className="aspect-[4/5] overflow-hidden bg-[color:var(--secondary)]">
              <img
                src={resolveProductImage(product.image_url)}
                alt={product.name}
                className="w-full h-full object-cover"
              />
            </div>
          </div>
          <div className="lg:col-span-5 lg:pt-10">
            <span className="text-xs uppercase tracking-[0.3em] text-[color:var(--sage)]">
              букет
            </span>
            <h1 className="serif text-5xl md:text-6xl mt-4">{product.name}</h1>
            <div className="mt-6 serif text-3xl">{formatPrice(product.price)}</div>
            <p className="mt-8 text-base leading-relaxed text-muted-foreground">
              {product.description}
            </p>

            {product.composition && (
              <div className="mt-10">
                <div className="text-xs uppercase tracking-[0.25em] text-muted-foreground mb-3">
                  состав
                </div>
                <p className="text-sm">{product.composition}</p>
              </div>
            )}

            <div className="mt-10 flex items-center gap-6">
              <div className="flex items-center border border-border">
                <button
                  onClick={() => setQty((q) => Math.max(1, q - 1))}
                  className="px-4 py-3 hover:bg-secondary"
                  aria-label="Меньше"
                >
                  −
                </button>
                <span className="px-5 min-w-12 text-center">{qty}</span>
                <button
                  onClick={() => setQty((q) => q + 1)}
                  className="px-4 py-3 hover:bg-secondary"
                  aria-label="Больше"
                >
                  +
                </button>
              </div>
              <button
                onClick={handleAdd}
                className="flex-1 bg-[color:var(--ink)] text-[color:var(--cream)] px-7 py-4 text-sm uppercase tracking-[0.2em] hover:bg-[color:var(--sage)] transition-colors"
              >
                В корзину
              </button>
            </div>

            <div className="mt-12 hairline pt-6 text-sm text-muted-foreground leading-relaxed">
              <p>
                Доставим за&nbsp;один час по&nbsp;Москве в&nbsp;пределах МКАД.
                За&nbsp;МКАД — рассчитаем индивидуально.
              </p>
            </div>
          </div>
        </div>
      </section>
    </SiteLayout>
  );
}