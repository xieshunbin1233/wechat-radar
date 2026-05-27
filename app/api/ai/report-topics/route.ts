import { NextRequest, NextResponse } from 'next/server';
import { LLM_ENDPOINT, LLM_API_KEY, LLM_MODEL, LLM_TIMEOUT_MS } from '@/lib/topics';
import { listMessagesForDate } from '@/lib/messages-store';
import { todayStr } from '@/lib/range';

export const dynamic = 'force-dynamic';

const REPORT_TOPICS_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  properties: {
    topics: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        properties: {
          title: { type: 'string' },
          what: { type: 'string' },
          why: { type: 'string' },
          count: { type: 'number' },
        },
        required: ['title', 'what', 'why', 'count'],
      },
    },
  },
  required: ['topics'],
};

interface Message {
  sender: string;
  content: string;
  time: string;
}

async function callLlmJson<T>(prompt: string, schema: object, timeoutMs = 120_000): Promise<T | null> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const resp = await fetch(`${LLM_ENDPOINT}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${LLM_API_KEY}`,
      },
      body: JSON.stringify({
        model: LLM_MODEL,
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 4000,
        temperature: 0.2,
      }),
      signal: controller.signal,
    });
    clearTimeout(timer);
    if (!resp.ok) return null;

    const json = await resp.json() as { choices?: Array<{ message?: { content?: string | null } | string }> };
    const msg = json.choices?.[0]?.message;
    const raw = typeof msg === 'string' ? msg : msg?.content;
    if (!raw) return null;

    const cleaned = raw.replace(/<think>[\\s\\S]*?<\\/think>/gi, '').trim();
    return JSON.parse(cleaned) as T;
  } catch {
    return null;
  }
}

export async function POST(req: NextRequest) {
  const { chatroomId, date } = await req.json().catch(() => ({}));

  if (!chatroomId || !date) {
    return NextResponse.json({ error: 'missing chatroomId or date' }, { status: 400 });
  }

  const messages = listMessagesForDate(chatroomId, date, 500) as Message[];
  if (messages.length === 0) {
    return NextResponse.json({ topics: [] });
  }

  // Build compact message list
  const msgList = messages
    .map((m) => `[${m.time}] ${m.sender}: ${m.content}`.slice(0, 200))
    .join('\n');

  const prompt = `你是群聊日报助手。根据以下群聊消息，提取核心主题（最多5个）。

要求：
- 合并相同话题
- 每个主题包含：title（主题标题）、what（聊了什么，1-2句话）、why（为什么重要，1句话）、count（涉及消息条数）
- 只输出 JSON，不输出其他内容
- 消息全部是中文群聊，来自一个生活向的微信群

格式：
\`\`\`json
{
  "topics": [
    {"title": "主题", "what": "描述", "why": "意义", "count": 3},
    ...
  ]
}
\`\`\`

消息：
${msgList.slice(0, 6000)}`;

  const result = await callLlmJson<{ topics: Array<{ title: string; what: string; why: string; count: number }> }>(prompt, REPORT_TOPICS_SCHEMA);

  if (!result) {
    return NextResponse.json({ error: 'LLM call failed' }, { status: 500 });
  }

  return NextResponse.json(result);
}