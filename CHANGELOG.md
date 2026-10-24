# Changelog

## 0.5.0-multisite

基于上游 `dsh-deepseek-webchat@0.4.10` 的二次开发版本。

### Added
- 左侧栏「新会话」下方新增 **Web Chat** 全局面板入口（原生 slot
  `sidebar.panellist` + `main` 视图），替代原来的会话头部图标。
- 面板工具栏新增站点下拉：**DeepSeek / ChatGPT / Gemini / Claude**；
  切换时同一个桌面原生 browser guest 直接导航到对应网页版，选择会被记住。
- 宿主端按站点分别保存登录快照（`session.json` v2），v1 的 DeepSeek 快照
  自动迁移。
- 非 DeepSeek 站点自动隐藏「引用上下文 / 解除绑定 / 绑定状态」等
  DeepSeek 专属控件。

### Changed
- Tab 标题与侧栏引导文案从「DeepSeek 网页版」改为通用的「Web Chat」。
- 包名沿用上游包名，便于覆盖安装；版本号使用 `0.5.0-multisite` 表示派生版本。

### Security / privacy
- 行为与上游一致：不发送任何未点击的内容；登录快照只存本机
  `~/.dsh/dsh-deepseek-webchat/session.json`。
