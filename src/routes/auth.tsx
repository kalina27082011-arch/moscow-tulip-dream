import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { SiteLayout } from "@/components/site-layout";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/auth")({
  head: () => ({ meta: [{ title: "Вход для владельца — tюlpa" }] }),
  component: AuthPage,
});

function AuthPage() {
  const [mode, setMode] = useState<"sign-in" | "sign-up">("sign-in");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (mode === "sign-up") {
        const redirect = `${window.location.origin}/admin`;
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: { emailRedirectTo: redirect },
        });
        if (error) throw error;
        // Try to claim as the first owner immediately.
        try { await supabase.rpc("claim_first_admin"); } catch { /* noop */ }
        toast.success("Аккаунт создан. Если включена верификация — проверьте почту.");
        navigate({ to: "/admin" });
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        try { await supabase.rpc("claim_first_admin"); } catch { /* noop */ }
        toast.success("Добро пожаловать");
        navigate({ to: "/admin" });
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Не удалось войти");
    } finally {
      setLoading(false);
    }
  };

  return (
    <SiteLayout>
      <section className="mx-auto max-w-[460px] px-6 pt-20 pb-32">
        <span className="text-xs uppercase tracking-[0.3em] text-[color:var(--sage)]">
          служебный вход
        </span>
        <h1 className="serif text-4xl mt-4">Кабинет владельца</h1>
        <p className="mt-4 text-sm text-muted-foreground">
          Здесь принимают заявки и&nbsp;обновляют каталог. Первый зарегистрированный пользователь
          автоматически становится администратором.
        </p>

        <form onSubmit={handleSubmit} className="mt-10 space-y-4">
          <div>
            <label className="block text-xs uppercase tracking-[0.2em] text-muted-foreground mb-2">
              Email
            </label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full bg-transparent border border-border px-3 py-3 text-sm"
            />
          </div>
          <div>
            <label className="block text-xs uppercase tracking-[0.2em] text-muted-foreground mb-2">
              Пароль
            </label>
            <input
              type="password"
              required
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-transparent border border-border px-3 py-3 text-sm"
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-[color:var(--ink)] text-[color:var(--cream)] py-4 text-sm uppercase tracking-[0.2em] hover:bg-[color:var(--sage)] disabled:opacity-60"
          >
            {loading ? "…" : mode === "sign-in" ? "Войти" : "Создать аккаунт"}
          </button>
          <button
            type="button"
            onClick={() => setMode((m) => (m === "sign-in" ? "sign-up" : "sign-in"))}
            className="w-full text-xs uppercase tracking-[0.2em] text-muted-foreground hover:text-[color:var(--sage)]"
          >
            {mode === "sign-in" ? "Зарегистрироваться" : "У меня уже есть аккаунт"}
          </button>
        </form>
      </section>
    </SiteLayout>
  );
}