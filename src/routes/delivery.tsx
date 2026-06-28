import { createFileRoute } from "@tanstack/react-router";
import { SiteLayout } from "@/components/site-layout";

export const Route = createFileRoute("/delivery")({
  head: () => ({
    meta: [
      { title: "Доставка — tюlpa" },
      { name: "description", content: "Доставка букетов тюльпанов по Москве за один час. Условия, зоны и время доставки." },
    ],
  }),
  component: Delivery,
});

function Delivery() {
  return (
    <SiteLayout>
      <section className="mx-auto max-w-[1000px] px-6 lg:px-12 pt-16 lg:pt-24 pb-24">
        <span className="text-xs uppercase tracking-[0.3em] text-[color:var(--sage)]">
          доставка
        </span>
        <h1 className="serif text-5xl md:text-6xl mt-4">Один час по&nbsp;Москве</h1>
        <p className="mt-8 text-lg leading-relaxed text-muted-foreground max-w-2xl">
          Мы доставляем букеты в&nbsp;пределах МКАД ровно за&nbsp;один час с&nbsp;момента подтверждения
          заказа. За&nbsp;МКАД, в&nbsp;Новую Москву и&nbsp;ближнее Подмосковье — обсудим время и&nbsp;стоимость в&nbsp;звонке.
        </p>

        <div className="mt-16 grid md:grid-cols-2 gap-10">
          {[
            { t: "В пределах МКАД", d: "Доставка за&nbsp;один час. Стоимость — 490&nbsp;₽, бесплатно при заказе от&nbsp;5&nbsp;000&nbsp;₽." },
            { t: "Новая Москва, область", d: "Доставка от&nbsp;90&nbsp;минут. Стоимость — от&nbsp;990&nbsp;₽, рассчитываем по&nbsp;адресу." },
            { t: "К конкретному часу", d: "Можем привезти к&nbsp;нужной минуте — например, к&nbsp;началу ужина или окончанию рейса." },
            { t: "Анонимная доставка", d: "Курьер не&nbsp;называет имя отправителя, передаёт открытку, не&nbsp;беспокоит лишними звонками." },
          ].map((b) => (
            <div key={b.t} className="border-t border-border pt-6">
              <h3 className="serif text-2xl">{b.t}</h3>
              <p
                className="mt-3 text-sm text-muted-foreground leading-relaxed"
                dangerouslySetInnerHTML={{ __html: b.d }}
              />
            </div>
          ))}
        </div>

        <div className="mt-20 bg-[color:var(--ink)] text-[color:var(--cream)] p-10">
          <h3 className="serif text-3xl">Бережно в&nbsp;любую погоду</h3>
          <p className="mt-4 text-sm text-[color:var(--cream)]/70 leading-relaxed max-w-xl">
            Зимой мы упаковываем букет в&nbsp;термокороб с&nbsp;грелкой, летом — в&nbsp;коробку с&nbsp;охлаждением.
            Курьер не&nbsp;кладёт цветы в&nbsp;багажник: только в&nbsp;салон, бутонами вверх.
          </p>
        </div>
      </section>
    </SiteLayout>
  );
}