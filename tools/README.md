# tools/

插件仓库里的小工具。全部跨平台（Windows PowerShell / macOS zsh 通用），不依赖 bash；
需要 Python 的只有 `set-background.py` 一个。

| 脚本 | 作用 | 依赖 |
| --- | --- | --- |
| `set-background.py` | 把一张图压成 WebP 内嵌进 `lib/client.js`，补丁版本 +1、同步 `package.json` 并打包 | Python 3 + Pillow |
| `strip-background.mjs` | 去掉内嵌底图，换成纯 CSS 渐变底（发布到公共 npm 前跑） | Node，无第三方依赖 |
| `audit-selectors.mjs` | 选择器体检：检查 `[class*=…]` 在当前 DSH 构建里是否还有命中 | Node，无第三方依赖 |
| `build-index.mjs` | 生成/更新插件市场索引（用法见 `PUBLISH.md`） | Node，无第三方依赖 |

## set-background.py

```powershell
python -m pip install pillow                 # 只需装一次
python tools/set-background.py 图.png 0.95   # 第二个参数是亮度，省略默认 0.95
```

- 图片压到宽 ≤1536、亮度可调、WebP q74，替换 `#dsh-eva-backdrop-layer` 里那条底图。
- 补丁版本号 +1，并同步 `package.json` 的 `version`。
- 输出目录：`$DSH_HOME/backups/pkgs`（`DSH_HOME` 未设置时回退 `~/.dsh`），可用 `--dest` 覆盖。
- 打包优先 `pnpm pack`，PATH 里没有 pnpm 就用 `npm pack`；两者都支持 `--pack-destination`。
- 常用参数：
  - `--client <path>`：改指定的 `client.js`（测试副本用）
  - `--skip-pack` / `--pack-only`：只换图不打包 / 只打包不换图
  - `--webp <path>`：顺带把编码出的 webp 存一份，便于肉眼确认
- macOS 上把 `python` 换成 `python3`。

## strip-background.mjs

```bash
node tools/strip-background.mjs                 # 处理仓库里的 lib/client.js
node tools/strip-background.mjs <client.js>     # 处理指定文件（测试副本用）
```

把唯一那条 `background-image: url("data:image/webp;base64,…");` 换成三段 CSS 渐变底，
跑完自动 `node --check`。重复跑是幂等的（第二次提示没找到底图）。想去图再换回图片时，
直接再跑一次 `set-background.py` 即可。

## audit-selectors.mjs

```powershell
node tools/audit-selectors.mjs --asar "D:/Program Files/DSH/DSH NEXT/resources/app.asar"
node tools/audit-selectors.mjs --dir <已解包的 resources 目录>
node tools/audit-selectors.mjs --classes <每行一个类名的文本文件>
```

退出码 `1` 表示有 `[class*=…]` 选择器在当前构建里 0 命中（已失效），可塞进 CI / pre-commit。

## 版本号约定

`lib/client.js` 顶部的 `VERSION` 与 `package.json` 的 `version` 必须一致：右下角角标显示前者，
安装/市场流程读后者。`set-background.py` 会自动同步两处；手动改版本时记得两边一起改。
