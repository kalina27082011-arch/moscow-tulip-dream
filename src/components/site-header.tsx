import { Link, useRouterState } from "@tanstack/react-router";
import { useCart } from "@/lib/cart-store";
import { useEffect, useState } from "react";

const NAV = [
  { to: "/catalog", label: "Каталог" },
  { to: "/delivery", label: "Доставка" },
  { to: "/#story", label: "О нас" },
];

export function SiteHeader() {
  const count = useCart((s) => s.count());
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  return (
    <header className="sticky top-0 z-40 backdrop-blur-md bg-[color:var(--cream)]/85 border-b border-border/60">
      <div className="mx-auto max-w-[1400px] px-6 lg:px-12 h-16 flex items-center justify-between">
        <Link to="/" className="serif text-2xl tracking-tight">
          tюlpa
          <span className="text-[color:var(--blush)]">.</span>
        </Link>
        <nav className="hidden md:flex items-center gap-10 text-sm">
          {NAV.map((n) => (
            <a
              key={n.to}
              href={n.to}
              className={`hover:text-[color:var(--sage)] transition-colors ${
                pathname === n.to ? "text-[color:var(--sage)]" : ""
              }`}
            >
              {n.label}
            </a>
          ))}
        </nav>
        <Link
          to="/cart"
          className="group flex items-center gap-2 text-sm hover:text-[color:var(--sage)] transition-colors"
        >
          <span className="serif text-lg">Корзина</span>
          <span className="inline-flex items-center justify-center min-w-6 h-6 px-1.5 rounded-full bg-[color:var(--ink)] text-[color:var(--cream)] text-xs">
            {mounted ? count : 0}
          </span>
        </Link>
      </div>
    </header>
  );
}