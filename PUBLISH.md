# 发布到插件市场（无 npm 账号版）

市场索引支持两种来源：npm 包，或者 **git 仓库（commit 锁定）**。没有 npm 账号就走 git，一样能挂到市场——装的时候 pnpm 直接从 GitHub 拉取指定 commit。

下面这条路只需要 GitHub 账号。

## 1. 推仓库

仓库根目录就是插件根目录（`package.json` 所在层），这样索引里不用写 `path`。

```bash
cd dsh-eva-skin
git init -b main            # 已初始化可跳过
git add -A
git commit -m "feat: EVA cel-shade skin 1.0.0"
git tag v1.0.0

gh repo create luwendi-qq/dsh-eva-skin --public --source . --remote origin --push
git push origin v1.0.0
```

没有 `gh` 就在网页上新建空仓库，再：

```bash
git remote add origin https://github.com/luwendi-qq/dsh-eva-skin.git
git push -u origin main --tags
```

## 2. 生成索引（git 来源）

```bash
node tools/build-index.mjs --emit git
```

它会读 `git remote get-url origin` 和 `git rev-parse HEAD`，写出：

```json
"source": { "type": "git", "url": "https://github.com/luwendi-qq/dsh-eva-skin", "commit": "<40 位 sha>" }
```

提交并推上去：

```bash
git add market/index.json && git commit -m "chore: market index 1.0.0" && git push
```

索引地址就是仓库里的原始文件：

```
https://raw.githubusercontent.com/luwendi-qq/dsh-eva-skin/main/market/index.json
```

> raw 有 CDN 缓存（约 5 分钟）。更新索引后市场页还是旧的话，等一会儿或换个带 `?v=时间戳` 的地址。

## 3. 在 DSH 里挂索引

插件页 → 发现 → 索引源 → 粘贴上面那个 raw 地址 → 保存。

之后市场里出现 **EVA 赛璐璐皮肤**，点安装即可。它等价于：

```bash
plugin_manager install_bundle git+https://github.com/luwendi-qq/dsh-eva-skin#<commit>
```

市场会把 commit 锁进 spec，保证装到的就是索引里登记的那一版。

## 4. 发新版本

1. 改 `lib/client.js` 顶部 `VERSION` 和 `package.json` 的 `version`（两处必须一致，右下角角标显示 `VERSION`）
2. `node --check lib/client.js`
3. `git commit -am "feat: 1.0.1 ..." && git tag v1.0.1 && git push --tags`
4. `node tools/build-index.mjs --emit git` → 提交并推送 `market/index.json`
5. 市场页刷新一下，用户会看到新版本可升级

## 5. 以后想上 npm（可选）

有 npm 账号后切回去即可：

```bash
npm publish --access public
node tools/build-index.mjs --emit npm
```

`source.type` 决定从哪里装，两种来源可以在同一个索引里并存。

## 包里的底图

`lib/client.js` 内嵌一张 AI 生成的明日香/二号机插画（约 110KB base64），随包发布，包体 100KB。想换成纯 CSS 底或换图：

```bash
./tools/strip-background.sh            # 去图，包体回到 ~25KB
./tools/set-background.sh 图.png 0.95  # 换图并重新打包
```

## 检查清单

- [ ] `lib/client.js` 的 `VERSION` 与 `package.json` 的 `version` 一致
- [ ] `node --check lib/client.js` 通过
- [ ] `git status` 干净，tag 已推送
- [ ] `market/index.json` 里 `source.commit` 等于 `git rev-parse HEAD`
- [ ] raw 地址能在浏览器直接打开，`format: 1`
- [ ] 市场装一遍，刷新页面看到角标 `EVA SKIN 1.0.0`
- [ ] 装完 `curl /plugins/events` 里条目 id 是 `@winstonlu/dsh-eva-skin`

## 6. 出现在"别人的发现页"里（两条路）

**路线 A：分享索引地址（现在就能用）**

别人在 插件 → 发现 → 索引源 里粘贴上面那个 raw 地址，就能搜到并一键安装。一次即可，地址随仓库更新。

**路线 B：进入公共目录 awesome-dsh-plugin**

[dshmarket](https://github.com/dsh-market/dsh-market) 只允许安装 [awesome-dsh-plugin](https://github.com/awesome-dsh-plugin/awesome-dsh-plugin) 精选列表里的来源；那份列表同时是 `https://cdn.jsdelivr.net/npm/dsh-plugin-catalog/index.json` 这份索引的数据源。收录方式：给该仓库提一个 PR，只加一个文件 `data/plugins/luwendi-qq__dsh-eva-skin.yml`（本仓库已备好：`market/awesome-entry.yml`）。

```yaml
url: https://github.com/luwendi-qq/dsh-eva-skin
name: luwendi-qq/dsh-eva-skin
category: theme
description:
  en: 'EVA cel-shade skin for the Web UI: ink outlines, hard shadows, CRT scanlines, session status rails and a recolored turn navigator.'
  zh: '把 Web 界面换成 EVA 赛璐璐配色：墨线描边、硬投影、CRT 扫描线、会话状态轨，以及重配色的右侧跳转条。'
```

硬性条件（CI 会查）：

- 仓库创建满 **1 天** 以上——刚建的仓库提 PR 会被自动打回，隔天再提
- `package.json` 必须声明 `dsh.bundle`（本仓库已有 `dsh.bundle.patch`；只写 `dsh.client` 是常见退回原因）
- 仓库加 topic `dsh-plugin`
- 描述只写功能、不夸大，会被拿去和代码核对

进了列表之后：列表站与 dshmarket 里能搜到；但 jsDelivr 那份 format-1 索引只收录 **npm 上有版本** 的插件，GitHub-only 的条目只显示安装命令、不进索引搜索。要在别人的发现页里被搜到而不必加索引源，得走第 5 步发 npm。
