export interface DeepSeekChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface DeepSeekChatOptions {
  apiKey: string;
  model?: string;
  messages: DeepSeekChatMessage[];
  signal?: AbortSignal;
}

export class DeepSeekApiError extends Error {
  constructor(
    message: string,
    public status?: number
  ) {
    super(message);
    this.name = "DeepSeekApiError";
  }
}

/**
 * Вызов DeepSeek Chat Completions (OpenAI-совместимый API).
 */
export async function deepseekChat(options: DeepSeekChatOptions): Promise<string> {
  const { apiKey, messages, signal } = options;
  const model = options.model?.trim() || "deepseek-chat";

  if (!apiKey.trim()) {
    throw new DeepSeekApiError("Не задан API-ключ DeepSeek. Укажите его во «Владелица → Безопасность».");
  }

  let response: Response;
  try {
    response = await fetch("https://api.deepseek.com/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey.trim()}`,
      },
      body: JSON.stringify({
        model,
        messages,
        temperature: 0.3,
        stream: false,
      }),
      signal,
    });
  } catch (err) {
    if (err instanceof DOMException && err.name === "AbortError") throw err;
    throw new DeepSeekApiError(
      "Нет связи с DeepSeek. Проверьте интернет и доступность api.deepseek.com."
    );
  }

  if (!response.ok) {
    let detail = "";
    try {
      const body = (await response.json()) as { error?: { message?: string } };
      detail = body?.error?.message || "";
    } catch {
      /* ignore */
    }
    if (response.status === 401) {
      throw new DeepSeekApiError("Неверный API-ключ DeepSeek (HTTP 401).", 401);
    }
    if (response.status === 402) {
      throw new DeepSeekApiError("Недостаточно средств на счёте DeepSeek (HTTP 402).", 402);
    }
    if (response.status === 429) {
      throw new DeepSeekApiError("Слишком много запросов к DeepSeek. Подождите немного.", 429);
    }
    throw new DeepSeekApiError(
      detail
        ? `Ошибка DeepSeek (HTTP ${response.status}): ${detail}`
        : `Ошибка DeepSeek (HTTP ${response.status}).`,
      response.status
    );
  }

  const data = (await response.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
  };
  const content = data.choices?.[0]?.message?.content?.trim();
  if (!content) {
    throw new DeepSeekApiError("Пустой ответ от DeepSeek.");
  }
  return content;
}
