GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO anon, authenticated;

DROP POLICY IF EXISTS "public can read active products" ON public.products;

CREATE POLICY "anon read active products"
  ON public.products FOR SELECT
  TO anon
  USING (is_active = true);

CREATE POLICY "auth read products"
  ON public.products FOR SELECT
  TO authenticated
  USING (is_active = true OR public.has_role(auth.uid(), 'admin'));