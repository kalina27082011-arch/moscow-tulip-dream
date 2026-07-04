## Причина

Заявка в БД есть (одна запись от 04.07, «Анна», 6400 ₽, статус `new`), но админ-панель её не видит ни в дашборде, ни в списке заявок, ни в клиентах.

Проверка прав в базе:
```
SELECT grantee, privilege_type FROM information_schema.role_table_grants
WHERE table_schema='public' AND table_name IN ('orders','order_items');
```
показала, что у ролей `anon` и `authenticated` **нет ни одного GRANT** на `public.orders` и `public.order_items`. RLS-политики корректные, но PostgREST сначала проверяет табличные привилегии — без них Data API возвращает пустой результат/ошибку прав, а RLS даже не срабатывает. Поэтому `supabase.from("orders").select(...)` из браузера у админа возвращает пусто.

Для `products` и `user_roles` GRANT'ы уже проставлены — там всё видно.

## Что делаю

Одна миграция, которая добавляет недостающие права ровно там, где нужно, и не трогает существующие политики:

```sql
-- orders: анонимы создают заявки, авторизованные админы читают/меняют
GRANT INSERT ON public.orders TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.orders TO authenticated;
GRANT ALL ON public.orders TO service_role;

-- order_items: анонимы добавляют позиции при оформлении, админы читают/меняют
GRANT INSERT ON public.order_items TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.order_items TO authenticated;
GRANT ALL ON public.order_items TO service_role;
```

Роли `anon` даю только `INSERT` — оформление заказа с публичной страницы (политики `anyone can create order` / `anyone can add order items`). Чтение остаётся закрытым для не-админов через RLS.

## Проверка после миграции

1. `/admin` — на графике за 14 дней появляется точка 04.07 и «Анна» в «Последних заявках».
2. `/admin/orders` — строка с заявкой, открывается Sheet с составом.
3. `/admin/customers` — Анна с 1 заказом и суммой 6 400 ₽.
4. Оформление нового заказа с публичного каталога по-прежнему работает (grant `anon INSERT` сохранён).
