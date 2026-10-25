基于上游 [Ckarefulon/dsh-deepseek-webchat](https://github.com/Ckarefulon/dsh-deepseek-webchat) v0.4.10（MIT）的二次开发版本。

## 0.6.1-multisite · 新增设置页

- **设置 → Web Chat**：默认网页（DeepSeek / ChatGPT / Gemini / Claude）四选一，改完立即
  切换当前面板并记住选择；
- **启动 DSH 时自动打开 Web Chat** 开关（默认关闭）；
- **打开 Web Chat** 按钮，从设置页直接跳到面板；
- 提示：自动填入与右键接力仅对 DeepSeek 生效。

`Web-Chat-for-DSH-0.6.1-multisite.dmg`

## 0.6.0-multisite · 新增右键接力

- **选中对话文字 → 右键 → 「在 Web Chat 中继续」**：自动打开 Web Chat，把选中内容按
  `>` 引用格式填入网页版输入框（不自动发送，按 Enter 由你决定）；
- 当前站点不是 DeepSeek 时会自动切回 DeepSeek；输入框未就绪会自动等待重试；
- 成功/失败底部轻提示；右键菜单为 macOS 风格玻璃浮动菜单，输入框内保留系统菜单。

`Web-Chat-for-DSH-0.6.0-multisite.dmg`

## 0.5.0-multisite 改动

- **左侧栏入口**：`Web Chat` 全局面板行（「新会话」正下方），替代原来的会话头部图标。
- **站点下拉**：面板工具栏可切换 **DeepSeek / ChatGPT / Gemini / Claude** 四个官方网页版，选择会记住。
- **DeepSeek 能力保留**：会话绑定、引用上下文到 DeepSeek 输入框、登录快照恢复。
- **宿主端按站点保存登录快照**（`session.json` v2，v1 自动迁移）。

## 安装包

`Web-Chat-for-DSH-0.5.0-multisite.dmg`（ 72K）

1. 下载后打开 DMG；
2. **先完全退出 DeepSeek Harness（⌘Q）**；
3. 双击 **安装 Web Chat.command**（首次可能需要在右键菜单里选「打开」）；
4. 重新打开 DeepSeek Harness，左侧栏「新会话」下方出现 **Web Chat**。

要求：macOS + DeepSeek Harness Desktop ≥ 0.2.0-rc.1（在 0.2.1-rc.3 上开发验证）。

## 校验

```
SHA-256  427103d241b8d703c8614ba8afc00bcb1907a06212c89cb4aca2ca796be6c4cf
```

## 已知限制

- 仅桌面版可用；纯 `dsh web` 不支持。
- 应用重启后 DeepSeek 登录会自动恢复；ChatGPT / Claude / Gemini 的登录凭据通常在 HttpOnly cookie 中，跨重启可能需要重新登录；Google 登录可能被内嵌 WebView 拦截。

完整说明见仓库 README。上游版权声明见 LICENSE 与 NOTICE；本项目为第三方修改版，与 DeepSeek / OpenAI / Google / Anthropic 无关联。
