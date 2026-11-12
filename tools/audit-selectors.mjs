#!/usr/bin/env node
/**
 * 选择器体检：把皮肤里所有 [class*="…"] 拿到「当前这版 DSH」的 class 池里跑一遍，
 * 报告哪些选择器已经失效（0 命中）。
 *
 * CSS module 的哈希前缀是**按构建**生成的（kb3qhq_ / csseja_ / mAYO5W_ …），
 * 换一台机器、换一版 DSH 就变。所以皮肤里凡是写死 `<hash>_<localName>` 的选择器
 * 都会在别的构建上静默失效 —— 这个工具就是用来发现这件事的。
 *
 * 用法（三选一）：
 *   node tools/audit-selectors.mjs --asar "D:/Program Files/DSH/DSH NEXT/resources/app.asar"
 *   node tools/audit-selectors.mjs --dir  <已解包的 resources 目录>
 *   node tools/audit-selectors.mjs --classes <文本文件，每行一个类名>
 *
 * 退出码：有失效选择器时为 1（可塞进 CI / pre-commit）。
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const argv = process.argv.slice(2)
const argOf = (name) => {
  const i = argv.indexOf(name)
  return i === -1 ? null : argv[i + 1]
}

const MAX_ENTRY = 25 * 1024 * 1024
// 宁可多收：CSS module 的类名可能是 `csseja_brandName`、`_bubble_44yfq_1`、
// `-U5R9G_markBusy` —— 只要求「带下划线、且不是纯数字/纯符号」。
const CLASS_IN_QUOTES = /["'`]([A-Za-z0-9_-]{1,80}_[A-Za-z0-9_-]{1,80})["'`]/g
const CLASS_IN_CSS = /\.(-?[A-Za-z0-9_-]{1,80}_[A-Za-z0-9_-]{1,80})(?![\w-])/g

function collectFromText(text, into) {
  for (const re of [CLASS_IN_QUOTES, CLASS_IN_CSS]) {
    re.lastIndex = 0
    let m
    while ((m = re.exec(text)) !== null) into.add(m[1])
  }
}

/** 从 asar 归档里收集类名。 */
function collectFromAsar(file, into) {
  const fd = fs.openSync(file, 'r')
  try {
    const head = Buffer.alloc(16)
    fs.readSync(fd, head, 0, 16, 0)
    const jsonLen = head.readUInt32LE(12)
    const headerBuf = Buffer.alloc(jsonLen)
    fs.readSync(fd, headerBuf, 0, jsonLen, 16)
    const header = JSON.parse(headerBuf.toString('utf8'))
    const dataStart = 16 + jsonLen

    let scanned = 0
    const walk = (node) => {
      for (const [name, child] of Object.entries(node.files ?? {})) {
        if (child.files) {
          walk(child)
          continue
        }
        const size = Number(child.size ?? 0)
        const offset = Number(child.offset ?? 0)
        if (size === 0 || size > MAX_ENTRY) continue
        if (!/\.(?:js|mjs|cjs|css)$/i.test(name)) continue
        const buf = Buffer.alloc(size)
        fs.readSync(fd, buf, 0, size, dataStart + offset)
        const text = buf.toString('utf8')
        if (!text.includes('_')) continue
        collectFromText(text, into)
        scanned++
      }
    }
    walk(header)
    console.error(`[audit] asar: scanned ${scanned} script/style entries`)
  } finally {
    fs.closeSync(fd)
  }
}

/** 从解包目录里收集类名。 */
function collectFromDir(dir, into) {
  let scanned = 0
  const visit = (d) => {
    for (const ent of fs.readdirSync(d, { withFileTypes: true })) {
      const p = path.join(d, ent.name)
      if (ent.isDirectory()) {
        if (ent.name === 'node_modules' || ent.name.startsWith('.')) continue
        visit(p)
        continue
      }
      if (!/\.(?:js|mjs|cjs|css)$/i.test(ent.name)) continue
      const st = fs.statSync(p)
      if (st.size === 0 || st.size > MAX_ENTRY) continue
      collectFromText(fs.readFileSync(p, 'utf8'), into)
      scanned++
    }
  }
  visit(dir)
  console.error(`[audit] dir: scanned ${scanned} script/style files`)
}

const classes = new Set()
const asar = argOf('--asar')
const dir = argOf('--dir')
const classFile = argOf('--classes')

if (asar) collectFromAsar(path.resolve(asar), classes)
else if (dir) collectFromDir(path.resolve(dir), classes)
else if (classFile) {
  for (const line of fs.readFileSync(path.resolve(classFile), 'utf8').split(/\r?\n/)) {
    const t = line.trim()
    if (t) classes.add(t)
  }
} else {
  console.error('用法: node tools/audit-selectors.mjs --asar <app.asar> | --dir <目录> | --classes <文件>')
  process.exit(2)
}

console.error(`[audit] class pool: ${classes.size} names`)

const clientPath = path.join(root, 'lib', 'client.js')
const client = fs.readFileSync(clientPath, 'utf8')
// 五种操作符都要查：`*=` 子串、`~=` 精确词、`^=` 前缀、`$=` 后缀、`|=` 连字符前缀。
// 只查 `*=` 会漏掉 `[class~="hash_newSession"]` 这类写死哈希的精确匹配（真踩过）。
const selectors = [...client.matchAll(/\[class([*^$|~]?)=["']([^"']+)["']([iIsS]*)\]/g)]
  .map((m) => ({ op: m[1] || '=', token: m[2], flags: m[3] || '' }))

if (selectors.length === 0) {
  console.error('[audit] 没在 lib/client.js 里找到 [class*=…] 选择器')
  process.exit(2)
}

const seen = new Map()
for (const sel of selectors) {
  const key = `${sel.op}|${sel.token}|${sel.flags}`
  seen.set(key, (seen.get(key) ?? 0) + 1)
}

const rows = []
const matches = (op, hay, needle) => {
  switch (op) {
    case '*':
      return hay.includes(needle)
    case '~':
      // class 属性是空格分隔的词表；池里每个类名就是一个词，所以等价于相等
      return hay === needle
    case '^':
      return hay.startsWith(needle)
    case '$':
      return hay.endsWith(needle)
    case '|':
      return hay === needle || hay.startsWith(`${needle}-`)
    default:
      return hay === needle
  }
}

for (const [key, uses] of seen) {
  const [op, token, flags] = key.split('|')
  const insensitive = flags.toLowerCase().includes('i')
  const needle = insensitive ? token.toLowerCase() : token
  let hits = 0
  for (const c of classes) {
    const hay = insensitive ? c.toLowerCase() : c
    if (matches(op, hay, needle)) hits++
  }
  rows.push({ op, token, hits, uses })
}

rows.sort((a, b) => a.hits - b.hits || a.token.localeCompare(b.token))

const dead = rows.filter((r) => r.hits === 0)
const fine = rows.filter((r) => r.hits > 0)

const pad = (s, n) => String(s).padEnd(n)
console.log(`\n失效（0 命中）：${dead.length} 条 / 共 ${rows.length} 条\n`)
if (dead.length > 0) {
  console.log(pad('命中', 6) + pad('规则数', 8) + '选择器 token')
  for (const r of dead) console.log(pad(r.hits, 6) + pad(r.uses, 8) + `[class${r.op}="${r.token}"]`)
}
console.log(`\n正常命中：${fine.length} 条`)
for (const r of fine) {
  console.log(pad(r.hits, 6) + pad(r.uses, 8) + `[class${r.op}="${r.token}"]`)
}

process.exit(dead.length > 0 ? 1 : 0)
