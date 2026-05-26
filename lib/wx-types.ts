// 数据源标识
export type DataSource = 'wx-cli' | 'weflow' | 'demo' | 'local';

// wx-cli 原始会话
export interface WxSessionRaw {
  chat: string;
  chat_type: 'private' | 'group';
  is_group: boolean;
  last_msg_type: string;
  last_sender: string;
  summary: string;
  time: string;
  timestamp: number;
  unread: number;
  username: string;
}

// WeFlow 原始会话
export interface WeFlowSessionRaw {
  username: string;
  displayName: string;
  type: 'private' | 'group';
  lastTimestamp: number;
  unreadCount: number;
}

// 统一会话格式（兼容两种数据源）
export interface WxSession {
  chat: string; // 展示名称
  chat_type: 'private' | 'group';
  is_group: boolean;
  last_msg_type: string;
  last_sender: string;
  summary: string;
  time: string;
  timestamp: number;
  unread: number;
  username: string; // 会话 ID
  source: DataSource;
}

export interface WxStatsBucket {
  hour: number;
  count: number;
}

export interface WxStatsSender {
  sender: string;
  count: number;
}

export interface WxStatsType {
  type: string;
  count: number;
}

export interface WxStats {
  chat: string;
  chat_type: 'private' | 'group';
  is_group: boolean;
  username: string;
  total: number;
  by_hour: WxStatsBucket[];
  by_type: WxStatsType[];
  top_senders: WxStatsSender[];
}

// wx-cli 原始消息
export interface WxMessageRaw {
  local_id: number;
  sender: string;
  content: string;
  time: string;
  timestamp: number;
  type: string;
}

// WeFlow 原始消息
export interface WeFlowMessageRaw {
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

// 统一消息格式
export interface WxMessage {
  local_id: number;
  sender: string;
  content: string;
  time: string;
  timestamp: number;
  type: string;
  source: DataSource;
  server_id?: string;
  is_send?: boolean;
  media_type?: string;
}

export interface WxNewMessage extends WxMessage {
  username: string;
  chat?: string;
}

export interface WxMember {
  username: string;
  nickname?: string;
  display_name?: string;
}

export interface WxDaemonStatus {
  running: boolean;
  pid?: number;
  uptime_seconds?: number;
}
