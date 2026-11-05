#!/bin/bash
# 把任意一张图变成皮肤背景：压缩 → 内嵌 base64 → 打版本 → 装进 profile
# 用法：tools/set-background.sh <图片路径> [亮度, 默认 0.95]
set -euo pipefail

IMG="${1:?用法: tools/set-background.sh <图片路径> [亮度]}"
BRIGHT="${2:-0.95}"
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
CLIENT="$ROOT/lib/client.js"
PKGS="$HOME/.dsh/backups/pkgs"
PNPM=/Users/xuchaonan/.dsh/dsh-runtimes/dsh-primary-runtime/dependencies/pnpm/bin/pnpm.cjs

[ -f "$IMG" ] || { echo "找不���图片: $IMG"; exit 1; }

# 1) 编码成小 webp（宽度上限 1536）
python3 - "$IMG" "$BRIGHT" <<'PY'
import base64, sys
from PIL import Image, ImageEnhance
src, bright = sys.argv[1], float(sys.argv[2])
im = Image.open(src).convert("RGB")
w = min(1536, im.width)
im = im.resize((w, round(im.height * w / im.width)), Image.LANCZOS)
im = ImageEnhance.Brightness(im).enhance(bright)
im = ImageEnhance.Color(im).enhance(1.04)
im.save("/tmp/dsh-eva-bg.webp", "WEBP", quality=74, method=6)
b64 = base64.b64encode(open("/tmp/dsh-eva-bg.webp", "rb").read()).decode()
open("/tmp/dsh-eva-bg.b64", "w").write(b64)
print(f"webp {len(open('/tmp/dsh-eva-bg.webp','rb').read())} bytes -> base64 {len(b64)} chars")
PY

# 2) 替换 client.js 里唯一的那张 data URI
python3 - "$CLIENT" <<'PY'
import re, sys
p = sys.argv[1]
s = open(p, encoding="utf-8").read()
m = re.search(r"data:image/webp;base64,([A-Za-z0-9+/=]+)", s)
if not m:
    sys.exit("client.js 里没找到内嵌图")
s = s[:m.start(1)] + open("/tmp/dsh-eva-bg.b64").read().strip() + s[m.end(1):]
v = re.search(r"VERSION = '([0-9.]+)'", s)
if not v:
    sys.exit("client.js 里没找到 VERSION")
old = v.group(1)
parts = old.split(".")
parts[-1] = str(int(parts[-1]) + 1)
new = ".".join(parts)
s = s.replace(f"VERSION = '{old}'", f"VERSION = '{new}'", 1)
open(p, "w", encoding="utf-8").write(s)
print(old, "->", new)
PY

# 3) 同步 package.json 版本 + 语法检查 + 打包
VER=$(grep -m1 -o "VERSION = '[0-9.]*'" "$CLIENT" | cut -d"'" -f2)
/opt/homebrew/bin/node --check "$CLIENT"
/opt/homebrew/bin/node -e "
const fs=require('fs'),p='$ROOT/package.json',j=JSON.parse(fs.readFileSync(p,'utf8'));
j.version='$VER';fs.writeFileSync(p,JSON.stringify(j,null,2)+'\n')"
/opt/homebrew/bin/node "$PNPM" pack --pack-destination "$PKGS" >/dev/null
echo "打包完成: $PKGS/dsh-eva-skin-$VER.tgz"
echo "接着装：plugin_manager install_bundle  target=file:$PKGS/dsh-eva-skin-$VER.tgz"
