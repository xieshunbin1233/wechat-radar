import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { DATA_DIR, configStatus, writeConfig } from '@/lib/config';
import { seedDemoData } from '@/lib/demo-data';
import { wxAvailable, wxDaemonStatus } from '@/lib/wx';
import { wfHealth, getWeFlowConfigFromEnv } from '@/lib/weflow';

export const dynamic = 'force-dynamic';

const SetupSchema = z.object({
  myNicknames: z.array(z.string()).default([]),
  privacyConfirmed: z.boolean(),
  demoMode: z.boolean().default(false),
  defaultSyncDays: z.number().int().min(1).max(365).default(7),
  dataSource: z.enum(['wx-cli', 'weflow']).default('wx-cli'),
  weflowBaseUrl: z.string().default('http://127.0.0.1:5031'),
  weflowAccessToken: z.string().default(''),
});

export async function GET() {
  const [wxInstalled, daemon, weflowEnv] = await Promise.all([wxAvailable(), wxDaemonStatus(), Promise.resolve(getWeFlowConfigFromEnv())]);
  const weflowConnected = weflowEnv.accessToken ? await wfHealth().catch(() => false) : false;
  return NextResponse.json({
    ok: true,
    ...configStatus(),
    dataDir: DATA_DIR,
    checks: {
      wxInstalled,
      wxDaemonRunning: daemon.running,
      wxDaemonPid: daemon.pid ?? null,
    },
    weflowConnected,
    weflowEnv,
  });
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const parsed = SetupSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ ok: false, error: parsed.error.message }, { status: 400 });
  }
  const names = parsed.data.myNicknames.map((name) => name.trim()).filter(Boolean);
  if (!parsed.data.demoMode && names.length === 0) {
    return NextResponse.json({ ok: false, error: '请至少填写一个自己的微信名或群昵称' }, { status: 400 });
  }
  const config = writeConfig({
    myNicknames: names,
    privacyConfirmed: parsed.data.privacyConfirmed,
    demoMode: parsed.data.demoMode,
    defaultSyncDays: parsed.data.defaultSyncDays,
    dataSource: parsed.data.dataSource,
    weflowBaseUrl: parsed.data.weflowBaseUrl,
    weflowAccessToken: parsed.data.weflowAccessToken,
    setupCompleted: true,
  });
  const demo = parsed.data.demoMode ? seedDemoData() : null;
  return NextResponse.json({ ok: true, configured: true, config, demo });
}
