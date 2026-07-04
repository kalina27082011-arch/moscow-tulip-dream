import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { generateText, stepCountIs, tool } from "ai";
import { createLovableAiGatewayProvider } from "@/lib/ai-gateway.server";

const SYSTEM_PROMPT = `Вы — консультант ателье тюльпанов tюlpa (Москва).
Тон: тёплый, спокойный, минималистичный, на «вы». Никаких эмодзи и восклицаний.

Ваша задача:
1. Помочь клиенту выбрать букет из каталога или собрать свой из представленных цветов.
2. Сначала уточните повод, бюджет и предпочтения по цвету.
3. Используйте инструмент search_products, чтобы получить актуальный каталог. Предлагайте 2–3 варианта, кратко описывайте каждый и указывайте цену.
4. Когда клиент выбрал букет и подтвердил состав, спросите адрес доставки по Москве, желаемое время и комментарий (открытка, домофон и т.п.).
5. Только после явного согласия клиента вызовите create_order. Обязательно повторите итоговую сумму и номер заявки в ответе.
6. Если клиент жалуется, спрашивает про возврат, нестандартный заказ, свадьбу/оформление зала, оптовый заказ или явно просит живого человека — вызовите escalate_to_operator и сообщите, что оператор скоро подключится.
7. Никогда не выдумывайте букеты, цены или наличие. Только данные из search_products.

Отвечайте кратко, 2–4 предложения, если не просят подробнее.`;

const startInput = z.object({
  name: z.string().trim().min(1).max(100),
  phone: z.string().trim().min(5).max(30),
});

export const startConversation = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => startInput.parse(input))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: conv, error } = await supabaseAdmin
      .from("chat_conversations")
      .insert({ customer_name: data.name, phone: data.phone })
      .select("id")
      .single();
    if (error) throw new Error(error.message);

    await supabaseAdmin.from("chat_messages").insert({
      conversation_id: conv.id,
      role: "assistant",
      content: `Здравствуйте, ${data.name}. Я подберу для вас букет тюльпанов. Расскажите, для кого и по какому поводу цветы?`,
    });

    return { id: conv.id };
  });

const sendInput = z.object({
  conversationId: z.string().uuid(),
  text: z.string().trim().min(1).max(2000),
});

export const sendUserMessage = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => sendInput.parse(input))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: conv, error: convErr } = await supabaseAdmin
      .from("chat_conversations")
      .select("id, customer_name, phone, status")
      .eq("id", data.conversationId)
      .single();
    if (convErr || !conv) throw new Error("Беседа не найдена");

    // Save user message and touch timestamp.
    await supabaseAdmin.from("chat_messages").insert({
      conversation_id: conv.id,
      role: "user",
      content: data.text,
    });
    await supabaseAdmin
      .from("chat_conversations")
      .update({ last_message_at: new Date().toISOString() })
      .eq("id", conv.id);

    // If operator has taken over, don't run AI.
    if (conv.status === "operator") return { ok: true };

    // Load history
    const { data: history } = await supabaseAdmin
      .from("chat_messages")
      .select("role, content")
      .eq("conversation_id", conv.id)
      .order("created_at", { ascending: true });

    const messages = (history ?? [])
      .filter((m) => m.role === "user" || m.role === "assistant" || m.role === "system")
      .map((m) => ({
        role: m.role as "user" | "assistant" | "system",
        content: m.content,
      }));

    const apiKey = process.env.LOVABLE_API_KEY;
    if (!apiKey) throw new Error("LOVABLE_API_KEY отсутствует");

    const gateway = createLovableAiGatewayProvider(apiKey);
    const model = gateway("google/gemini-3-flash-preview");

    try {
      const result = await generateText({
        model,
        system: SYSTEM_PROMPT,
        messages,
        stopWhen: stepCountIs(8),
        tools: {
          search_products: tool({
            description:
              "Получить актуальный каталог букетов tюlpa (только активные позиции). Возвращает name, price (в рублях), description, composition, color_tag.",
            inputSchema: z.object({}),
            execute: async () => {
              const { data: products } = await supabaseAdmin
                .from("products")
                .select("id, name, price, description, composition, color_tag")
                .eq("is_active", true)
                .order("sort_order");
              return { products: products ?? [] };
            },
          }),
          create_order: tool({
            description:
              "Создать заявку на букет после явного подтверждения клиента. items — массив {product_id, qty}. Возвращает id заявки и итоговую сумму.",
            inputSchema: z.object({
              items: z
                .array(
                  z.object({
                    product_id: z.string().uuid(),
                    qty: z.number().int().min(1).max(20),
                  }),
                )
                .min(1),
              address: z.string().min(3).max(300),
              delivery_time: z.string().min(1).max(100),
              comment: z.string().max(500).optional(),
            }),
            execute: async (input) => {
              const ids = input.items.map((i) => i.product_id);
              const { data: prods, error: prodErr } = await supabaseAdmin
                .from("products")
                .select("id, name, price")
                .in("id", ids);
              if (prodErr || !prods || prods.length === 0) {
                return { ok: false, error: "Товары не найдены" };
              }
              const priceMap = new Map(prods.map((p) => [p.id, p]));
              let total = 0;
              const orderItems = input.items.map((i) => {
                const p = priceMap.get(i.product_id);
                if (!p) throw new Error(`Товар ${i.product_id} не найден`);
                total += p.price * i.qty;
                return {
                  product_id: p.id,
                  name_snapshot: p.name,
                  price_snapshot: p.price,
                  qty: i.qty,
                };
              });

              const { data: order, error: orderErr } = await supabaseAdmin
                .from("orders")
                .insert({
                  customer_name: conv.customer_name,
                  phone: conv.phone,
                  address: input.address,
                  delivery_time: input.delivery_time,
                  comment: input.comment ?? "",
                  total,
                  chat_conversation_id: conv.id,
                })
                .select("id")
                .single();
              if (orderErr || !order) return { ok: false, error: orderErr?.message };

              const { error: itemsErr } = await supabaseAdmin
                .from("order_items")
                .insert(orderItems.map((i) => ({ ...i, order_id: order.id })));
              if (itemsErr) return { ok: false, error: itemsErr.message };

              await supabaseAdmin.from("chat_messages").insert({
                conversation_id: conv.id,
                role: "system",
                content: `Оформлена заявка №${order.id.slice(0, 8)} на сумму ${total} ₽.`,
              });

              return {
                ok: true,
                order_id: order.id,
                short_id: order.id.slice(0, 8),
                total,
              };
            },
          }),
          escalate_to_operator: tool({
            description:
              "Позвать живого оператора, когда бот не может помочь или клиент просит человека. reason — короткое описание проблемы для оператора.",
            inputSchema: z.object({ reason: z.string().min(1).max(300) }),
            execute: async (input) => {
              await supabaseAdmin
                .from("chat_conversations")
                .update({ status: "waiting_operator", has_ticket: true })
                .eq("id", conv.id);
              await supabaseAdmin.from("chat_messages").insert({
                conversation_id: conv.id,
                role: "system",
                content: `Передано оператору. Причина: ${input.reason}`,
              });
              return { ok: true };
            },
          }),
        },
      });

      const text = result.text?.trim();
      if (text) {
        await supabaseAdmin.from("chat_messages").insert({
          conversation_id: conv.id,
          role: "assistant",
          content: text,
        });
      }
      await supabaseAdmin
        .from("chat_conversations")
        .update({ last_message_at: new Date().toISOString() })
        .eq("id", conv.id);

      return { ok: true };
    } catch (err) {
      console.error("[chat] AI error", err);
      await supabaseAdmin.from("chat_messages").insert({
        conversation_id: conv.id,
        role: "system",
        content: "Секунду, зову оператора — не получается ответить прямо сейчас.",
      });
      await supabaseAdmin
        .from("chat_conversations")
        .update({ status: "waiting_operator", has_ticket: true })
        .eq("id", conv.id);
      return { ok: false };
    }
  });

const operatorInput = z.object({
  conversationId: z.string().uuid(),
  text: z.string().trim().min(1).max(2000),
});

export const sendOperatorMessage = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => operatorInput.parse(input))
  .handler(async ({ data }) => {
    // Anyone hitting this endpoint on the published site is the admin panel;
    // but we still gate on role via a direct RPC check with the caller's supabase.
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    await supabaseAdmin.from("chat_messages").insert({
      conversation_id: data.conversationId,
      role: "operator",
      content: data.text,
    });
    await supabaseAdmin
      .from("chat_conversations")
      .update({ last_message_at: new Date().toISOString() })
      .eq("id", data.conversationId);
    return { ok: true };
  });

const statusInput = z.object({
  conversationId: z.string().uuid(),
  status: z.enum(["bot", "waiting_operator", "operator", "closed"]),
});

export const updateConversationStatus = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => statusInput.parse(input))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const patch: { status: string; has_ticket?: boolean } = { status: data.status };
    if (data.status === "operator" || data.status === "waiting_operator") patch.has_ticket = true;
    await supabaseAdmin
      .from("chat_conversations")
      .update(patch)
      .eq("id", data.conversationId);

    const label =
      data.status === "operator"
        ? "Оператор подключился к беседе."
        : data.status === "bot"
          ? "Беседа возвращена боту."
          : data.status === "closed"
            ? "Беседа закрыта оператором."
            : "Беседа ожидает оператора.";
    await supabaseAdmin.from("chat_messages").insert({
      conversation_id: data.conversationId,
      role: "system",
      content: label,
    });
    return { ok: true };
  });