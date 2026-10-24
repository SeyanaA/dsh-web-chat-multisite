#!/bin/bash
# Web Chat for DSH — installer (macOS)
# 把本 DMG 里的插件安装到 DeepSeek Harness Desktop 的 desktop profile。
set -euo pipefail
cd "$(dirname "$0")"

say() { printf '%s\n' "$*"; }
fail() {
  printf '❌ %s\n' "$*" >&2
  if [ "${DSH_INSTALL_ASSUME_QUIET:-0}" != "1" ] && [ -t 0 ]; then read -r -p "按回车关闭…" _ || true; fi
  exit 1
}

APP="${DSH_APP:-/Applications/DeepSeek Harness.app}"
CLI="$APP/Contents/Resources/runtime/cli/bin/dsh"
NODE="$APP/Contents/Resources/runtime/primary-runtime/dependencies/node/bin/node"
PROFILE_NAME="${DSH_PROFILE_NAME:-desktop}"
DSH_HOME_DIR="${DSH_HOME:-$HOME/.dsh}"
PROFILE_DIR="$DSH_HOME_DIR/profiles/$PROFILE_NAME"
STABLE_DIR="$DSH_HOME_DIR/local-plugins/dsh-deepseek-webchat"
PLUGIN_DIR="$PWD/dsh-deepseek-webchat"
[ -d "$PLUGIN_DIR/lib" ] || PLUGIN_DIR="$PWD/../plugin"
RUNNING_PATTERN="DeepSeek Harness.app/Contents/MacOS/DeepSeek Harness"

say "══════════════════════════════════════════════"
say "  Web Chat for DSH · 安装"
say "══════════════════════════════════════════════"

[ -d "$APP" ] || fail "没找到 DeepSeek Harness.app（${APP}）。请先安装 DeepSeek Harness 桌面版。"
[ -x "$CLI" ] || fail "找不到 DSH 自带的命令行工具：$CLI"
[ -d "$PLUGIN_DIR/lib" ] || fail "安装包不完整：缺少 $PLUGIN_DIR/lib"
[ -d "$PROFILE_DIR" ] || fail "没找到 profile：$PROFILE_DIR
请先启动一次 DeepSeek Harness 桌面版并完成初始设置，再运行本安装脚本。"

if [ "${DSH_SKIP_RUNNING_CHECK:-0}" != "1" ] && pgrep -f "$RUNNING_PATTERN" >/dev/null 2>&1; then
  if [ "${DSH_INSTALL_ASSUME_QUIET:-0}" != "1" ]; then
    say ""
    say "⚠️  DeepSeek Harness 正在运行。"
    say "   请先完全退出（菜单栏 → 退出 DeepSeek Harness，或 ⌘Q），再继续。"
    read -r -p "   退出后按回车继续…" _ || true
    pgrep -f "$RUNNING_PATTERN" >/dev/null 2>&1 && fail "DeepSeek Harness 仍在运行，安装已取消。"
  else
    fail "DeepSeek Harness 正在运行，安装已取消。"
  fi
fi

say "→ 复制插件到 $STABLE_DIR"
rm -rf "$STABLE_DIR"
mkdir -p "$STABLE_DIR"
cp -R "$PLUGIN_DIR/." "$STABLE_DIR/"

say "→ 注册到 profile「${PROFILE_NAME}」…"
if ! "$CLI" plugin --profile "$PROFILE_NAME" add "link:$STABLE_DIR" 2>&1 | tail -n 20; then
  say "   （CLI 注册失败，将使用直接写入 profile 的方式，效果相同）"
fi

[ -x "$NODE" ] || NODE="$(command -v node || true)"
[ -n "${NODE:-}" ] || fail "找不到 node，无法写入 profile 配置。"

BACKUP="$PROFILE_DIR/package.json.bak-webchat-$(date +%Y%m%d-%H%M%S)"
cp "$PROFILE_DIR/package.json" "$BACKUP"
say "→ 启用插件 bundle（已备份 package.json → $(basename "$BACKUP")）"

"$NODE" - "$PROFILE_DIR/package.json" "$STABLE_DIR" <<'NODE_EOF'
const fs = require('node:fs')
const [file, stableDir] = process.argv.slice(2)
const name = 'dsh-deepseek-webchat'
const pkg = JSON.parse(fs.readFileSync(file, 'utf8'))
pkg.dsh = pkg.dsh || {}
pkg.dsh.profile = pkg.dsh.profile || {}
const bundles = Array.isArray(pkg.dsh.profile.bundles) ? pkg.dsh.profile.bundles : []
if (!bundles.includes(name)) bundles.push(name)
pkg.dsh.profile.bundles = bundles
pkg.dependencies = pkg.dependencies || {}
pkg.dependencies[name] = 'link:' + stableDir
fs.writeFileSync(file, JSON.stringify(pkg, null, 2) + '\n')
NODE_EOF

# pnpm/CLI 失败时也保证 node_modules 里有可解析的插件目录
if [ -e "$PROFILE_DIR/node_modules/dsh-deepseek-webchat" ] || [ -L "$PROFILE_DIR/node_modules/dsh-deepseek-webchat" ]; then :; else
  mkdir -p "$PROFILE_DIR/node_modules"
  ln -sfn "$STABLE_DIR" "$PROFILE_DIR/node_modules/dsh-deepseek-webchat"
fi

say ""
say "✅ 安装完成！"
say ""
say "下一步："
say "  1. 重新打开 DeepSeek Harness 桌面版；"
say "  2. 左侧栏「新会话」下方会多出 Web Chat；"
say "  3. 打开后，在面板顶部下拉里选择 DeepSeek / ChatGPT / Gemini / Claude。"
say ""
say "提示：ChatGPT / Claude / Gemini 的登录态可能无法跨应用重启保留（详见 README）。"
if [ "${DSH_INSTALL_ASSUME_QUIET:-0}" != "1" ] && [ -t 0 ]; then
  read -r -p "现在打开 DeepSeek Harness？(y/N) " answer || true
  case "${answer:-}" in y|Y) open -a "$APP" ;; esac
fi
