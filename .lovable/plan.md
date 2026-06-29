## Проблема

В каталоге карточки не грузятся. Запросы к `products` падают с 401:
`permission denied for function has_role`.

Причина: RLS-политика `public can read active products` вызывает `public.has_role(...)` в `USING`, но роль `anon` (а также `authenticated`) не имеет права `EXECUTE` на эту функцию. PostgREST выполняет проверку политики от имени анонимного пользователя — и падает ещё до фильтрации по `is_active`.

## Исправление

Одна миграция:

1. `GRANT EXECUTE ON FUNCTION public.has_role(uuid, app_role) TO anon, authenticated;`
2. На всякий случай переписать политику чтения каталога так, чтобы анонимам вообще не требовался `has_role`:
   - `DROP POLICY "public can read active products" ON public.products;`
   - Создать две политики:
     - `anon read active products` — `TO anon USING (is_active = true)`
     - `auth read products` — `TO authenticated USING (is_active = true OR has_role(auth.uid(), 'admin'))`

После миграции каталог снова отдаст 18 букетов. Код фронтенда менять не нужно.
