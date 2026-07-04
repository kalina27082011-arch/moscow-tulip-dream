import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Send, Headset, User, Bot } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import { sendOperatorMessage, updateConversationStatus } from "@/lib/chat.functions";
import ReactMarkdown from "react-markdown";

export const Route = createFileRoute("/admin/chats")({
  component: AdminChatsPage,
});

type Conversation = {
  id: string;
  customer_name: string;
  phone: string;
  status: string;
  has_ticket: boolean;
  last_message_at: string;
  created_at: string;
};

type Msg = {
  id: string;
  role: string;
  content: string;
  created_at: string;
};

const STATUS_LABEL: Record<string, string> = {
  bot: "Бот",
  waiting_operator: "Ждёт оператора",
  operator: "Оператор",
  closed: "Закрыт",
};

function AdminChatsPage() {
  const [filter, setFilter] = useState<"all" | "tickets" | "active" | "closed">("all");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const qc = useQueryClient();

  const { data: conversations } = useQuery({
    queryKey: ["admin", "chat_conversations"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("chat_conversations")
        .select("*")
        .order("last_message_at", { ascending: false })
        .limit(200);
      if (error) throw error;
      return data as Conversation[];
    },
    refetchInterval: 15_000,
  });

  // Realtime on conversations list
  useEffect(() => {
    const ch = supabase
      .channel("admin-conversations")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "chat_conversations" },
        () => qc.invalidateQueries({ queryKey: ["admin", "chat_conversations"] }),
      )
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, [qc]);

  const filtered = (conversations ?? []).filter((c) => {
    if (filter === "tickets") return c.has_ticket && c.status !== "closed";
    if (filter === "active") return c.status !== "closed";
    if (filter === "closed") return c.status === "closed";
    return true;
  });

  const selected = filtered.find((c) => c.id === selectedId) ?? filtered[0] ?? null;
  useEffect(() => {
    if (selected && !selectedId) setSelectedId(selected.id);
  }, [selected, selectedId]);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[360px_1fr] gap-6 h-[calc(100vh-8rem)]">
      <div className="border border-border bg-white flex flex-col overflow-hidden">
        <div className="p-3 border-b border-border flex flex-wrap gap-1 text-[10px] uppercase tracking-[0.2em]">
          {(["all", "tickets", "active", "closed"] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={cn(
                "px-2 py-1 border border-border",
                filter === f ? "bg-[color:var(--ink)] text-[color:var(--cream)] border-[color:var(--ink)]" : "",
              )}
            >
              {f === "all" ? "все" : f === "tickets" ? "тикеты" : f === "active" ? "активные" : "закрытые"}
            </button>
          ))}
        </div>
        <div className="flex-1 overflow-y-auto divide-y divide-border">
          {filtered.length === 0 && (
            <div className="p-6 text-sm text-muted-foreground text-center">Нет бесед</div>
          )}
          {filtered.map((c) => (
            <button
              key={c.id}
              onClick={() => setSelectedId(c.id)}
              className={cn(
                "w-full text-left px-4 py-3 hover:bg-secondary/40",
                selectedId === c.id && "bg-secondary/60",
              )}
            >
              <div className="flex items-center justify-between gap-2">
                <div className="serif text-base truncate">{c.customer_name}</div>
                {c.has_ticket && c.status !== "closed" && (
                  <span className="text-[9px] uppercase tracking-[0.2em] bg-[color:var(--blush)] text-[color:var(--ink)] px-1.5 py-0.5">
                    тикет
                  </span>
                )}
              </div>
              <div className="text-xs text-muted-foreground mt-1 flex items-center justify-between">
                <span>{c.phone}</span>
                <span>{STATUS_LABEL[c.status] ?? c.status}</span>
              </div>
              <div className="text-[10px] text-muted-foreground mt-1">
                {new Date(c.last_message_at).toLocaleString("ru-RU")}
              </div>
            </button>
          ))}
        </div>
      </div>

      <div className="border border-border bg-white flex flex-col overflow-hidden">
        {selected ? <ConversationView conversation={selected} /> : (
          <div className="flex-1 flex items-center justify-center text-muted-foreground text-sm">
            Выберите беседу слева
          </div>
        )}
      </div>
    </div>
  );
}

function ConversationView({ conversation }: { conversation: Conversation }) {
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);
  const sendFn = useServerFn(sendOperatorMessage);
  const statusFn = useServerFn(updateConversationStatus);

  useEffect(() => {
    let mounted = true;
    (async () => {
      const { data } = await supabase
        .from("chat_messages")
        .select("id, role, content, created_at")
        .eq("conversation_id", conversation.id)
        .order("created_at", { ascending: true });
      if (mounted && data) setMessages(data);
    })();

    const ch = supabase
      .channel(`admin-chat-${conversation.id}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "chat_messages",
          filter: `conversation_id=eq.${conversation.id}`,
        },
        (payload) => {
          const m = payload.new as Msg;
          setMessages((prev) => (prev.some((p) => p.id === m.id) ? prev : [...prev, m]));
        },
      )
      .subscribe();

    return () => {
      mounted = false;
      supabase.removeChannel(ch);
    };
  }, [conversation.id]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  const sendMut = useMutation({
    mutationFn: async () => {
      const t = input.trim();
      if (!t) return;
      await sendFn({ data: { conversationId: conversation.id, text: t } });
      setInput("");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const statusMut = useMutation({
    mutationFn: async (status: "bot" | "operator" | "closed") => {
      await statusFn({ data: { conversationId: conversation.id, status } });
    },
    onSuccess: () => toast.success("Статус обновлён"),
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <>
      <div className="border-b border-border px-5 py-3 flex items-center justify-between gap-3">
        <div>
          <div className="serif text-lg">{conversation.customer_name}</div>
          <a href={`tel:${conversation.phone}`} className="text-xs text-muted-foreground hover:text-[color:var(--sage)]">
            {conversation.phone}
          </a>
        </div>
        <div className="flex flex-wrap gap-2 text-[10px] uppercase tracking-[0.2em]">
          {conversation.status !== "operator" && (
            <button
              onClick={() => statusMut.mutate("operator")}
              disabled={statusMut.isPending}
              className="px-2 py-1 bg-[color:var(--ink)] text-[color:var(--cream)] hover:bg-[color:var(--sage)]"
            >
              взять в работу
            </button>
          )}
          {conversation.status === "operator" && (
            <button
              onClick={() => statusMut.mutate("bot")}
              disabled={statusMut.isPending}
              className="px-2 py-1 border border-border hover:bg-secondary"
            >
              вернуть боту
            </button>
          )}
          {conversation.status !== "closed" && (
            <button
              onClick={() => statusMut.mutate("closed")}
              disabled={statusMut.isPending}
              className="px-2 py-1 border border-border hover:bg-secondary"
            >
              закрыть
            </button>
          )}
        </div>
      </div>

      <div ref={scrollRef} className="flex-1 overflow-y-auto px-5 py-4 space-y-3 bg-[color:var(--cream)]/40">
        {messages.map((m) => (
          <AdminBubble key={m.id} message={m} />
        ))}
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          sendMut.mutate();
        }}
        className="border-t border-border p-3 flex gap-2"
      >
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ответ клиенту от оператора…"
          disabled={conversation.status === "closed"}
          className="flex-1 bg-transparent border border-border px-3 py-2 text-sm focus:outline-none focus:border-[color:var(--ink)] disabled:opacity-50"
        />
        <button
          type="submit"
          disabled={!input.trim() || sendMut.isPending || conversation.status === "closed"}
          className="bg-[color:var(--ink)] text-[color:var(--cream)] px-3 hover:bg-[color:var(--sage)] disabled:opacity-40"
        >
          <Send className="h-4 w-4" />
        </button>
      </form>
    </>
  );
}

function AdminBubble({ message }: { message: Msg }) {
  if (message.role === "system") {
    return (
      <div className="text-center text-[10px] uppercase tracking-[0.2em] text-muted-foreground py-1">
        {message.content}
      </div>
    );
  }
  const icon =
    message.role === "user" ? <User className="h-3 w-3" /> :
    message.role === "operator" ? <Headset className="h-3 w-3" /> :
    <Bot className="h-3 w-3" />;
  const label = message.role === "user" ? "Клиент" : message.role === "operator" ? "Оператор" : "Бот";
  const isUser = message.role === "user";
  return (
    <div className={cn("flex gap-2", isUser ? "justify-start" : "justify-end")}>
      <div className="max-w-[75%]">
        <div className={cn("text-[10px] uppercase tracking-[0.2em] text-muted-foreground flex items-center gap-1 mb-1", !isUser && "justify-end")}>
          {icon} {label}
        </div>
        <div
          className={cn(
            "px-3 py-2 text-sm leading-relaxed",
            isUser
              ? "bg-white border border-border"
              : message.role === "operator"
                ? "bg-[color:var(--blush)]/40"
                : "bg-[color:var(--secondary)]",
          )}
        >
          <div className="prose prose-sm max-w-none prose-p:my-1">
            <ReactMarkdown>{message.content}</ReactMarkdown>
          </div>
        </div>
      </div>
    </div>
  );
}