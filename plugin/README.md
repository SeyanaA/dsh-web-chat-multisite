# dsh-deepseek-webchat (multisite fork)

DSH Desktop 插件：在侧边栏 Web Chat Tab 里托管**真实网页版**聊天，支持
DeepSeek / ChatGPT / Gemini / Claude 四个站点（工具栏下拉切换）。

本包是 [dsh-deepseek-webchat](https://github.com/Ckarefulon/dsh-deepseek-webchat)
0.4.10 的二次开发版本，详见仓库根目录 `NOTICE` 与 `docs/CHANGES-vs-upstream.diff`。

- 依赖 DSH Desktop（原生 browser guest 通道），不支持纯 `dsh web`。
- DeepSeek 站点保留原始能力：每会话绑定一个 DeepSeek 对话、把 DSH 会话消息
  勾选后填入 DeepSeek 输入框、登录快照恢复。
- ChatGPT / Gemini / Claude 站点仅提供网页托管与站点切换；跨应用重启的登录
  能否恢复取决于各站点凭据存储方式（HttpOnly cookie 无法被读取）。

安装：把整个目录交给 DSH 的插件管理器（本地目录安装），或在桌面版
「设置 → 插件 → 添加插件」里选择该目录的绝对路径。
