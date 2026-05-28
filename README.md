# WeChat Radar

> 群太多，真正有价值的消息却总是被淹没。
> WeChat Radar turns noisy WeChat groups into a local-first intelligence dashboard.

[![GitHub stars](https://img.shields.io/github/stars/joeseesun/wechat-radar?style=social)](https://github.com/xieshunbin1233/wechat-radar/stargazers)
[![GitHub forks](https://img.shields.io/github/forks/joeseesun/wechat-radar?style=social)](https://github.com/xieshunbin1233/wechat-radar/network/members)
[![Issues](https://img.shields.io/github/issues/joeseesun/wechat-radar)](https://github.com/xieshunbin1233/wechat-radar/issues)
[![Last commit](https://img.shields.io/github/last-commit/joeseesun/wechat-radar)](https://github.com/xieshunbin1233/wechat-radar/commits/main)
[![License: Non-commercial research](https://img.shields.io/badge/License-Non--commercial%20research-orange.svg)](LICENSE)

![WeChat Radar product preview](docs/assets/product-preview.svg)

**[中文](#中文) | [English](#english)**

> 重要：本项目仅供学习研究和个人非商业实验使用，禁止用于商业盈利。请先阅读 [免责声明](DISCLAIMER.md) 和 [许可证](LICENSE)。

---

<a name="中文"></a>

## 中文

WeChat Radar 是一个本地优先的微信群聊情报看板。它把群消息、话题、链接、@我的消息和高信号人物聚合成一个可按日期查看的工作台。

你得到的不是“聊天记录列表”，而是每天可以直接处理的情报：

- 今日优先看：消息、文章、工具、异动分区展示
- 话题雷达：用 Codex CLI 按天聚合跨群话题
- 链接情报：文章/工具资源去重，生成可读标题
- 群日报：每天活跃群可生成摘要报告，方便复制给 AI 继续处理
- 本地存储：聊天数据落到你自己的 SQLite，不上传到第三方服务
- 明暗主题：默认奶白色浅色主题，也支持深色模式

## 快速开始

```bash
git clone https://github.com/xieshunbin1233/wechat-radar.git
cd wechat-radar
pnpm install
pnpm rebuild better-sqlite3
pnpm dev
```

打开 [http://localhost:38901](http://localhost:38901)，首次进入会跳转到 `/setup` 配置页面。

## 安装指南

本项目支持两种数据源，请根据你的操作系统选择对应方案：

### 方式一：Windows + WeFlow（推荐）

#### 第一步：安装 WeFlow

WeFlow 是一款微信 Windows 辅助工具，提供 HTTP API 接口读取聊天记录。

1. 下载 WeFlow：[https://github.com/hicccc77/WeFlow/releases](https://github.com/hicccc77/WeFlow/releases)
2. 下载 `WeFlow-windows-xxx.exe` 后直接运行安装
3. 打开 WeFlow，用微信扫码登录（建议使用测试小号，不建议主力微信号）
4. 首次运行需要初始化数据库连接，WeFlow 会自动引导完成

#### 第二步：开启 HTTP API 服务

1. 在 WeFlow 顶部菜单找到「设置」→「HTTP API 服务」
2. 将服务开关设置为 **ON**（默认监听 `127.0.0.1:5031`，仅本机可访问）
3. 建议同时开启「主动推送」，方便实时获取新消息
4. 找到「Access Token」一栏，复制生成的 Token（类似 `glsa_xxxxx`），后面配置会用到

> ⚠️ Access Token 是 API 的鉴权凭证，请勿泄露给他人。

#### 第三步：安装 WeChat Radar

```bash
git clone https://github.com/xieshunbin1233/wechat-radar.git
cd wechat-radar
pnpm install
pnpm rebuild better-sqlite3
pnpm dev
```

#### 第四步：配置数据源

1. 打开 [http://localhost:38901](http://localhost:38901)，自动跳转到 `/setup`
2. 在「数据源」卡片中选择 **WeFlow**
3. 确认 WeFlow 地址为 `http://127.0.0.1:5031`（默认）
4. 填入第二步复制的 Access Token
5. 在「你的微信名」填写你的微信昵称或群昵称（用于识别 @你的消息）
6. 勾选隐私确认，点击「完成配置」

> 💡 若页面提示「WeFlow 未连接」，请确认 WeFlow 已运行且 HTTP API 服务已开启。

#### 第五步：同步数据

1. 进入首页后，点击「重扫」开始同步消息
2. 若需拉取更长历史，可点击「全量同步」（首次建议不超过 30 天）
3. 同步完成后即可查看各群的消息、话题、链接等情报

---

### 方式二：macOS + wx-cli

#### 第一步：安装 wx-cli

wx-cli 是 macOS 微信 4.x 的命令行工具，用于读取本地微信数据。

```bash
# 需要先安装 Node.js 20+（建议使用 nvm）
# 安装 wx-cli
npm install -g wx-cli

# 启动微信并登录（需保持微信 4.x 在登录状态）
wx daemon start

# 确认运行状态
wx daemon status
```

> ⚠️ wx-cli 仅支持 macOS，微信版本需为 4.x（已测试版本 `4.1.9.58`）。
> 建议使用注册半年以上的测试小号，不建议直接使用主力微信号。
> wx-cli 安装参考：[jackwener/wx-cli](https://github.com/jackwener/wx-cli)。

#### 第二步：安装 WeChat Radar

```bash
git clone https://github.com/xieshunbin1233/wechat-radar.git
cd wechat-radar
pnpm install
pnpm rebuild better-sqlite3
pnpm dev
```

#### 第三步：配置

1. 打开 [http://localhost:38901](http://localhost:38901)，自动跳转到 `/setup`
2. 在「数据源」卡片中选择 **wx-cli**
3. 填写你的微信昵称/群昵称
4. 勾选隐私确认，点击「完成配置」
5. 点击「重扫」开始同步

---

### 环境要求

| 项目 | 说明 |
|------|------|
| 操作系统 | Windows 10+ 或 macOS 10.15+ |
| Node.js | 20.x 及以上 |
| pnpm | 8.x 及以上 |
| 数据存储 | SQLite（本地存储，无需额外部署）|


## 配置

默认数据目录是 `~/.wechat-radar/`，不会写进项目目录。

你可以用环境变量覆盖：

```bash
cp .env.example .env.local
```

常用配置：

```bash
WECHAT_RADAR_DATA_DIR=~/.wechat-radar
WECHAT_RADAR_MY_NAMES=张三,San Zhang,zhangsan
WECHAT_RADAR_DEMO=0
WECHAT_RADAR_CODEX_MODEL=
# LLM 配置（用于日报核心主题生成，支持 MiniMax / OpenAI / Anthropic 等 OpenAI 兼容接口）
WECHAT_RADAR_LLM_ENDPOINT=https://api.minimaxi.com/v1
WECHAT_RADAR_LLM_API_KEY=你的APIKey
WECHAT_RADAR_LLM_MODEL=MiniMax-M2.7
WECHAT_RADAR_LLM_TIMEOUT_MS=60000
# 数据源配置
WECHAT_RADAR_DATA_SOURCE=weflow   # wx-cli（默认，macOS）或 weflow（Windows/macOS 推荐）
WEFLOW_BASE_URL=http://127.0.0.1:5031
WEFLOW_ACCESS_TOKEN=你的Token
```

> 💡 Windows 用户建议在 `/setup` 页面直接配置 WeFlow 数据源，无需手动设置环境变量。

也可以直接在 `/setup` 页面配置。配置会写入 `~/.wechat-radar/config.json`。

## 使用方式

1. 进入首页，选择日期或时间范围。
2. 点击“重扫”同步当前范围消息。
3. 点击“全量同步”拉取更长历史。
4. 打开“话题雷达”查看跨群主题。
5. 打开“链接情报”查看文章和工具资源。
6. 在活跃群列表点击“日报”查看单群日报。

你可以这样和 AI 配合：

- “把今天所有 Codex 相关话题整理成一篇博客大纲。”
- “复制这个群日报，帮我提炼值得回复的机会。”
- “把链接情报里的工具做成一张试用优先级表。”

## 数据与隐私

WeChat Radar 默认只在本机读写数据：

- `~/.wechat-radar/radar.db`：SQLite 主数据库
- `~/.wechat-radar/config.json`：本地配置
- `~/.wechat-radar/backups/`：可选备份

安全设计：

- wx-cli 调用使用 `child_process.execFile` 参数数组，不拼 shell
- SQLite 使用 prepared statements
- 页面只以 React 文本节点渲染聊天内容
- 不把微信密钥、会话、数据库、模型缓存提交进仓库

重要风险提示：

- 建议使用注册半年以上的小号或测试号，不建议使用主力微信号。
- 当前只建议读取历史聊天记录，用于本地检索、聚合和摘要。
- 不建议读取朋友圈，也不要自动点赞、评论、发消息、加好友、改资料或做任何写入/社交操作。
- 已测试通过的微信版本是 `4.1.9.58`；不建议在更高版本上贸然测试，版本变化可能带来不可预期的账号风险。
- 请确认你的使用方式符合微信客户端规则、当地法律、群成员隐私预期和你所在组织的合规要求。
- 不要把包含真实聊天内容的数据库或截图上传到公开仓库。

## 免责声明与禁止事项

本项目仅供学习研究、个人评估和非商业实验使用。禁止用于商业盈利，包括但不限于 SaaS、托管服务、付费报表、咨询交付、商业监控、线索挖掘、数据售卖、企业内部生产系统或任何直接/间接商业收益场景。

本项目与腾讯、微信、wx-cli 均无官方关联，未获得腾讯或微信授权、认可、赞助或背书。微信、WeChat、腾讯、Tencent 等名称和商标归其权利人所有。

用户需要自行承担安装、配置、运行、修改、部署、数据处理和传播行为的全部责任。因使用或误用本项目导致的账号限制、数据丢失、隐私泄露、商业损失、法律纠纷、平台处罚、服务中断、误判摘要或其它后果，项目作者和贡献者不承担责任。

完整条款见 [DISCLAIMER.md](DISCLAIMER.md) 和 [LICENSE](LICENSE)。

## 项目结构

```text
app/                 Next.js App Router 页面与 API
components/          看板、侧边栏、图表、消息渲染组件
lib/                 wx-cli 封装、SQLite、话题/链接聚合逻辑
scripts/             本地维护脚本
docs/assets/         README 图片与公开素材
```

## 常见问题

| 问题 | 解决方法 |
| --- | --- |
| `wx daemon 未运行` | 先运行 `wx daemon start`，再刷新页面。 |
| `better-sqlite3` native 模块报错 | 运行 `pnpm rebuild better-sqlite3`。 |
| 首页没有数据 | 先完成 `/setup`，确认 `wx sessions --json` 有输出，然后点击“重扫”。 |
| 话题雷达为空 | 打开对应日期会自动构建；也可以点击「构建话题」。如未配置 Codex CLI，会自动使用 LLM（需配置 WECHAT_RADAR_LLM_*）进行核心主题生成。 |
| 不想读取真实微信 | 在 `/setup` 勾选 demo 模式，或设置 `WECHAT_RADAR_DEMO=1`。 |

## 致谢

- [jackwener/wx-cli](https://github.com/jackwener/wx-cli)：本项目依赖它读取本机微信数据（macOS）。
- [hicccc77/WeFlow](https://github.com/hicccc77/WeFlow)：Windows/macOS 用户可使用 WeFlow 作为数据源。
- [Next.js](https://nextjs.org/)、[ECharts](https://echarts.apache.org/)、[better-sqlite3](https://github.com/WiseLibs/better-sqlite3)。

---

<a name="english"></a>

## English

WeChat Radar is a local-first intelligence dashboard for WeChat groups. It turns noisy group chats into daily briefings, cross-group topics, link intelligence, mentions, and per-group reports.

### Features

- Daily dashboard for messages, links, tools, anomalies, and people
- Codex CLI powered topic clustering by date
- Link intelligence with generated titles and deduplication
- Per-group daily reports with copy-friendly output
- Local SQLite storage by default
- Light and dark themes

### Install

```bash
git clone https://github.com/xieshunbin1233/wechat-radar.git
cd wechat-radar
pnpm install
pnpm rebuild better-sqlite3
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000). The first run redirects to `/setup`, where you can configure your WeChat display names and privacy confirmation, or enable demo mode.

### Requirements

- [ ] macOS with WeChat 4.x logged in
- [ ] Prefer a secondary/test WeChat account that has existed for at least six months
- [ ] Tested WeChat version: `4.1.9.58`; newer versions are not recommended for unverified testing
- [ ] Node.js 20+
- [ ] pnpm
- [ ] wx-cli initialized and running
- [ ] Optional: Codex CLI for better topic/link summaries

### Privacy

By default, runtime data is stored locally under `~/.wechat-radar/`. The app does not upload your chat database. You are responsible for using it in a way that respects WeChat rules, local laws, group privacy expectations, and organizational compliance.

Safety guidance:

- Prefer a secondary or test WeChat account that has existed for at least six months.
- Use this project for read-only historical chat access.
- Do not use it for Moments, likes, comments, sending messages, adding friends, profile changes, or any other write/social action.
- The tested WeChat version is `4.1.9.58`; newer versions may carry unknown account risk and are not recommended for unverified testing.

### Troubleshooting

| Problem | Fix |
| --- | --- |
| wx daemon not running / WeFlow not enabled | Start `wx daemon start` (macOS) or enable HTTP API in WeFlow settings (Windows), then refresh. |
| better-sqlite3 fails to load | Run `pnpm rebuild better-sqlite3`. |
| No dashboard data | Finish `/setup`, choose your data source, then click rescan. |
| Topic radar is empty | Open the date or click build topics; make sure `codex` is available. |

## License

Non-commercial research use only. See [LICENSE](LICENSE) and [DISCLAIMER.md](DISCLAIMER.md).
