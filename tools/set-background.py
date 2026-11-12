#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""把任意一张图变成皮肤背景：压缩 → 内嵌 base64 → 打版本 → 装进 profile。

跨平台版（Windows / macOS），替代原来的 macOS shell 脚本：
不写死任何机器路径，仓库根目录由脚本自身位置推导，临时文件交给 tempfile，
输出目录读 DSH_HOME（未设置时回退 ~/.dsh）。

用法:
    python tools/set-background.py <图片路径> [亮度]   # 换图 + 版本 +1 + 打包
    python tools/set-background.py --pack-only         # 只打包，不换图
    python tools/set-background.py 图.png 0.95 --webp preview.webp   # 顺手留一份编码结果

亮度默认 0.95；Pillow 只在换图时需要，装依赖：python -m pip install pillow
"""
import argparse
import base64
import json
import os
import re
import shutil
import subprocess
import sys
import tempfile
from pathlib import Path

# ---- 常量：和旧 shell 脚本保持一致 ----
MAX_WIDTH = 1536
WEBP_QUALITY = 74
DEFAULT_BRIGHTNESS = 0.95
# 底图挂在 #dsh-eva-backdrop-layer 这一条规则里；取值可能是内嵌 data URI，
# 也可能是 strip-background 留下的纯 CSS 渐变。
# 注意 data URI 自身带分号（data:image/webp;base64,…），不能用 [^;]* 粗暴截断。
LAYER_RULE = re.compile(r"#dsh-eva-backdrop-layer\s*\{")
BG_DECL = re.compile(
    r"background-image:\s*"
    r'(?:url\("data:image/webp;base64,[A-Za-z0-9+/=]+"\)'
    r"|radial-gradient\([\s\S]*?linear-gradient\([^)]*\))\s*;"
)
VERSION_RE = re.compile(r"VERSION\s*=\s*'([0-9.]+)'")


def say(msg=""):
    print(msg)


def die(msg, code=1):
    print(f"错误: {msg}", file=sys.stderr)
    sys.exit(code)


def which_node():
    for name in ("node", "node.exe"):
        p = shutil.which(name)
        if p:
            return p
    die("找不到 node，请先安装 Node.js 并确保它在 PATH 里")


def run(cmd, **kw):
    """跑外部命令；Windows 上 npm 是 .cmd，个别环境需要经 COMSPEC 转一层。"""
    try:
        return subprocess.run(cmd, **kw)
    except OSError:
        if os.name != "nt" or not cmd[0].lower().endswith((".cmd", ".bat")):
            raise
        comspec = os.environ.get("COMSPEC", "cmd.exe")
        return subprocess.run([comspec, "/d", "/c", *cmd], **kw)


def encode_webp(src, brightness, out_path):
    """压到宽 ≤1536、调亮度/饱和、WebP q74，返回 base64 字符串。"""
    try:
        from PIL import Image, ImageEnhance
    except ImportError:
        die("缺少 Pillow。先装依赖：python -m pip install pillow\n"
            "（macOS 上如果是 python3 装的，用 python3 -m pip install pillow）")
    src = Path(src)
    if not src.is_file():
        die(f"找不到图片: {src}")
    try:
        im = Image.open(src)
    except Exception as exc:  # 格式不支持 / 文件损坏
        die(f"打不开图片 {src}: {exc}")

    im = im.convert("RGB")
    src_w, src_h = im.size
    w = min(MAX_WIDTH, src_w)
    h = round(src_h * w / src_w)
    im = im.resize((w, h), Image.Resampling.LANCZOS)
    im = ImageEnhance.Brightness(im).enhance(brightness)
    im = ImageEnhance.Color(im).enhance(1.04)
    im.save(out_path, "WEBP", quality=WEBP_QUALITY, method=6)

    raw = Path(out_path).read_bytes()
    b64 = base64.b64encode(raw).decode("ascii")
    say(f"webp {len(raw)} bytes（{src_w}x{src_h} → {w}x{h}，亮度 {brightness}）-> base64 {len(b64)} chars")
    return b64


def bump_version(text):
    """把 client.js 里的 VERSION 补丁号 +1，返回 (新文本, 旧版本, 新版本)。"""
    m = VERSION_RE.search(text)
    if not m:
        die("client.js 里没找到 VERSION")
    old = m.group(1)
    parts = old.split(".")
    parts[-1] = str(int(parts[-1]) + 1)
    new = ".".join(parts)
    return text[:m.start(1)] + new + text[m.end(1):], old, new


def embed_background(text, b64):
    """把 base64 写进 client.js 文本。已 strip 过的文件会把渐变占位换回图片。"""
    rule = LAYER_RULE.search(text)
    if not rule:
        die("client.js 里没找到 #dsh-eva-backdrop-layer 规则")
    block_start = rule.end()
    block_end = text.find("}", block_start)
    if block_end == -1:
        die("client.js 里 #dsh-eva-backdrop-layer 规则没有闭合")
    block = text[block_start:block_end]
    decl = f'background-image: url("data:image/webp;base64,{b64}");'
    if len(BG_DECL.findall(block)) != 1:
        die("client.js 的底图规则里不是唯一的 background-image 声明，放弃修改")
    new_block = BG_DECL.sub(lambda _m: decl, block, count=1)
    if new_block.count("base64,") != 1:
        die("内部检查失败：替换底图后残留了旧的 base64 数据，已放弃写入")
    say("已把底图写回 client.js 的 #dsh-eva-backdrop-layer")
    return text[:block_start] + new_block + text[block_end:]


def sync_package_version(root, ver):
    pkg_path = Path(root) / "package.json"
    if not pkg_path.is_file():
        die(f"找不到 {pkg_path}，无法同步版本号")
    raw = pkg_path.read_bytes()
    newline = "\r\n" if b"\r\n" in raw else "\n"
    data = json.loads(raw.decode("utf-8"))
    data["version"] = ver
    pkg_path.write_bytes((json.dumps(data, ensure_ascii=False, indent=2) + newline).encode("utf-8"))
    say(f"package.json version -> {ver}")


def check_client(client_path):
    node = which_node()
    r = run([node, "--check", str(client_path)], cwd=str(Path(client_path).parent.parent))
    if r.returncode != 0:
        die("node --check 失败，client.js 语法有问题")
    say("node --check 通过")


def pack(root, dest):
    """优先 pnpm，其次 npm；产物落到 dest 并返回 tgz 路径。"""
    dest = Path(dest)
    dest.mkdir(parents=True, exist_ok=True)
    npm = shutil.which("npm")
    pnpm = shutil.which("pnpm")
    if pnpm:
        cmd, label = [pnpm, "pack", "--pack-destination", str(dest)], "pnpm"
    elif npm:
        cmd, label = [npm, "pack", "--pack-destination", str(dest)], "npm"
    else:
        die("找不到 npm / pnpm，无法打包")
    say(f"打包中（{label} pack --pack-destination {dest}）…")
    r = run(cmd, cwd=str(root), capture_output=True, text=True)
    if r.returncode != 0:
        say(r.stdout.strip())
        say(r.stderr.strip())
        die(f"{label} pack 失败（退出码 {r.returncode}）")

    tgz = None
    for line in r.stdout.splitlines():
        line = line.strip()
        if line.endswith(".tgz"):
            tgz = Path(line) if os.path.isabs(line) else dest / Path(line).name
    if tgz is None:  # 输出格式变了就退而求其次：按修改时间取最新
        cands = sorted(dest.glob("*.tgz"), key=lambda p: p.stat().st_mtime)
        if cands:
            tgz = cands[-1]
    if tgz is None or not tgz.is_file():
        die(f"打包命令跑完了，但没找到产物（看看 {dest}）")
    return tgz


def dsh_pkgs_dir():
    home = os.environ.get("DSH_HOME") or os.path.join(os.path.expanduser("~"), ".dsh")
    return Path(home) / "backups" / "pkgs"


def main():
    ap = argparse.ArgumentParser(
        description="把图片压成 WebP 内嵌进皮肤并打包（跨平台，Windows / macOS 通用）")
    ap.add_argument("image", nargs="?", help="图片路径")
    ap.add_argument("brightness", nargs="?", type=float, default=None,
                    help=f"亮度，默认 {DEFAULT_BRIGHTNESS}")
    ap.add_argument("--client", help="要改的 client.js 路径（默认 <仓库根>/lib/client.js）")
    ap.add_argument("--root", help="仓库根目录（默认由脚本位置推导）")
    ap.add_argument("--dest", help="打包输出目录（默认 $DSH_HOME/backups/pkgs）")
    ap.add_argument("--webp", help="把编码出的 webp 另存到指定路径（调试用）")
    ap.add_argument("--pack-only", action="store_true", help="不换图，只打当前代码的包")
    ap.add_argument("--skip-pack", action="store_true", help="换图但不打包（调试用）")
    args = ap.parse_args()

    script_root = Path(__file__).resolve().parent.parent
    if args.root:
        root = Path(args.root).resolve()
    elif args.client:
        root = Path(args.client).resolve().parent.parent
    else:
        root = script_root
    client_path = Path(args.client).resolve() if args.client else root / "lib" / "client.js"
    if not client_path.is_file():
        die(f"找不到 {client_path}")
    dest = Path(args.dest).resolve() if args.dest else dsh_pkgs_dir()
    say(f"仓库根目录: {root}")

    if args.pack_only:
        check_client(client_path)
        # 顺手核对两处版本号，不一致只提示、不擅自改
        m = VERSION_RE.search(client_path.read_text(encoding="utf-8"))
        pkg = root / "package.json"
        if m and pkg.is_file():
            pkg_ver = json.loads(pkg.read_text(encoding="utf-8")).get("version")
            if pkg_ver != m.group(1):
                say(f"提醒: client.js VERSION={m.group(1)} 与 package.json version={pkg_ver} 不一致")
        tgz = pack(root, dest)
        say(f"打包完成: {tgz}")
        say(f"接着装：plugin_manager install_bundle  target=file:{tgz}")
        return

    if not args.image:
        ap.error("要么给一张图片，要么用 --pack-only")

    brightness = args.brightness if args.brightness is not None else DEFAULT_BRIGHTNESS
    tmp = None
    try:
        if args.webp:
            webp_path = Path(args.webp).resolve()
            webp_path.parent.mkdir(parents=True, exist_ok=True)
        else:
            fd, tmp = tempfile.mkstemp(prefix="dsh-eva-bg-", suffix=".webp")
            os.close(fd)
            webp_path = Path(tmp)
        b64 = encode_webp(args.image, brightness, webp_path)
        if args.webp:
            say(f"webp 已另存: {webp_path}")

        # 按字节读写，保住原文件的 CRLF/LF；全部改完再一次性落盘
        text = client_path.read_bytes().decode("utf-8")
        text = embed_background(text, b64)
        text, old, new = bump_version(text)
        client_path.write_bytes(text.encode("utf-8"))
        say(f"VERSION {old} -> {new}")

        check_client(client_path)
        sync_package_version(root, new)
    finally:
        if tmp:
            try:
                os.unlink(tmp)
            except OSError:
                pass

    if args.skip_pack:
        say(f"已跳过打包。之后可手动打包到 {dest}：npm pack --pack-destination {dest}")
        return
    tgz = pack(root, dest)
    say(f"打包完成: {tgz}")
    say(f"接着装：plugin_manager install_bundle  target=file:{tgz}")


if __name__ == "__main__":
    main()
