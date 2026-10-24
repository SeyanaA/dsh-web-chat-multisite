#!/bin/bash
# Web Chat for DSH — uninstaller (macOS)
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
RUNNING_PATTERN="DeepSeek Harness.app/Contents/MacOS/DeepSeek Harness"

say "══════════════════════════════════════════════"
say "  Web Chat for DSH · 卸载"
say "══════════════════════════════════════════════"

[ -d "$PROFILE_DIR" ] || fail "没找到 profile：$PROFILE_DIR"
if [ "${DSH_SKIP_RUNNING_CHECK:-0}" != "1" ] && pgrep -f "$RUNNING_PATTERN" >/dev/null 2>&1; then
  if [ "${DSH_INSTALL_ASSUME_QUIET:-0}" != "1" ]; then
    say ""
    say "⚠️  DeepSeek Harness 正在运行，请先完全退出（⌘Q）。"
    read -r -p "   退出后按回车继续…" _ || true
    pgrep -f "$RUNNING_PATTERN" >/dev/null 2>&1 && fail "DeepSeek Harness 仍在运行，卸载已取消。"
  else
    fail "DeepSeek Harness 正在运行，卸载已取消。"
  fi
fi

if [ -x "$CLI" ]; then
  say "→ 从 profile 移除依赖…"
  "$CLI" plugin --profile "$PROFILE_NAME" remove dsh-deepseek-webchat 2>&1 | tail -n 10 || true
fi

[ -x "$NODE" ] || NODE="$(command -v node || true)"
if [ -n "${NODE:-}" ] && [ -f "$PROFILE_DIR/package.json" ]; then
  cp "$PROFILE_DIR/package.json" "$PROFILE_DIR/package.json.bak-webchat-uninstall-$(date +%Y%m%d-%H%M%S)"
  say "→ 关闭插件 bundle…"
  "$NODE" - "$PROFILE_DIR/package.json" <<'NODE_EOF'
const fs = require('node:fs')
const file = process.argv[2]
const name = 'dsh-deepseek-webchat'
const pkg = JSON.parse(fs.readFileSync(file, 'utf8'))
const bundles = pkg?.dsh?.profile?.bundles
if (Array.isArray(bundles)) pkg.dsh.profile.bundles = bundles.filter((entry) => entry !== name)
if (pkg.dependencies && Object.prototype.hasOwnProperty.call(pkg.dependencies, name)) delete pkg.dependencies[name]
fs.writeFileSync(file, JSON.stringify(pkg, null, 2) + '\n')
NODE_EOF
fi

say "→ 删除插件文件…"
rm -rf "$STABLE_DIR"
rm -rf "$PROFILE_DIR/node_modules/dsh-deepseek-webchat"
rm -f "$PROFILE_DIR/node_modules/.pnpm/dsh-deepseek-webchat"* 2>/dev/null || true

say ""
say "✅ 卸载完成。重新打开 DeepSeek Harness 即可。"
if [ "${DSH_INSTALL_ASSUME_QUIET:-0}" != "1" ] && [ -t 0 ]; then
  read -r -p "现在打开 DeepSeek Harness？(y/N) " answer || true
  case "${answer:-}" in y|Y) open -a "$APP" ;; esac
fi
