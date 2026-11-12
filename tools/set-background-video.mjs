#!/usr/bin/env node
/**
 * 把一段视频变成「新会话动态底」素材，内嵌进 lib/client.js。
 *
 * 两种用法：
 *   1) 有 ffmpeg（任意平台）：直接从原始视频压出 1600x900、无音轨、faststart 的 H.264，
 *      再抓第 0 帧做 WebP 封面：
 *        node tools/set-background-video.mjs 素材.mp4
 *        node tools/set-background-video.mjs 素材.mp4 --width 1280 --bitrate 1200000
 *   2) 没有 ffmpeg：自己先压好（H.264、无音轨、≤2MB 最舒服），再给出封面图：
 *        node tools/set-background-video.mjs --video 已压好.mp4 --poster 封面.webp
 *
 * 默认参数按「5 秒左右的开场短片」调过（皮肤里只播一次、不循环）：1600px 宽、1.6Mbps，成品约 1.1MB，
 * base64 后约 1.5MB。体积敏感就降到 --width 1280 --bitrate 1000000（约 0.7MB）。
 */
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const clientPath = path.join(root, 'lib', 'client.js')
const pkgPath = path.join(root, 'package.json')

const argv = process.argv.slice(2)
const flag = (name, fallback = null) => {
  const i = argv.indexOf(`--${name}`)
  return i === -1 ? fallback : argv[i + 1]
}
const has = (name) => argv.includes(`--${name}`)

const source = argv[0] && !argv[0].startsWith('--') ? argv[0] : null
const preEncoded = flag('video')
const posterArg = flag('poster')
const width = Number(flag('width', '1600'))
const bitrate = Number(flag('bitrate', '1600000'))
const crf = flag('crf', null)

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'eva-video-'))
const encoded = preEncoded ? path.resolve(preEncoded) : path.join(tmp, 'backdrop.mp4')
const poster = posterArg ? path.resolve(posterArg) : path.join(tmp, 'poster.webp')

function ffmpegAvailable() {
  const probe = spawnSync('ffmpeg', ['-version'], { stdio: 'ignore' })
  return probe.status === 0
}

function run(args) {
  const res = spawnSync(args[0], args.slice(1), { stdio: 'inherit' })
  if (res.status !== 0) {
    console.error(`\n命令失败: ${args.join(' ')}`)
    process.exit(1)
  }
}

if (!fs.existsSync(clientPath)) {
  console.error(`错误: 找不到 ${clientPath}`)
  process.exit(1)
}

// 1) 编码（有 ffmpeg 且没给 --video 时）
if (!preEncoded) {
  if (!source || !fs.existsSync(source)) {
    console.error('用法: node tools/set-background-video.mjs <视频> [--width 1600] [--bitrate 1600000]')
    console.error('   或: node tools/set-background-video.mjs --video <已压好.mp4> --poster <封面.webp>')
    process.exit(1)
  }
  if (!ffmpegAvailable()) {
    console.error('没找到 ffmpeg。请先装（brew install ffmpeg / winget install ffmpeg），')
    console.error('或者自己压好后用: --video <已压好.mp4> --poster <封面.webp>')
    process.exit(1)
  }
  const quality = crf === null
    ? ['-b:v', String(bitrate), '-maxrate', String(Math.round(bitrate * 1.4)), '-bufsize', String(bitrate * 2)]
    : ['-crf', String(crf)]
  console.log(`ffmpeg 编码 ${width}x${Math.round((width * 9) / 16)}（无音轨 / faststart）...`)
  run([
    'ffmpeg', '-y', '-i', source,
    '-an',
    '-vf', `scale=${width}:-2:flags=lanczos`,
    '-c:v', 'libx264', '-profile:v', 'high', '-pix_fmt', 'yuv420p',
    '-preset', 'slow', '-g', '24', ...quality,
    '-movflags', '+faststart',
    encoded,
  ])
}

if (!fs.existsSync(encoded)) {
  console.error(`错误: 找不到编码结果 ${encoded}`)
  process.exit(1)
}

// 2) 封面（没给 --poster 且是 ffmpeg 编码出来的，就抓第 0 帧）
if (!fs.existsSync(poster)) {
  if (!ffmpegAvailable()) {
    console.error('错误: 需要封面图。请用 --poster 指定一张 16:9 的 WebP/PNG。')
    process.exit(1)
  }
  console.log('抓第 0 帧做封面...')
  run(['ffmpeg', '-y', '-i', encoded, '-frames:v', '1', '-vf', 'scale=1280:-2:flags=lanczos',
    '-c:v', 'libwebp', '-quality', '60', poster])
}

const videoBytes = fs.statSync(encoded).size
const posterBytes = fs.statSync(poster).size
if (videoBytes > 3 * 1024 * 1024) {
  console.warn(`⚠ 视频 ${(videoBytes / 1048576).toFixed(2)}MB 偏大：每次打开界面都要下发这份 base64。`)
  console.warn('  建议降到 --width 1280 --bitrate 1000000 再跑一次。')
}

// 3) 替换 client.js 里那两个常量
const videoB64 = fs.readFileSync(encoded).toString('base64')
const posterBytesBuf = fs.readFileSync(poster)
const posterMime = /\.(png)$/i.test(poster) ? 'image/png' : /\.(jpe?g)$/i.test(poster) ? 'image/jpeg' : 'image/webp'
const posterUri = `data:${posterMime};base64,${posterBytesBuf.toString('base64')}`

let text = fs.readFileSync(clientPath, 'utf8')
const nl = text.includes('\r\n') ? '\r\n' : '\n'

const videoSlot = /const VIDEO_MP4_BASE64 = '[^']*'/
const posterSlot = /const VIDEO_POSTER_DATA_URI = '[^']*'/
if (!videoSlot.test(text) || !posterSlot.test(text)) {
  console.error('错误: client.js 里没找到 VIDEO_MP4_BASE64 / VIDEO_POSTER_DATA_URI 常量')
  process.exit(1)
}
text = text.replace(videoSlot, `const VIDEO_MP4_BASE64 = '${videoB64}'`)
text = text.replace(posterSlot, `const VIDEO_POSTER_DATA_URI = '${posterUri}'`)

// 4) 版本号 +1（末位）
const versionMatch = /VERSION = '([0-9]+)\.([0-9]+)\.([0-9]+)'/.exec(text)
if (versionMatch === null) {
  console.error('错误: client.js 里没找到 VERSION')
  process.exit(1)
}
const version = `${versionMatch[1]}.${versionMatch[2]}.${Number(versionMatch[3]) + 1}`
text = text.replace(versionMatch[0], `VERSION = '${version}'`)
text = text.split(nl).join(nl) // 保持原换行风格
fs.writeFileSync(clientPath, text, 'utf8')

// 5) package.json 版本 + 语法检查
const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'))
pkg.version = version
fs.writeFileSync(pkgPath, `${JSON.stringify(pkg, null, 2)}${nl}`, 'utf8')

const check = spawnSync(process.execPath, ['--check', clientPath], { stdio: 'inherit' })
if (check.status !== 0) process.exit(check.status ?? 1)

console.log('')
console.log(`视频   ${(videoBytes / 1024).toFixed(0)} KB → base64 ${(videoB64.length / 1024 / 1024).toFixed(2)} MB`)
console.log(`封面   ${(posterBytes / 1024).toFixed(0)} KB`)
console.log(`版本   1.0.${versionMatch[3]} → ${version}`)
console.log(`包体   ${(fs.statSync(clientPath).size / 1024 / 1024).toFixed(2)} MB（node --check 通过）`)
console.log('')
console.log('接着装：')
console.log(`  pnpm pack --pack-destination ~/.dsh/backups/pkgs   # 或 npm pack`)
console.log(`  plugin_manager install_bundle target=file:~/.dsh/backups/pkgs/winstonlu-dsh-eva-skin-${version}.tgz`)
