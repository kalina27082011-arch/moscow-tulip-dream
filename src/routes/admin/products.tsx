import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { resolveProductImage } from "@/lib/product-images";
import { formatPrice } from "@/lib/format";
import type { Tables } from "@/integrations/supabase/types";

type Product = Tables<"products">;

export const Route = createFileRoute("/admin/products")({
  component: ProductsAdmin,
});

const EMPTY: Partial<Product> = {
  slug: "",
  name: "",
  price: 2900,
  description: "",
  composition: "",
  color_tag: "pink",
  image_url: "tulips-mayya.jpg",
  sort_order: 100,
  is_active: true,
};

const COLORS = [
  { v: "pink", l: "Розовый" },
  { v: "white", l: "Белый" },
  { v: "red", l: "Бордовый" },
  { v: "yellow", l: "Жёлтый" },
  { v: "mixed", l: "Микс" },
];

const productSchema = z.object({
  name: z.string().trim().min(2, "Название слишком короткое").max(120),
  slug: z
    .string()
    .trim()
    .min(2, "Slug обязателен")
    .max(80)
    .regex(/^[a-z0-9-]+$/, "Только латиница, цифры и дефис"),
  price: z.number().int().positive("Цена должна быть больше 0"),
  description: z.string().max(2000).optional().default(""),
  composition: z.string().max(1000).optional().default(""),
  color_tag: z.string().min(1),
  image_url: z.string().min(1, "Выберите изображение"),
  sort_order: z.number().int(),
  is_active: z.boolean(),
});

function slugify(s: string) {
  const map: Record<string, string> = {
    а:"a",б:"b",в:"v",г:"g",д:"d",е:"e",ё:"e",ж:"zh",з:"z",и:"i",й:"i",
    к:"k",л:"l",м:"m",н:"n",о:"o",п:"p",р:"r",с:"s",т:"t",у:"u",ф:"f",
    х:"h",ц:"c",ч:"ch",ш:"sh",щ:"sch",ъ:"",ы:"y",ь:"",э:"e",ю:"yu",я:"ya",
  };
  return s
    .toLowerCase()
    .split("")
    .map((c) => map[c] ?? c)
    .join("")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

function ProductsAdmin() {
  const qc = useQueryClient();
  const [editing, setEditing] = useState<Partial<Product> | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<Product | null>(null);
  const [search, setSearch] = useState("");
  const [colorFilter, setColorFilter] = useState<string>("all");
  const [visibility, setVisibility] = useState<"all" | "active" | "hidden">("all");

  const { data: products, isLoading } = useQuery({
    queryKey: ["admin-products"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("products")
        .select("*")
        .order("sort_order");
      if (error) throw error;
      return data;
    },
  });

  const filtered = useMemo(() => {
    if (!products) return [];
    const q = search.trim().toLowerCase();
    return products.filter((p) => {
      if (q && !p.name.toLowerCase().includes(q) && !p.slug.toLowerCase().includes(q)) return false;
      if (colorFilter !== "all" && p.color_tag !== colorFilter) return false;
      if (visibility === "active" && !p.is_active) return false;
      if (visibility === "hidden" && p.is_active) return false;
      return true;
    });
  }, [products, search, colorFilter, visibility]);

  const save = useMutation({
    mutationFn: async (p: Partial<Product>) => {
      const parsed = productSchema.safeParse({
        name: p.name ?? "",
        slug: p.slug ?? "",
        price: Number(p.price) || 0,
        description: p.description ?? "",
        composition: p.composition ?? "",
        color_tag: p.color_tag ?? "pink",
        image_url: p.image_url ?? "",
        sort_order: Number(p.sort_order) || 100,
        is_active: p.is_active ?? true,
      });
      if (!parsed.success) {
        throw new Error(parsed.error.errors[0]?.message ?? "Проверьте поля");
      }
      const payload = parsed.data;
      if (p.id) {
        const { error } = await supabase.from("products").update(payload).eq("id", p.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("products").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-products"] });
      qc.invalidateQueries({ queryKey: ["products", "all"] });
      qc.invalidateQueries({ queryKey: ["products", "featured"] });
      toast.success("Сохранено");
      setEditing(null);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("products").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-products"] });
      toast.success("Удалено");
      setConfirmDelete(null);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const toggleActive = useMutation({
    mutationFn: async (p: Product) => {
      const { error } = await supabase
        .from("products")
        .update({ is_active: !p.is_active })
        .eq("id", p.id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-products"] });
      qc.invalidateQueries({ queryKey: ["products", "all"] });
      qc.invalidateQueries({ queryKey: ["products", "featured"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const duplicate = useMutation({
    mutationFn: async (p: Product) => {
      const { id: _id, created_at: _c, updated_at: _u, ...rest } = p;
      const { error } = await supabase.from("products").insert({
        ...rest,
        name: `${p.name} (копия)`,
        slug: `${p.slug}-copy-${Math.random().toString(36).slice(2, 6)}`,
        is_active: false,
        sort_order: (p.sort_order ?? 100) + 1,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-products"] });
      toast.success("Дубликат создан (скрыт)");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div>
      <div className="flex items-end justify-between mb-8">
        <div>
          <h1 className="serif text-4xl">Букеты</h1>
          <p className="text-sm text-muted-foreground mt-2">
            Показано {filtered.length} из {products?.length ?? 0}
          </p>
        </div>
        <button
          onClick={() => setEditing(EMPTY)}
          className="bg-[color:var(--ink)] text-[color:var(--cream)] px-5 py-3 text-xs uppercase tracking-[0.2em] hover:bg-[color:var(--sage)]"
        >
          + Новый букет
        </button>
      </div>

      <div className="flex flex-wrap gap-3 mb-8 items-center">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Поиск по названию или slug…"
          className="flex-1 min-w-[200px] bg-transparent border border-border px-3 py-2 text-sm"
        />
        <select
          value={colorFilter}
          onChange={(e) => setColorFilter(e.target.value)}
          className="bg-transparent border border-border px-3 py-2 text-sm"
        >
          <option value="all">Все цвета</option>
          {COLORS.map((c) => <option key={c.v} value={c.v}>{c.l}</option>)}
        </select>
        <select
          value={visibility}
          onChange={(e) => setVisibility(e.target.value as "all" | "active" | "hidden")}
          className="bg-transparent border border-border px-3 py-2 text-sm"
        >
          <option value="all">Все</option>
          <option value="active">Только активные</option>
          <option value="hidden">Только скрытые</option>
        </select>
      </div>

      {isLoading ? (
        <p className="text-muted-foreground">Загружаем…</p>
      ) : filtered.length === 0 ? (
        <p className="text-muted-foreground">Ничего не найдено.</p>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-x-6 gap-y-10">
          {filtered.map((p) => (
            <div key={p.id} className="group">
              <div className="aspect-[3/4] bg-[color:var(--secondary)] overflow-hidden relative">
                <img
                  src={resolveProductImage(p.image_url)}
                  alt={p.name}
                  className="w-full h-full object-cover"
                />
                {!p.is_active && (
                  <div className="absolute inset-0 bg-[color:var(--ink)]/70 text-[color:var(--cream)] flex items-center justify-center text-xs uppercase tracking-[0.25em]">
                    скрыт
                  </div>
                )}
              </div>
              <div className="mt-4 flex items-baseline justify-between">
                <h3 className="serif text-xl">{p.name}</h3>
                <span className="text-sm text-muted-foreground">{formatPrice(p.price)}</span>
              </div>
              <div className="mt-1 text-xs text-muted-foreground">/{p.slug}</div>
              <div className="mt-3 flex flex-wrap gap-x-4 gap-y-2 text-xs uppercase tracking-[0.15em]">
                <button
                  onClick={() => setEditing(p)}
                  className="text-[color:var(--ink)] hover:text-[color:var(--sage)]"
                >
                  Редактировать
                </button>
                <button
                  onClick={() => toggleActive.mutate(p)}
                  disabled={toggleActive.isPending}
                  className="text-[color:var(--ink)] hover:text-[color:var(--sage)]"
                >
                  {p.is_active ? "Скрыть" : "Показать"}
                </button>
                <button
                  onClick={() => duplicate.mutate(p)}
                  disabled={duplicate.isPending}
                  className="text-[color:var(--ink)] hover:text-[color:var(--sage)]"
                >
                  Дублировать
                </button>
                <button
                  onClick={() => setConfirmDelete(p)}
                  className="text-muted-foreground hover:text-destructive"
                >
                  Удалить
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {editing && (
        <ProductEditor
          value={editing}
          onChange={setEditing}
          onClose={() => setEditing(null)}
          onSave={() => save.mutate(editing)}
          saving={save.isPending}
        />
      )}

      {confirmDelete && (
        <div className="fixed inset-0 z-50 bg-[color:var(--ink)]/40 flex items-center justify-center p-6">
          <div className="bg-[color:var(--cream)] max-w-md w-full p-6">
            <h3 className="serif text-2xl mb-3">Удалить букет?</h3>
            <p className="text-sm text-muted-foreground mb-6">
              «{confirmDelete.name}» будет удалён безвозвратно. Если хотите просто
              убрать из каталога — используйте «Скрыть».
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setConfirmDelete(null)}
                className="px-5 py-3 text-xs uppercase tracking-[0.2em]"
              >
                Отмена
              </button>
              <button
                onClick={() => remove.mutate(confirmDelete.id)}
                disabled={remove.isPending}
                className="bg-destructive text-destructive-foreground px-6 py-3 text-xs uppercase tracking-[0.2em] disabled:opacity-60"
              >
                {remove.isPending ? "Удаляем…" : "Удалить"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const IMAGE_CHOICES = [
  "tulips-mayya.jpg",
  "tulips-serenada.jpg",
  "tulips-zamoskvorechye.jpg",
  "tulips-noche.jpg",
  "tulips-solntse.jpg",
  "tulips-vesna.jpg",
  "tulips-utro.jpg",
];

function ProductEditor({
  value,
  onChange,
  onClose,
  onSave,
  saving,
}: {
  value: Partial<Product>;
  onChange: (p: Partial<Product>) => void;
  onClose: () => void;
  onSave: () => void;
  saving: boolean;
}) {
  const slugTouched = !!value.id || (value.slug ?? "").length > 0;
  const isCustomUrl = (value.image_url ?? "").startsWith("http");
  return (
    <div className="fixed inset-0 z-50 bg-[color:var(--ink)]/40 flex items-end md:items-center justify-center p-0 md:p-6">
      <div className="bg-[color:var(--cream)] w-full md:max-w-4xl max-h-[92vh] overflow-y-auto">
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <h2 className="serif text-2xl">{value.id ? "Редактировать букет" : "Новый букет"}</h2>
          <button onClick={onClose} className="text-xs uppercase tracking-[0.2em]">Закрыть</button>
        </div>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            onSave();
          }}
          className="p-6 grid md:grid-cols-[1fr_280px] gap-8"
        >
          <div className="space-y-5">
            <Row>
              <Input
                label="Название"
                value={value.name ?? ""}
                onChange={(v) =>
                  onChange({
                    ...value,
                    name: v,
                    slug: !value.id && !slugTouched ? slugify(v) : value.slug,
                  })
                }
                required
              />
              <Input
                label="Slug (URL)"
                value={value.slug ?? ""}
                onChange={(v) => onChange({ ...value, slug: slugify(v) })}
                required
              />
            </Row>
            <Row>
              <Input label="Цена, ₽" type="number" value={String(value.price ?? 0)} onChange={(v) => onChange({ ...value, price: Number(v) })} required />
              <Input label="Сортировка" type="number" value={String(value.sort_order ?? 100)} onChange={(v) => onChange({ ...value, sort_order: Number(v) })} />
            </Row>
            <Row>
              <Select
                label="Цвет"
                value={value.color_tag ?? "pink"}
                onChange={(v) => onChange({ ...value, color_tag: v })}
                options={COLORS.map((c) => ({ v: c.v, l: c.l }))}
              />
              <Select
                label="Изображение из набора"
                value={isCustomUrl ? "__custom" : (value.image_url ?? IMAGE_CHOICES[0])}
                onChange={(v) => {
                  if (v === "__custom") return;
                  onChange({ ...value, image_url: v });
                }}
                options={[
                  ...IMAGE_CHOICES.map((c) => ({ v: c, l: c.replace("tulips-", "").replace(".jpg", "") })),
                  ...(isCustomUrl ? [{ v: "__custom", l: "— своя ссылка —" }] : []),
                ]}
              />
            </Row>
            <Input
              label="Или ссылка на изображение (https://…)"
              value={isCustomUrl ? (value.image_url ?? "") : ""}
              onChange={(v) => onChange({ ...value, image_url: v.trim() || IMAGE_CHOICES[0] })}
            />
            <Textarea label="Описание" value={value.description ?? ""} onChange={(v) => onChange({ ...value, description: v })} />
            <Textarea label="Состав" value={value.composition ?? ""} onChange={(v) => onChange({ ...value, composition: v })} />
            <label className="flex items-center gap-3 text-sm">
              <input
                type="checkbox"
                checked={value.is_active ?? true}
                onChange={(e) => onChange({ ...value, is_active: e.target.checked })}
              />
              Показывать в&nbsp;каталоге
            </label>
            <div className="pt-4 flex gap-3 justify-end border-t border-border">
              <button type="button" onClick={onClose} className="px-5 py-3 text-xs uppercase tracking-[0.2em]">
                Отмена
              </button>
              <button
                type="submit"
                disabled={saving}
                className="bg-[color:var(--ink)] text-[color:var(--cream)] px-6 py-3 text-xs uppercase tracking-[0.2em] hover:bg-[color:var(--sage)] disabled:opacity-60"
              >
                {saving ? "Сохраняем…" : "Сохранить"}
              </button>
            </div>
          </div>
          <div className="hidden md:block">
            <div className="text-xs uppercase tracking-[0.2em] text-muted-foreground mb-3">Превью</div>
            <div className="aspect-[3/4] bg-[color:var(--secondary)] overflow-hidden">
              <img
                src={resolveProductImage(value.image_url)}
                alt={value.name ?? ""}
                className="w-full h-full object-cover"
              />
            </div>
            <div className="mt-3 flex items-baseline justify-between">
              <h3 className="serif text-lg">{value.name || "Без названия"}</h3>
              <span className="text-sm text-muted-foreground">{formatPrice(Number(value.price) || 0)}</span>
            </div>
            <div className="text-xs text-muted-foreground mt-1">/{value.slug || "slug"}</div>
          </div>
        </form>
      </div>
    </div>
  );
}

function Row({ children }: { children: React.ReactNode }) {
  return <div className="grid sm:grid-cols-2 gap-5">{children}</div>;
}
function Input({
  label,
  value,
  onChange,
  type = "text",
  required,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  required?: boolean;
}) {
  return (
    <div>
      <label className="block text-xs uppercase tracking-[0.2em] text-muted-foreground mb-2">{label}</label>
      <input
        type={type}
        value={value}
        required={required}
        onChange={(e) => onChange(e.target.value)}
        className="w-full bg-transparent border border-border px-3 py-2.5 text-sm"
      />
    </div>
  );
}
function Textarea({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div>
      <label className="block text-xs uppercase tracking-[0.2em] text-muted-foreground mb-2">{label}</label>
      <textarea
        rows={3}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full bg-transparent border border-border px-3 py-2.5 text-sm resize-none"
      />
    </div>
  );
}
function Select({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: { v: string; l: string }[];
}) {
  return (
    <div>
      <label className="block text-xs uppercase tracking-[0.2em] text-muted-foreground mb-2">{label}</label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full bg-transparent border border-border px-3 py-2.5 text-sm"
      >
        {options.map((o) => (
          <option key={o.v} value={o.v}>{o.l}</option>
        ))}
      </select>
    </div>
  );
}