import { NextRequest, NextResponse } from 'next/server';
import { LLM_ENDPOINT, LLM_API_KEY, LLM_MODEL } from '@/lib/topics';
import { listMessagesForDate } from '@/lib/messages-store';

export const dynamic = 'force-dynamic';

interface Message {
  sender: string;
  content: string;
  time: string;
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

  const msgList = messages
    .map((m) => '[' + m.time + '] ' + m.sender + ': ' + m.content)
    .slice(0, 200)
    .join('\n');

  const prompt = '你是群聊日报助手。根据以下群聊消息，提取核心主题（最多5个）。\n\n要求：\n- 合并相同话题\n- 每个主题包含：title（主题标题）、what（聊了什么，1-2句话）、why（为什么重要，1句话）、count（涉及消息条数）\n- 只输出 JSON，不输出其他内容\n- 消息全部是中文群聊，来自一个生活向的微信群\n\n格式：\n```json\n{\n  "topics": [\n    {"title": "主题", "what": "描述", "why": "意义", "count": 3},\n    ...\n  ]\n}\n```\n\n消息：\n' + msgList.slice(0, 6000);

  let raw = null;
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 120000);
    const resp = await fetch(LLM_ENDPOINT + '/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + LLM_API_KEY,
      },
      body: JSON.stringify({
        model: LLM_MODEL,
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 4000,
        temperature: 0.2,
        stream: false,
      }),
      signal: controller.signal,
    });
    clearTimeout(timer);
    if (!resp.ok) {
      const txt = await resp.text();
      console.error('[report-topics] HTTP error:', resp.status, txt.slice(0, 300));
      return NextResponse.json({ error: 'LLM HTTP error', topics: [] }, { status: 500 });
    }
    const json = await resp.json() as any;
    const msg = json.choices?.[0]?.message;
    raw = typeof msg === 'string' ? msg : msg?.content;
  } catch (e: any) {
    console.error('[report-topics] fetch error:', e?.message);
    return NextResponse.json({ error: 'fetch error', topics: [] }, { status: 500 });
  }

  if (!raw) {
    return NextResponse.json({ error: 'empty response', topics: [] }, { status: 500 });
  }

  // Strip thinking block
  const cleaned = raw.replace(/<think>[\s\S]*?<\/think>/gi, '').trim();

  // Try to parse JSON
  let topics: any[] = [];
  try {
    topics = JSON.parse(cleaned).topics ?? [];
  } catch {
    // Try code block
    const match = cleaned.match(/```(?:json)?\s*([\s\S]*?)```/i);
    if (match) {
      try {
        topics = JSON.parse(match[1].trim()).topics ?? [];
      } catch {
        console.error('[report-topics] JSON parse error, raw:', cleaned.slice(0, 200));
      }
    } else {
      console.error('[report-topics] No JSON found, raw:', cleaned.slice(0, 200));
    }
  }

  return NextResponse.json({ topics });
}
