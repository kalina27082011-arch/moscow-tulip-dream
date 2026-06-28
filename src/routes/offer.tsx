import { createFileRoute } from "@tanstack/react-router";
import { SiteLayout } from "@/components/site-layout";

export const Route = createFileRoute("/offer")({
  head: () => ({ meta: [{ title: "Публичная оферта — tюlpa" }] }),
  component: Offer,
});

function Offer() {
  return (
    <SiteLayout>
      <article className="mx-auto max-w-[820px] px-6 lg:px-12 pt-16 lg:pt-24 pb-24">
        <span className="text-xs uppercase tracking-[0.3em] text-[color:var(--sage)]">документ</span>
        <h1 className="serif text-5xl mt-4">Публичная оферта</h1>
        <p className="mt-4 text-sm text-muted-foreground">
          ИП Левина А.&nbsp;С., ИНН&nbsp;770000000000. Действует с&nbsp;1&nbsp;марта 2024&nbsp;года.
        </p>

        <div className="mt-12 space-y-8 text-[15px] leading-relaxed">
          <Section title="1. Предмет оферты">
            Продавец передаёт Покупателю букеты тюльпанов и&nbsp;сопутствующие товары,
            представленные в&nbsp;каталоге на&nbsp;сайте, а&nbsp;Покупатель оплачивает и&nbsp;принимает их в&nbsp;согласованное время и&nbsp;по&nbsp;указанному адресу.
          </Section>
          <Section title="2. Оформление заявки">
            Покупатель оформляет заявку через сайт. Менеджер связывается в&nbsp;течение 5&nbsp;минут
            для подтверждения состава, времени и&nbsp;адреса доставки.
            Оплата производится наличными или банковской картой курьеру, либо по&nbsp;счёту/ссылке после согласования.
          </Section>
          <Section title="3. Стоимость и&nbsp;оплата">
            Стоимость указана в&nbsp;каталоге в&nbsp;рублях с&nbsp;учётом всех налогов.
            Стоимость доставки рассчитывается отдельно по&nbsp;адресу.
          </Section>
          <Section title="4. Доставка">
            Сроки и&nbsp;условия указаны в&nbsp;разделе «Доставка». Покупатель обязуется обеспечить
            возможность принятия букета по&nbsp;указанному адресу в&nbsp;согласованное время.
          </Section>
          <Section title="5. Возврат">
            В&nbsp;силу п.&nbsp;4&nbsp;Перечня непродовольственных товаров надлежащего качества,
            не&nbsp;подлежащих обмену (Пост.&nbsp;Правительства&nbsp;РФ от&nbsp;31.12.2020 №&nbsp;2463),
            свежесрезанные цветы возврату не&nbsp;подлежат. При получении букета ненадлежащего качества
            Покупатель вправе требовать его замены или возврата стоимости, сообщив об&nbsp;этом в&nbsp;течение 2&nbsp;часов с&nbsp;момента доставки.
          </Section>
          <Section title="6. Ответственность">
            Продавец несёт ответственность за&nbsp;качество и&nbsp;своевременность доставки.
            Продавец не&nbsp;отвечает за&nbsp;невозможность передачи букета по&nbsp;причинам, зависящим от&nbsp;Покупателя или получателя.
          </Section>
          <Section title="7. Контакты">
            ИП Левина А.&nbsp;С., Москва, Большая Ордынка, 24. Телефон: +7&nbsp;(495)&nbsp;123-45-67. Email: hello@tulpa.moscow.
          </Section>
        </div>
      </article>
    </SiteLayout>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h2 className="serif text-2xl mb-3">{title}</h2>
      <p className="text-muted-foreground">{children}</p>
    </section>
  );
}