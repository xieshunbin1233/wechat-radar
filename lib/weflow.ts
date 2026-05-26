/**
 * WeFlow API 客户端
 * 支持 GET/POST 请求，自动携带 Authorization Token
 * API 文档：https://github.com/hicccc77/WeFlow/blob/main/docs/HTTP-API.md
 */

const BASE_URL = process.env.WEFLOW_BASE_URL || 'http://127.0.0.1:5031';
const TOKEN = process.env.WEFLOW_ACCESS_TOKEN || '';

function headers(extra: Record<string, string> = {}): Record<string, string> {
  const h: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  if (TOKEN) h['Authorization'] = `Bearer ${TOKEN}`;
  return { ...h, ...extra };
}

async function request<T>(
  method: 'GET' | 'POST',
  path: string,
  body?: Record<string, unknown>,
  params?: Record<string, string | number | boolean>,
): Promise<T> {
  let url = `${BASE_URL}${path}`;
  if (params) {
    const qs = new URLSearchParams(
      Object.entries(params)
        .filter(([, v]) => v !== undefined && v !== '')
        .map(([k, v]) => [k, String(v)])
        .sort(([a], [b]) => a.localeCompare(b))
        .toString()
        ? Object.entries(params)
            .filter(([, v]) => v !== undefined && v !== '')
            .map(([k, v]) => [k, String(v)])
            .sort(([a], [b]) => a.localeCompare(b))
        : []
    ).toString();
    if (qs) url += `?${qs}`;
  }

  const opt = body ? { method, headers: headers(), body: JSON.stringify(body) } : { method, headers: headers() };
  const res = await fetch(url, opt as RequestInit);
  if (!res.ok) throw new Error(`WeFlow API ${method} ${path} failed: ${res.status} ${res.statusText}`);
  return res.json() as T;
}

// ─── 会话列表 ────────────────────────────────────────────────

export interface WeFlowSession {
  username: string;
  displayName: string;
  type: 'private' | 'group';
  lastTimestamp: number;
  unreadCount: number;
}

interface SessionsResponse {
  success: boolean;
  count: number;
  sessions: Array<{
    username: string;
    displayName: string;
    type: 1 | 2; // 1=private, 2=group
    lastTimestamp: number;
    unreadCount: number;
  }>;
}

export async function wfSessions(keyword?: string, limit = 500): Promise<WeFlowSession[]> {
  const body: Record<string, unknown> = { limit };
  if (keyword) body.keyword = keyword;
  const data = await request<SessionsResponse>('POST', '/api/v1/sessions', body);
  return (data.sessions ?? [])
    .filter((s) => s.type === 2) // 只取群聊
    .map((s) => ({
      username: s.username,
      displayName: s.displayName,
      type: 'group' as const,
      lastTimestamp: s.lastTimestamp,
      unreadCount: s.unreadCount,
    }));
}

// ─── 消息历史 ────────────────────────────────────────────────

interface MessageItem {
  localId: number;
  serverId: string;
  createTime: number; // 秒级 Unix 时间戳
  isSend: 0 | 1;
  senderUsername: string;
  content: string;
  rawContent: string;
  parsedContent: string;
  mediaType?: string;
  replyToMessageId?: string;
  quote?: {
    platformMessageId: string;
    sender: string;
    accountName: string;
    content: string;
    type: number;
  };
}

interface MessagesResponse {
  success: boolean;
  talker: string;
  count: number;
  hasMore: boolean;
  messages: MessageItem[];
}

export interface WeFlowMessage {
  local_id: number;
  server_id: string;
  sender: string;
  content: string;
  raw_content: string;
  parsed_content: string;
  time: string;
  timestamp: number; // 秒级 Unix 时间戳
  type: string;
  is_send: boolean;
  media_type?: string;
  reply_to_message_id?: string;
  quote?: {
    platform_message_id: string;
    sender: string;
    account_name: string;
    content: string;
    type: number;
  };
}

function tsToDate(ts: number): string {
  const d = new Date(ts * 1000);
  const y = d.getFullYear();
  const mo = String(d.getMonth() + 1).padStart(2, '0');
  const da = String(d.getDate()).padStart(2, '0');
  return `${y}-${mo}-${da}`;
}

function tsToTime(ts: number): string {
  const d = new Date(ts * 1000);
  const h = String(d.getHours()).padStart(2, '0');
  const m = String(d.getMinutes()).padStart(2, '0');
  const s = String(d.getSeconds()).padStart(2, '0');
  return `${h}:${m}:${s}`;
}

function messageType(content: string, mediaType?: string): string {
  if (mediaType === 'image') return '图片';
  if (mediaType === 'voice') return '语音';
  if (mediaType === 'video') return '视频';
  if (mediaType === 'emoji') return '表情';
  if (content.startsWith('[图片]') || mediaType === 'image') return '图片';
  if (content.startsWith('[语音]') || mediaType === 'voice') return '语音';
  if (content.startsWith('[视频]') || mediaType === 'video') return '视频';
  if (content.startsWith('[@]')) return '@';
  if (content.startsWith('[链接]')) return '链接';
  return '文本';
}

export async function wfHistory(
  chatroomId: string,
  since: string,
  until: string,
  limit = 5000,
  offset = 0,
): Promise<WeFlowMessage[]> {
  // WeFlow 支持 start/end 参数，格式 YYYYMMDD 或时间戳
  const startTs = Math.floor(new Date(since).getTime() / 1000);
  const endTs = Math.floor(new Date(until).getTime() / 1000);

  const all: WeFlowMessage[] = [];
  let off = offset;
  let hasMore = true;

  while (hasMore && all.length < limit) {
    const batchSize = Math.min(limit - all.length, 1000);
    const data = await request<MessagesResponse>('POST', '/api/v1/messages', {
      talker: chatroomId,
      start: String(startTs),
      end: String(endTs),
      limit: batchSize,
      offset: off,
    });

    const msgs: WeFlowMessage[] = (data.messages ?? []).map((m) => ({
      local_id: m.localId,
      server_id: m.serverId,
      sender: m.senderUsername,
      content: m.content,
      raw_content: m.rawContent,
      parsed_content: m.parsedContent,
      time: tsToTime(m.createTime),
      timestamp: m.createTime,
      type: messageType(m.content, m.mediaType),
      is_send: m.isSend === 1,
      media_type: m.mediaType,
      reply_to_message_id: m.replyToMessageId,
      quote: m.quote
        ? {
            platform_message_id: m.quote.platformMessageId,
            sender: m.quote.sender,
            account_name: m.quote.accountName,
            content: m.quote.content,
            type: m.quote.type,
          }
        : undefined,
    }));

    all.push(...msgs);
    hasMore = data.hasMore;
    off += batchSize;
    if (msgs.length < batchSize) break;
  }

  return all;
}

// ─── 群成员 ────────────────────────────────────────────────

interface MembersResponse {
  success: boolean;
  chatroomId: string;
  count: number;
  members: Array<{
    wxid: string;
    displayName: string;
    nickname: string;
    remark: string;
    alias: string;
    groupNickname: string;
    avatarUrl: string;
    isOwner: boolean;
    isFriend: boolean;
    messageCount: number;
  }>;
}

export interface WeFlowMember {
  username: string;
  nickname?: string;
  display_name?: string;
  group_nickname?: string;
}

export async function wfMembers(chatroomId: string): Promise<WeFlowMember[]> {
  const data = await request<MembersResponse>('GET', '/api/v1/group-members', undefined, {
    chatroomId,
    forceRefresh: 1,
  });
  return (data.members ?? []).map((m) => ({
    username: m.wxid,
    nickname: m.nickname,
    display_name: m.displayName,
    group_nickname: m.groupNickname,
  }));
}

// ─── 健康检查 ──────────────────────────────────────────────

export async function wfHealth(): Promise<boolean> {
  try {
    const data = await request<{ status: string }>('GET', '/health');
    return data.status === 'ok';
  } catch {
    return false;
  }
}

// ─── 配置检查 ──────────────────────────────────────────────

export interface WeFlowConfig {
  baseUrl: string;
  accessToken: string;
}

export function getWeFlowConfigFromEnv(): WeFlowConfig {
  return {
    baseUrl: process.env.WEFLOW_BASE_URL || 'http://127.0.0.1:5031',
    accessToken: process.env.WEFLOW_ACCESS_TOKEN || '',
  };
}