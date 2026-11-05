#!/usr/bin/env bash
# 去掉内嵌的底图（发布到公共 npm 前跑一次），把 data URI 换成纯 CSS 渐变底。
# 用法：./tools/strip-background.sh
set -euo pipefail

cd "$(dirname "$0")/.."

python3 - <<'PY'
import re, pathlib
p = pathlib.Path('lib/client.js')
s = p.read_text(encoding='utf-8')
new, n = re.subn(
    r'background-image: url\("data:image/webp;base64,[A-Za-z0-9+/=]+"\);',
    'background-image: radial-gradient(120% 90% at 78% 12%, rgba(123, 75, 216, 0.55) 0%, transparent 60%),\n'
    '    radial-gradient(90% 80% at 12% 88%, rgba(46, 107, 230, 0.35) 0%, transparent 62%),\n'
    '    linear-gradient(160deg, #0A0A16 0%, #08080F 55%, #0A0710 100%);',
    s,
)
if n == 0:
    print('no embedded image found — nothing to strip')
    raise SystemExit(0)
p.write_text(new, encoding='utf-8')
print(f'stripped {n} embedded image(s); bundle is now CSS-only')
PY

/opt/homebrew/bin/node --check lib/client.js
echo "size: $(wc -c < lib/client.js) bytes"
