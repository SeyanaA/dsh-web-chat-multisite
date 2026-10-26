# Web Chat for DSH · 多站点网页聊天面板

> **二次开发声明**：本项目是基于 [Ckarefulon/dsh-deepseek-webchat](https://github.com/Ckarefulon/dsh-deepseek-webchat)
> （MIT，v0.4.10）的修改版（fork），不是上游官方项目。修改内容与上游代码差异见
> [`NOTICE`](./NOTICE) 和 [`docs/CHANGES-vs-upstream.diff`](./docs/CHANGES-vs-upstream.diff)。

在 **DeepSeek Harness Desktop** 的左侧栏里加一个 **Web Chat** 面板：用桌面端原生
browser guest（不是 iframe）托管**真实网页版**聊天，工具栏下拉即可在
**DeepSeek / ChatGPT / Gemini / Claude** 之间切换，登录态、对话历史都是各站点自己的网页版。
**四个站点都能「引用上下文」**：勾选 Harness 会话里的消息，整理成 `>` 引用块填进当前站点
的输入框；DeepSeek 站点另外保留上游的会话绑定与登录快照恢复。

## 功能

- **左上角入口**：左侧栏「新会话」正下方的全局面板行 **Web Chat**（原生 slot，非 DOM 注入）。
  点击打开/聚焦右侧 Web Chat Tab，主区继续停留在当前对话。
- **四站点下拉**：面板工具栏最左侧 `DeepSeek ▾`，可切到 **ChatGPT / Gemini / Claude**；
  选择会被记住，下次打开还是上次的站点。
- **真实网页版**：`chat.deepseek.com`、`chatgpt.com`、`gemini.google.com`、`claude.ai`
  都是官方页面本身，经由桌面端原生 browser guest 加载（内嵌浏览器分区、沙箱、拒绝权限请求，
  与 DSH 内置 Browser 侧栏同一机制）。
- **设置页**：`设置 → Web Chat` 可选择**默认网页**（四站点任选，改完立即切换当前面板）、
  开关「启动 DSH 时自动打开 Web Chat」，以及一键打开面板。
- **右键接力**：在 DSH 对话里选中文字 → 右键 → **在 Web Chat 中继续**。
  自动打开 Web Chat 并把选中内容按 `>` 引用格式填入**当前站点**的输入框（不自动发送）。
- **引用上下文（四站点通用）**：勾选 Harness 会话中的消息 / AI 提问 / 你的回答 / 待办，
  生成引用块后填入当前站点的输入框，可「仅填入」或「填入并发送」（默认不包含 reasoning、
  工具调用与结果，避免泄露）。各站点输入框适配：
  - DeepSeek：React 受控 `<textarea>`（原生 value setter + input 事件）；
  - ChatGPT / Claude：ProseMirror 编辑器（`#prompt-textarea` / fieldset 里的 `.ProseMirror`）；
  - Gemini：`<rich-textarea>` 里的 Quill 编辑器（`.ql-editor`）。
  单行内容走编辑器的 `insertText`，多行走合成 `paste`（富文本编辑器会把每行拆成段落，
  引用块不会糊成一行）。写入前先记下输入框原有内容，写完再读一次比对：内容变了才算成功，
  没变才尝试下一条路径（所以不会重复写入），全部失败则明确报错而不是假装成功；输入框里
  已有的草稿会被引用内容替换（与 DeepSeek 的覆盖行为一致）。每条选择器链都限定在对应
  站点的输入框容器内（`form` / `fieldset` / `rich-textarea`），不会写到页面上别的可编辑框。
- **DeepSeek 专属能力保留**：
  - 每个 DSH 会话 ↔ 一个 DeepSeek 对话自动绑定（切换会话时右侧面板跟着切）；
  - 登录快照恢复：应用重启后自动恢复 DeepSeek 网页登录（凭据在本机 localStorage）。
  - 切到 ChatGPT / Gemini / Claude 时，绑定状态与「解除绑定」按钮自动隐藏。
- **无遥测**：插件自身不发起任何网络请求；唯一的流量是各网页版自己访问自己的服务器。

## 环境要求

- **DeepSeek Harness Desktop** ≥ `0.2.0-rc.1`（本项目在 `0.2.1-rc.3` 上开发和验证），
  仅 macOS 的 DMG 安装包按 macOS 测试；
- 纯 `dsh web`（浏览器 profile）**不支持**——没有桌面端 browser guest 通道；
- 脚本安装需要系统里有 `node`（DMG 安装脚本会优先使用 DSH 自带的 Node）。

## 安装（DMG，推荐）

1. 从 [Releases](https://github.com/SeyanaA/dsh-web-chat-multisite/releases/latest) 下载
   `Web-Chat-for-DSH-0.7.0-multisite.dmg` 并双击打开；
2. **先完全退出 DeepSeek Harness（⌘Q）**（安装脚本会检查并提示）；
3. 双击 DMG 里的 **安装 Web Chat.command**；
   - 如果 macOS 提示「无法验证开发者」：右键该文件 →「打开」→ 再点「打开」；
4. 重新打开 DeepSeek Harness 桌面版，左侧栏「新会话」下面出现 **Web Chat**；
5. 打开面板，在顶部下拉里选择站点，登录对应网页版。

安装脚本做的事（全部可逆）：

- 把插件复制到 `~/.dsh/local-plugins/dsh-deepseek-webchat`；
- 用 DSH 自带的 CLI 执行 `plugin --profile desktop add link:<该目录>`；
- 在 `~/.dsh/profiles/desktop/package.json` 的 `dsh.profile.bundles` 里启用
  `dsh-deepseek-webchat`（改动前会备份 `package.json`）。

## 安装（手动 / 开发）

把本仓库 `plugin/` 目录作为 DSH bundle 安装即可（目录安装方式，见上游插件管理器：

```text
设置 → 插件 → 添加插件 → 填入 <本仓库>/plugin 的绝对路径 → 启用 dsh-deepseek-webchat
```

或直接用 DSH 桌面端自带的 CLI：

```bash
"/Applications/DeepSeek Harness.app/Contents/Resources/runtime/cli/bin/dsh" \
  plugin --profile desktop add link:"$PWD/plugin"
```

## 使用

1. 左侧栏点 **Web Chat**，右侧打开面板；
2. 顶部下拉选择 **DeepSeek / ChatGPT / Gemini / Claude**，等页面加载后登录；
3. 点「引用上下文」勾选 Harness 里的消息，生成引用块后填入**当前站点**的输入框
   （四个站点都适用，不必切回 DeepSeek）；
4. 在 DeepSeek 站点里发一条消息后，当前 DSH 会话会自动与它绑定（状态点变绿）；
5. 想换站点随时切，互不影响。

## 登录态说明（重要）

| 场景 | 行为 |
| --- | --- |
| 同一次应用运行内切换站点 | ✅ 各站点登录态都在（guest 分区按域保留 cookie） |
| 应用完全重启后 | DeepSeek ✅（凭据在 localStorage，快照会恢复）；ChatGPT / Claude / Gemini ⚠️ 可能需要重新登录 |

原因：桌面端 browser guest 的分区是**进程级**的，重启即丢弃；插件能读到的只有页面
`localStorage` 与非 HttpOnly cookie。ChatGPT / Claude / Gemini 的登录凭据通常在
**HttpOnly cookie** 里，桥接层读不到，因此无法跨应用重启恢复。另外：

- Gemini 的 Google 登录、以及 ChatGPT/Claude 的「Continue with Google」可能被内嵌
  WebView 拦截，建议优先用邮箱 + 验证码 / 密码登录；
- ChatGPT / Claude 可能触发 Cloudflare 人机校验；真实窗口内通常可通过，视网络环境而定。

## 已知限制

- 仅桌面端可用；纯 `dsh web` 会提示不支持。
- 同一站点一个 Web Chat Tab（按 DSH 会话）。
- 网页改版可能影响「引用上下文」的输入框定位：四个站点各有一组限定在输入框容器内的
  候选选择器，改版后最坏情况是提示「没找到 {站点} 输入框」或「写入失败」，不会把内容
  写进页面上的其它可编辑框；嵌入、站点切换、登录不受影响。
- 本插件改动的是 `~/.dsh/profiles/...` 下的第三方插件；上游升级会覆盖（本仓库 DMG
  可随时重装本版本）。

## 卸载

双击 DMG 里的 **卸载 Web Chat.command**（会先要求退出 DSH），或在 DSH「设置 → 插件」
里禁用/移除 `dsh-deepseek-webchat`。

## 仓库内容

```
plugin/                 # 可安装的 DSH 插件（lib 已构建，无需编译）
installer/              # DMG 里的双击安装 / 卸载脚本（同源）
test/                   # 纯函数级冒烟测试（node，无外部依赖）
docs/CHANGES-vs-upstream.diff   # 与上游 0.4.10 的完整代码差异
```

冒烟测试：

```bash
node test/client-smoke.mjs   # mock ctx/React 执行 client bundle：面板渲染、站点下拉、四站点引用按钮、composer 脚本行为
node test/host-snapshot.mjs  # 宿主端会话快照 v1→v2 迁移与按站点读写
```

## 许可与致谢

- 协作开发：[Codex](https://github.com/codex)（OpenAI 编程助手）。
- 上游：[dsh-deepseek-webchat](https://github.com/Ckarefulon/dsh-deepseek-webchat)
  © 2026 Ckarefulon，MIT License；
- 本修改版 © 2026 SeyanaA，同样以 MIT License 发布，完整声明见 [`LICENSE`](./LICENSE)
  与 [`NOTICE`](./NOTICE)。

DeepSeek、ChatGPT、Gemini、Claude 分别为其各自所有者的商标；本项目为非官方项目，
与 DeepSeek / OpenAI / Google / Anthropic 无关联。
