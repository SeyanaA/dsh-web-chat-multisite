# dsh-deepseek-webchat (multisite fork)

DSH Desktop 插件：在侧边栏 Web Chat Tab 里托管**真实网页版**聊天，支持
DeepSeek / ChatGPT / Gemini / Claude 四个站点（工具栏下拉切换）。

本包是 [dsh-deepseek-webchat](https://github.com/Ckarefulon/dsh-deepseek-webchat)
0.4.10 的二次开发版本，详见仓库根目录 `NOTICE` 与 `docs/CHANGES-vs-upstream.diff`。

- 依赖 DSH Desktop（原生 browser guest 通道），不支持纯 `dsh web`。
- **四个站点都能「引用上下文」**：把 DSH 会话消息整理成 `>` 引用块，填入当前站点的
  输入框。各站点使用自己的 composer 适配器（DeepSeek 的受控 textarea；ChatGPT /
  Claude 的 ProseMirror；Gemini 的 Quill），互不共用选择器。
- DeepSeek 站点另外保留原始能力：每会话绑定一个 DeepSeek 对话、登录快照恢复。
- ChatGPT / Gemini / Claude 站点跨应用重启的登录能否恢复取决于各站点凭据存储方式
  （HttpOnly cookie 无法被读取）。

安装：把整个目录交给 DSH 的插件管理器（本地目录安装），或在桌面版
「设置 → 插件 → 添加插件」里选择该目录的绝对路径。
