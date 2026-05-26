/**
 * WeFlow API 客户端
 * 支持 GET/POST 请求，自动携带 Authorization Token
 * API 文档：https://github.com/hicccc77/WeFlow/blob/main/docs/HTTP-API.md
 */

import { readConfig } from './config';

function getBaseUrl(): string {
  return process.env.WEFLOW_BASE_URL || readConfig().weflowBaseUrl || 'http://127.0.0.1:5031';
}

function getToken(): string {
  return process.env.WEFLOW_ACCESS_TOKEN || readConfig().weflowAccessToken || '';
}

function headers(): Record<string, string> {
  const h: Record<string, string> = { 'Content-Type': 'application/json' };
  const t = getToken();
  if (t) h['Authorization'] = `Bearer ${t}`;
  return h;
}

async function request<T>(
  method: 'GET' | 'POST',
  path: string,
  body?: Record<string, unknown>,
  params?: Record<string, string | number | boolean>,
): Promise<T> {
  let url = `${getBaseUrl()}${path}`;

  if (params) {
    const filtered = Object.entries(params)
      .filter(([, v]) => v !== undefined && v !== '')
      .map(([k, v]) => [k, String(v)])
      .sort(([a], [b]) => a.localeCompare(b));

    if (filtered.length > 0) {
      const qs = new URLSearchParams(filtered).toString();
      url += `?${qs}`;
    }
  }

  const init: RequestInit = body
    ? { method, headers: headers(), body: JSON.stringify(body) }
    : { method, headers: headers() };

  const res = await fetch(url, init);
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`WeFlow API ${method} ${path} failed: ${res.status} ${res.statusText}${text ? ' — ' + text : ''}`);
  }
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
    type: 1 | 2;
    lastTimestamp: number;
    unreadCount: number;
  }>;
}

export async function wfSessions(keyword?: string, limit = 500): Promise<WeFlowSession[]> {
  const body: Record<string, unknown> = { limit };
  if (keyword) body.keyword = keyword;

  const data = await request<SessionsResponse>('POST', '/api/v1/sessions', body);

  if (!data.success) {
    throw new Error(`WeFlow sessions query failed: ${JSON.stringify(data)}`);
  }

  return (data.sessions ?? [])
    .filter((s) => s.type === 2)
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
  createTime: number;
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
  timestamp: number;
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
  // ts is already in seconds (Unix timestamp from WeFlow createTime)
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
  if (mediaType === 'image' || content.startsWith('[图片]')) return '图片';
  if (mediaType === 'voice' || content.startsWith('[语音]')) return '语音';
  if (mediaType === 'video' || content.startsWith('[视频]')) return '视频';
  if (mediaType === 'emoji') return '表情';
  if (content.startsWith('[@]')) return '@';
  if (content.startsWith('[链接]')) return '链接';
  return '文本';
}

function dateToTs(dateStr: string): number {
  // Parse YYYYMMDD in local timezone and convert to seconds Unix timestamp
  const y = parseInt(dateStr.slice(0, 4), 10);
  const m = parseInt(dateStr.slice(4, 6), 10) - 1;
  const d = parseInt(dateStr.slice(6, 8), 10);
  // Use date-only parsing: midnight of that day in local timezone
  const startOfDay = Date.UTC(y, m, d) / 1000;
  return startOfDay;
}

export async function wfHistory(
  chatroomId: string,
  since: string,
  until: string,
  limit = 5000,
  offset = 0,
): Promise<WeFlowMessage[]> {
  // Accept YYYYMMDD or timestamp strings; convert to end-of-day for proper range
  let startTs: number;
  let endTs: number;

  // Handle YYYYMMDD format (length 8) vs timestamp strings
  if (since.length === 8) {
    const y = parseInt(since.slice(0, 4), 10);
    const m = parseInt(since.slice(4, 6), 10) - 1;
    const d = parseInt(since.slice(6, 8), 10);
    startTs = Date.UTC(y, m, d) / 1000;
  } else {
    startTs = parseInt(since, 10);
    if (isNaN(startTs)) startTs = Math.floor(new Date(since).getTime() / 1000);
  }

  if (until.length === 8) {
    const y = parseInt(until.slice(0, 4), 10);
    const m = parseInt(until.slice(4, 6), 10) - 1;
    const d = parseInt(until.slice(6, 8), 10);
    // End of day = start of next day - 1 second
    endTs = (Date.UTC(y, m, d + 1) / 1000) - 1;
  } else {
    endTs = parseInt(until, 10);
    if (isNaN(endTs)) endTs = Math.floor(new Date(until).getTime() / 1000);
  }

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

// ─── 配置 ─────────────────────────────────────────────────

export interface WeFlowConfig {
  baseUrl: string;
  accessToken: string;
}

export function getWeFlowConfigFromEnv(): WeFlowConfig {
  const cfg = readConfig();
  return {
    baseUrl: process.env.WEFLOW_BASE_URL || cfg.weflowBaseUrl || 'http://127.0.0.1:5031',
    accessToken: process.env.WEFLOW_ACCESS_TOKEN || cfg.weflowAccessToken || '',
  };
}