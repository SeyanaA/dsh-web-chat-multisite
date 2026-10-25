# Changelog

## 0.6.0-multisite

### Added
- **右键接力到 Web Chat**：在 DSH 对话里选中任意文字 → 右键 → 菜单项
  「在 Web Chat 中继续」→ 自动打开/聚焦 Web Chat，把选中文字按 `>` 引用格式
  填入网页版输入框（不自动发送，按 Enter 是你的动作）。
  - 若当前站点不是 DeepSeek，会自动切回 DeepSeek 再填入（上下文接力是 DeepSeek 能力）；
  - 输入框还在加载时会自动等待重试；成功/失败都有底部轻提示；
  - 仍然遵守上游原则：不读取网页回答、不自动发送、不发送未选中的内容。
- 右键菜单为 macOS 风格浮动菜单（玻璃材质、圆角、悬停高亮），不打扰原生输入框
  （输入框内的右键保留系统菜单）。

### Changed
- 右键菜单、提示文案支持中英双语（跟随 DSH 语言）。

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
