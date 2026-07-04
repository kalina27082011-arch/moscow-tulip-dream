import { Link } from "@tanstack/react-router";

export function SiteFooter() {
  return (
    <footer className="mt-32 border-t border-border/60 bg-[color:var(--cream)]">
      <div className="mx-auto max-w-[1400px] px-6 lg:px-12 py-16 grid gap-12 md:grid-cols-4">
        <div>
          <div className="serif text-3xl mb-4">
            tюlpa<span className="text-[color:var(--blush)]">.</span>
          </div>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Букеты тюльпанов с доставкой по&nbsp;Москве за&nbsp;один час.
            Ателье на&nbsp;Большой Ордынке.
          </p>
        </div>
        <div>
          <h4 className="text-xs uppercase tracking-[0.2em] text-muted-foreground mb-4">
            Магазин
          </h4>
          <ul className="space-y-2 text-sm">
            <li><Link to="/catalog" className="hover:text-[color:var(--sage)]">Каталог</Link></li>
            <li><Link to="/cart" className="hover:text-[color:var(--sage)]">Корзина</Link></li>
            <li><Link to="/delivery" className="hover:text-[color:var(--sage)]">Доставка</Link></li>
          </ul>
        </div>
        <div>
          <h4 className="text-xs uppercase tracking-[0.2em] text-muted-foreground mb-4">
            Документы
          </h4>
          <ul className="space-y-2 text-sm">
            <li><Link to="/privacy" className="hover:text-[color:var(--sage)]">Политика конфиденциальности</Link></li>
            <li><Link to="/offer" className="hover:text-[color:var(--sage)]">Публичная оферта</Link></li>
          </ul>
        </div>
        <div>
          <h4 className="text-xs uppercase tracking-[0.2em] text-muted-foreground mb-4">
            Контакты
          </h4>
          <ul className="space-y-2 text-sm">
            <li>Москва, Большая Ордынка, 24</li>
            <li>Каждый день, 8:00&nbsp;—&nbsp;22:00</li>
            <li><a href="tel:+74951234567" className="hover:text-[color:var(--sage)]">+7&nbsp;(495)&nbsp;123-45-67</a></li>
            <li><a href="mailto:hello@tulpa.moscow" className="hover:text-[color:var(--sage)]">hello@tulpa.moscow</a></li>
          </ul>
        </div>
      </div>
      <div className="border-t border-border/60">
        <div className="mx-auto max-w-[1400px] px-6 lg:px-12 py-6 flex flex-wrap items-center justify-between text-xs text-muted-foreground">
          <Link to="/auth" className="hover:text-[color:var(--sage)]">Вход для владельца</Link>
          <span className="pr-16 sm:pr-0">© {new Date().getFullYear()} tюlpa — ателье цветов</span>
        </div>
      </div>
    </footer>
  );
}