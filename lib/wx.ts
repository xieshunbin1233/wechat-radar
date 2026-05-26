import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { readConfig } from './config';
import type {
  WxDaemonStatus,
  WxMember,
  WxMessage,
  WxNewMessage,
  WxSession,
  WxStats,
} from './wx-types';
import { wfSessions, wfHistory, wfMembers } from './weflow';

const run = promisify(execFile);
const DEFAULT_OPTS = {
  maxBuffer: 64 * 1024 * 1024,
  timeout: 60_000,
} as const;

async function wxRaw(args: string[], opts = DEFAULT_OPTS): Promise<string> {
  const { stdout } = await run('wx', args, opts);
  return stdout;
}

async function wxJson<T>(args: string[], opts = DEFAULT_OPTS): Promise<T> {
  const stdout = await wxRaw([...args, '--json'], opts);
  return JSON.parse(stdout) as T;
}

// ─── 统一数据源入口 ─────────────────────────────────────────

/**
 * 获取会话列表，自动根据配置选择 wx-cli 或 WeFlow
 */
export async function wxSessions(limit = 500): Promise<WxSession[]> {
  const cfg = readConfig();
  if (cfg.demoMode) {
    throw new Error('demo mode: use local fallback');
  }
  if (cfg.dataSource === 'weflow') {
    const sessions = await wfSessions(undefined, limit);
    return sessions.map((s) => ({
      chat: s.displayName || s.username,
      chat_type: s.type,
      is_group: s.type === 'group',
      last_msg_type: '',
      last_sender: '',
      summary: '',
      time: s.lastTimestamp ? new Date(s.lastTimestamp * 1000).toLocaleString('zh-CN') : '',
      timestamp: s.lastTimestamp,
      unread: s.unreadCount,
      username: s.username,
      source: 'weflow',
    }));
  }
  const raw = await wxJson<WxSession[]>(['sessions', '-n', String(limit)]);
  return raw.map((s) => ({ ...s, source: 'wx-cli' as const }));
}

/**
 * 获取消息历史，自动根据配置选择 wx-cli 或 WeFlow
 */
export async function wxHistory(
  chat: string,
  since: string,
  until: string,
  limit = 1000,
): Promise<WxMessage[]> {
  const cfg = readConfig();
  if (cfg.dataSource === 'weflow') {
    const msgs = await wfHistory(chat, since, until, limit);
    return msgs.map((m) => ({
      local_id: m.local_id,
      sender: m.sender,
      content: m.content,
      time: m.time,
      timestamp: m.timestamp,
      type: m.type,
      source: 'weflow' as const,
    }));
  }
  const raw = await wxJson<WxMessage[]>([
    'history', chat, '--since', since, '--until', until, '-n', String(limit),
  ]);
  return raw.map((m) => ({ ...m, source: 'wx-cli' as const }));
}

/**
 * 获取群成员
 */
export async function wxMembers(chat: string): Promise<WxMember[]> {
  const cfg = readConfig();
  if (cfg.dataSource === 'weflow') {
    const members = await wfMembers(chat);
    return members.map((m) => ({
      username: m.username,
      nickname: m.nickname,
      display_name: m.display_name,
    }));
  }
  return wxJson<WxMember[]>(['members', chat]);
}

export async function wxStats(
  chat: string,
  since: string,
  until: string,
): Promise<WxStats> {
  return wxJson<WxStats>(['stats', chat, '--since', since, '--until', until]);
}

export async function wxNewMessages(limit = 50): Promise<WxNewMessage[]> {
  return wxJson<WxNewMessage[]>(['new-messages', '-n', String(limit)]);
}

export async function wxDaemonStatus(): Promise<WxDaemonStatus> {
  try {
    const out = await wxRaw(['daemon', 'status']);
    const lower = out.toLowerCase();
    const running = lower.includes('running') || lower.includes('运行');
    const pidMatch = out.match(/pid[^\d]*(\d+)/i);
    return {
      running,
      pid: pidMatch ? Number(pidMatch[1]) : undefined,
    };
  } catch {
    return { running: false };
  }
}

export async function wxAvailable(): Promise<boolean> {
  try {
    await run('wx', ['--version'], { timeout: 5_000 });
    return true;
  } catch {
    return false;
  }
}

// 从 radar.db 读取已知群 ID（不依赖 WeFlow sessions API）
// 一旦群消息入库，ID 就持久化，重扫不再依赖实时会话列表
export async function listKnownGroups(): Promise<Array<{ chatroomId: string; name: string }>> {
  const { db } = await import('@/lib/db');
  const rows = db()
    .prepare("SELECT DISTINCT chatroom_id FROM messages WHERE chatroom_id LIKE '%@chatroom'")
    .all() as Array<{ chatroom_id: string }>;
  return rows.map((r) => ({ chatroomId: r.chatroom_id, name: r.chatroom_id }));
}