import { useEffect, useRef, useState } from "react";
import { MessageCircle, X, Send, User, Headset } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import ReactMarkdown from "react-markdown";
import { useMutation } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { startConversation, sendUserMessage } from "@/lib/chat.functions";
import { cn } from "@/lib/utils";

type Msg = {
  id: string;
  role: string;
  content: string;
  created_at: string;
};

const STORAGE_KEY = "tulpa_chat_id";

export function ChatWidget() {
  const [open, setOpen] = useState(false);
  const [convId, setConvId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [status, setStatus] = useState<string>("bot");
  const [input, setInput] = useState("");
  const [form, setForm] = useState({ name: "", phone: "", agree: false });
  const scrollRef = useRef<HTMLDivElement>(null);
  const startFn = useServerFn(startConversation);
  const sendFn = useServerFn(sendUserMessage);

  // Restore session
  useEffect(() => {
    if (typeof window === "undefined") return;
    const id = localStorage.getItem(STORAGE_KEY);
    if (id) setConvId(id);
  }, []);

  // Load messages + subscribe when convId is known
  useEffect(() => {
    if (!convId) return;
    let mounted = true;

    (async () => {
      const { data: conv } = await supabase
        .from("chat_conversations")
        .select("status")
        .eq("id", convId)
        .maybeSingle();
      if (!mounted) return;
      if (!conv) {
        localStorage.removeItem(STORAGE_KEY);
        setConvId(null);
        return;
      }
      setStatus(conv.status);
      const { data: msgs } = await supabase
        .from("chat_messages")
        .select("id, role, content, created_at")
        .eq("conversation_id", convId)
        .order("created_at", { ascending: true });
      if (mounted && msgs) setMessages(msgs);
    })();

    const channel = supabase
      .channel(`chat-${convId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "chat_messages",
          filter: `conversation_id=eq.${convId}`,
        },
        (payload) => {
          const m = payload.new as Msg;
          setMessages((prev) => (prev.some((p) => p.id === m.id) ? prev : [...prev, m]));
        },
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "chat_conversations",
          filter: `id=eq.${convId}`,
        },
        (payload) => {
          const c = payload.new as { status: string };
          setStatus(c.status);
        },
      )
      .subscribe();

    return () => {
      mounted = false;
      supabase.removeChannel(channel);
    };
  }, [convId]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, open]);

  const startMut = useMutation({
    mutationFn: async () => {
      if (!form.name.trim() || form.phone.trim().length < 5) {
        throw new Error("Заполните имя и телефон");
      }
      if (!form.agree) throw new Error("Примите политику конфиденциальности");
      const res = await startFn({
        data: { name: form.name.trim(), phone: form.phone.trim() },
      });
      return res.id;
    },
    onSuccess: (id) => {
      localStorage.setItem(STORAGE_KEY, id);
      setConvId(id);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const sendMut = useMutation({
    mutationFn: async (text: string) => {
      if (!convId) return;
      await sendFn({ data: { conversationId: convId, text } });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const t = input.trim();
    if (!t || sendMut.isPending) return;
    setInput("");
    sendMut.mutate(t);
  };

  const reset = () => {
    localStorage.removeItem(STORAGE_KEY);
    setConvId(null);
    setMessages([]);
    setForm({ name: "", phone: "", agree: false });
  };

  return (
    <>
      {/* Floating button */}
      <button
        onClick={() => setOpen((v) => !v)}
        className="fixed bottom-6 right-6 z-50 h-14 w-14 rounded-full bg-[color:var(--ink)] text-[color:var(--cream)] shadow-lg flex items-center justify-center hover:bg-[color:var(--sage)] transition-colors"
        aria-label={open ? "Закрыть чат" : "Открыть чат"}
      >
        <AnimatePresence mode="wait" initial={false}>
          {open ? (
            <motion.span key="x" initial={{ rotate: -90, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }} exit={{ rotate: 90, opacity: 0 }}>
              <X className="h-6 w-6" />
            </motion.span>
          ) : (
            <motion.span key="m" initial={{ rotate: 90, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }} exit={{ rotate: -90, opacity: 0 }}>
              <MessageCircle className="h-6 w-6" />
            </motion.span>
          )}
        </AnimatePresence>
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 16, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 16, scale: 0.98 }}
            transition={{ duration: 0.2 }}
            className="fixed bottom-24 right-6 z-50 w-[calc(100vw-3rem)] sm:w-[380px] h-[70vh] sm:h-[560px] max-h-[720px] bg-[color:var(--cream)] border border-border shadow-2xl flex flex-col overflow-hidden"
          >
            {/* Header */}
            <div className="px-5 py-4 border-b border-border flex items-center justify-between bg-[color:var(--ink)] text-[color:var(--cream)]">
              <div>
                <div className="serif text-lg">tюlpa · чат</div>
                <div className="text-[10px] uppercase tracking-[0.2em] text-[color:var(--cream)]/70">
                  {status === "operator"
                    ? "оператор на линии"
                    : status === "waiting_operator"
                      ? "ждём оператора"
                      : status === "closed"
                        ? "беседа закрыта"
                        : "консультант · ИИ"}
                </div>
              </div>
              {convId && (
                <button
                  onClick={reset}
                  className="text-[10px] uppercase tracking-[0.2em] text-[color:var(--cream)]/70 hover:text-[color:var(--blush)]"
                >
                  сброс
                </button>
              )}
            </div>

            {!convId ? (
              <RegistrationForm
                form={form}
                setForm={setForm}
                onSubmit={() => startMut.mutate()}
                pending={startMut.isPending}
              />
            ) : (
              <>
                {/* Messages */}
                <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
                  {messages.length === 0 && (
                    <div className="text-center text-xs text-muted-foreground py-8">Загружаем беседу…</div>
                  )}
                  {messages.map((m) => (
                    <MessageBubble key={m.id} message={m} />
                  ))}
                  {sendMut.isPending && (
                    <div className="text-xs text-muted-foreground pl-1">печатает…</div>
                  )}
                </div>

                {/* Composer */}
                <form onSubmit={submit} className="border-t border-border p-3 flex gap-2">
                  <input
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    placeholder={status === "closed" ? "Беседа закрыта" : "Ваше сообщение…"}
                    disabled={status === "closed" || sendMut.isPending}
                    className="flex-1 bg-transparent border border-border px-3 py-2 text-sm focus:outline-none focus:border-[color:var(--ink)] disabled:opacity-50"
                  />
                  <button
                    type="submit"
                    disabled={!input.trim() || sendMut.isPending || status === "closed"}
                    className="bg-[color:var(--ink)] text-[color:var(--cream)] px-3 hover:bg-[color:var(--sage)] disabled:opacity-40"
                  >
                    <Send className="h-4 w-4" />
                  </button>
                </form>
              </>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

function MessageBubble({ message }: { message: Msg }) {
  if (message.role === "system") {
    return (
      <div className="text-center text-[10px] uppercase tracking-[0.2em] text-muted-foreground py-1">
        {message.content}
      </div>
    );
  }
  const isUser = message.role === "user";
  const isOperator = message.role === "operator";
  return (
    <div className={cn("flex gap-2", isUser ? "justify-end" : "justify-start")}>
      {!isUser && (
        <div className="h-6 w-6 rounded-full bg-[color:var(--sage)]/20 text-[color:var(--sage)] flex items-center justify-center shrink-0 mt-0.5">
          {isOperator ? <Headset className="h-3 w-3" /> : <span className="text-[10px] serif">t</span>}
        </div>
      )}
      <div
        className={cn(
          "max-w-[80%] px-3 py-2 text-sm leading-relaxed",
          isUser
            ? "bg-[color:var(--ink)] text-[color:var(--cream)]"
            : isOperator
              ? "bg-[color:var(--blush)]/40 text-[color:var(--ink)]"
              : "bg-[color:var(--secondary)] text-[color:var(--ink)]",
        )}
      >
        <div className="prose prose-sm max-w-none prose-p:my-1 prose-ul:my-1">
          <ReactMarkdown>{message.content}</ReactMarkdown>
        </div>
      </div>
      {isUser && (
        <div className="h-6 w-6 rounded-full bg-[color:var(--ink)] text-[color:var(--cream)] flex items-center justify-center shrink-0 mt-0.5">
          <User className="h-3 w-3" />
        </div>
      )}
    </div>
  );
}

function RegistrationForm({
  form,
  setForm,
  onSubmit,
  pending,
}: {
  form: { name: string; phone: string; agree: boolean };
  setForm: (f: { name: string; phone: string; agree: boolean }) => void;
  onSubmit: () => void;
  pending: boolean;
}) {
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit();
      }}
      className="flex-1 flex flex-col justify-center px-6 py-8 space-y-4"
    >
      <div>
        <p className="serif text-2xl leading-snug">
          Здравствуйте.<br />
          <span className="text-[color:var(--blush)]">Подберём букет?</span>
        </p>
        <p className="mt-3 text-sm text-muted-foreground leading-relaxed">
          Оставьте имя и телефон — начнём беседу. Если понадобится, к чату подключится живой флорист.
        </p>
      </div>
      <div>
        <label className="block text-[10px] uppercase tracking-[0.2em] text-muted-foreground mb-1">Имя</label>
        <input
          value={form.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
          placeholder="Анна"
          className="w-full bg-transparent border border-border px-3 py-2 text-sm focus:outline-none focus:border-[color:var(--ink)]"
        />
      </div>
      <div>
        <label className="block text-[10px] uppercase tracking-[0.2em] text-muted-foreground mb-1">Телефон</label>
        <input
          type="tel"
          value={form.phone}
          onChange={(e) => setForm({ ...form, phone: e.target.value })}
          placeholder="+7 (___) ___-__-__"
          className="w-full bg-transparent border border-border px-3 py-2 text-sm focus:outline-none focus:border-[color:var(--ink)]"
        />
      </div>
      <label className="flex items-start gap-2 text-xs text-muted-foreground leading-relaxed cursor-pointer">
        <input
          type="checkbox"
          checked={form.agree}
          onChange={(e) => setForm({ ...form, agree: e.target.checked })}
          className="mt-0.5"
        />
        <span>
          Согласен с{" "}
          <a href="/privacy" target="_blank" className="underline">
            политикой конфиденциальности
          </a>
        </span>
      </label>
      <button
        type="submit"
        disabled={pending}
        className="w-full bg-[color:var(--ink)] text-[color:var(--cream)] py-3 text-sm uppercase tracking-[0.2em] hover:bg-[color:var(--sage)] transition-colors disabled:opacity-60"
      >
        {pending ? "Открываем…" : "Начать чат"}
      </button>
    </form>
  );
}