import { createFileRoute } from "@tanstack/react-router";
import { SiteLayout } from "@/components/site-layout";

export const Route = createFileRoute("/privacy")({
  head: () => ({ meta: [{ title: "Политика конфиденциальности — tюlpa" }] }),
  component: Privacy,
});

function Privacy() {
  return (
    <SiteLayout>
      <article className="mx-auto max-w-[820px] px-6 lg:px-12 pt-16 lg:pt-24 pb-24">
        <span className="text-xs uppercase tracking-[0.3em] text-[color:var(--sage)]">документ</span>
        <h1 className="serif text-5xl mt-4">Политика конфиденциальности</h1>
        <p className="mt-4 text-sm text-muted-foreground">Действует с&nbsp;1&nbsp;марта 2024&nbsp;года.</p>

        <div className="mt-12 space-y-8 text-[15px] leading-relaxed">
          <Section title="1. Общие положения">
            Настоящая Политика описывает, какие персональные данные собирает ателье цветов «tюlpa»
            (далее — «мы»), для каких целей мы их используем и&nbsp;как защищаем.
            Оформляя заявку на&nbsp;сайте, вы соглашаетесь с&nbsp;условиями Политики.
          </Section>
          <Section title="2. Какие данные мы собираем">
            Имя получателя и&nbsp;отправителя, номер телефона, адрес доставки, комментарий к&nbsp;заказу,
            а&nbsp;также технические данные (IP-адрес, тип браузера, страницы посещений) — для аналитики и&nbsp;безопасности.
          </Section>
          <Section title="3. Цели обработки">
            Подтверждение и&nbsp;доставка заказа, связь с&nbsp;клиентом, рассылка о&nbsp;статусе заявки,
            улучшение сервиса, исполнение требований законодательства.
          </Section>
          <Section title="4. Передача третьим лицам">
            Мы передаём данные только курьерской службе для доставки и&nbsp;контролируем сохранность.
            Никаким маркетинговым партнёрам данные не&nbsp;передаются.
          </Section>
          <Section title="5. Хранение и&nbsp;защита">
            Данные хранятся в&nbsp;защищённых базах данных с&nbsp;шифрованием. Срок хранения — не&nbsp;более 3&nbsp;лет
            после последнего заказа.
          </Section>
          <Section title="6. Ваши права">
            Вы можете запросить копию своих данных, попросить их исправить или удалить,
            написав на&nbsp;hello@tulpa.moscow.
          </Section>
          <Section title="7. Контакты">
            ИП Левина А.&nbsp;С., ИНН 770000000000, Москва, Большая Ордынка, 24.
            Электронная почта: hello@tulpa.moscow.
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