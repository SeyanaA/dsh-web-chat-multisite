# Changelog

## 0.7.0-multisite

### Added
- **「引用上下文」支持全部四个站点**（此前只有 DeepSeek）：勾选 Harness 会话里的消息
  → 生成 `>` 引用块 → 填入**当前站点**的输入框，无需切回 DeepSeek。
  - 按站点接入各自的 composer 适配器：
    - DeepSeek：React 受控 `<textarea>`（原生 value setter + `input`/`change` 事件）；
    - ChatGPT：ProseMirror 编辑器（`#prompt-textarea`，含 `.ProseMirror` 兜底）；
    - Claude：回复区 fieldset 里的 ProseMirror（含通用 contenteditable 兜底）；
    - Gemini：`<rich-textarea>` 里的 Quill（`.ql-editor`，含通用兜底）。
  - contenteditable 的写入策略：先记下输入框原有内容，选中全部内容后，单行走编辑器
    自己的 `insertText`，多行走合成 `paste`（富文本编辑器会把每行拆成段落，引用块不会
    糊成一行）；写完读回比对，内容确实变了才算成功，没变才尝试下一条路径，因此不会重复
    写入，也不会把输入框里原有的草稿误判成「已经写入」；全部路径失败则返回失败，由面板
    提示，而不是假装写入成功。最后还有 `textContent` 兜底。写入前补发 `selectionchange`。
  - 输入框里已有草稿时按「替换」处理（与 DeepSeek 覆盖 `.value` 的行为一致），失败时
    草稿保持原样。
  - 选择器链全部限定在对应站点的输入框容器内（ChatGPT 的 `form`、Claude 的 `fieldset`、
    Gemini 的 `rich-textarea`），避免网页改版后命中页面上其它 contenteditable。
  - 发送兜底（找不到 Enter 效果时点发送按钮）只在输入框所在 `form`（或输入框附近的
    垂直范围内）找按钮，避免误点侧栏的「Send feedback」。
  - 发送仍走「在输入框上派发 Enter 键」的既有思路（四个站点都用 Enter 发送），
    失效时再找带 send / submit / 发送 的无障碍名称按钮。
- **右键接力跟随当前站点**：选中 DSH 文字 → 「在 Web Chat 中继续」现在填入当前显示的
  站点，不再强制切回 DeepSeek；等待 guest 落到该站点后才写入。
- 新增冒烟测试：四个站点都必须有「引用上下文」按钮；逐个站点检查 composer 脚本的
  选择器、编辑器命令路径、粘贴兜底、`selectionchange` 与换行检测；并用模拟编辑器
  执行 `fillScript`，覆盖单行 / 多行 / 兜底 / 已有草稿 / 只读编辑器五种情况，确认
  只写入一次、草稿被替换、失败时不会误报成功。

### Changed
- 文案去掉「仅 DeepSeek 支持上下文接力」的说法：`status.site`、`settings.deepseekNote`、
  引用预览标题与提示、填入 / 发送 / 找不到输入框的 toast 都改为带 `{site}` 的站点名；
  设置页说明改为「上下文引用四站点可用；会话绑定与登录快照仅 DeepSeek」。
- 文件头注释与 `pushSelectionToWebChat` 注释同步更新。

## 0.6.1-multisite

### Added
- **设置页新增 Web Chat 分节**（设置 → Web Chat），把网页面板的偏好集中到 DSH 设置里：
  - **默认网页**：DeepSeek / ChatGPT / Gemini / Claude 四选一；与面板工具栏下拉共用同一个
    偏好键，改完立即生效，切换后当前面板也会跟着切换，重启后沿用上次选择；
  - **启动 DSH 时自动打开 Web Chat**：可选开关（默认关闭），启动后自动展开右侧 Web Chat
    面板（需要当前已有会话，没有会话时静默跳过）；
  - **打开 Web Chat** 按钮：直接从设置页跳转到面板；
  - 提示自动填入/上下文接力仅对 DeepSeek 生效。

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
