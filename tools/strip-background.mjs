#!/usr/bin/env node
/**
 * 去掉内嵌的底图（发布到公共 npm 前跑一次），把 data URI 换成纯 CSS 渐变底。
 * 纯 Node，无第三方依赖；Windows / macOS 通用。
 *
 * 用法:
 *   node tools/strip-background.mjs                 # 处理仓库里的 lib/client.js
 *   node tools/strip-background.mjs <client.js>     # 处理指定文件（测试副本用）
 */
import fs from 'node:fs'
import path from 'node:path'
import { spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const arg = process.argv[2]
const clientPath = arg ? path.resolve(arg) : path.join(root, 'lib', 'client.js')

if (!fs.existsSync(clientPath)) {
  console.error(`错误: 找不到 ${clientPath}`)
  process.exit(1)
}

const text = fs.readFileSync(clientPath, 'utf8')
// 保持原文件的换行风格（Windows 上 clone 出来通常是 CRLF）
const nl = text.includes('\r\n') ? '\r\n' : '\n'
const gradient = [
  'background-image: radial-gradient(120% 90% at 78% 12%, rgba(123, 75, 216, 0.55) 0%, transparent 60%),',
  '    radial-gradient(90% 80% at 12% 88%, rgba(46, 107, 230, 0.35) 0%, transparent 62%),',
  '    linear-gradient(160deg, #0A0A16 0%, #08080F 55%, #0A0710 100%);',
].join(nl)

const re = /background-image: url\("data:image\/webp;base64,[A-Za-z0-9+/=]+"\);/g
let stripped = 0
let next = text.replace(re, () => {
  stripped++
  return gradient
})

// 动态底的视频与封面也是内嵌的大块 base64，一并清空；
// client.js 里判空后会自动跳过整套视频逻辑，退回静态底。
for (const slot of ['VIDEO_MP4_BASE64', 'VIDEO_POSTER_DATA_URI']) {
  const empty = new RegExp(`const ${slot} = '[^']*'`)
  if (empty.test(next)) {
    next = next.replace(empty, `const ${slot} = ''`)
    stripped++
  }
}

if (stripped === 0) {
  console.log('没找到内嵌底图/视频，跳过（已经是纯 CSS 底了）')
} else {
  fs.writeFileSync(clientPath, next, 'utf8')
  console.log(`已清空 ${stripped} 块内嵌素材（底图 + 动态底视频），包体现在是纯 CSS 底`)
}

// 语法检查用当前这个 node 进程自己，避免 PATH 里找不到 node
const check = spawnSync(process.execPath, ['--check', clientPath], { stdio: 'inherit' })
if (check.status !== 0) process.exit(check.status ?? 1)
console.log(`node --check 通过；size: ${fs.statSync(clientPath).size} bytes`)
