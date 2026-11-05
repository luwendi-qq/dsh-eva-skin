#!/usr/bin/env node
// 生成 market/index.json（市场索引 format 1）。跑完按提示发布即可。
import fs from 'node:fs'
import path from 'node:path'
import { execFileSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const pkg = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'))

// --emit git : 从 git 仓库装（不需要 npm 账号）；默认 --emit npm
const argv = process.argv.slice(2)
const emit = argv.includes('--emit') ? argv[argv.indexOf('--emit') + 1] : 'npm'
const gitUrlArg = argv.includes('--git-url') ? argv[argv.indexOf('--git-url') + 1] : null

function gitSource() {
  const run = (args) => execFileSync('git', args, { cwd: root, encoding: 'utf8' }).trim()
  let url = gitUrlArg || run(['remote', 'get-url', 'origin'])
  url = url.replace(/\.git$/, '')
  if (url.startsWith('git@')) url = 'https://' + url.slice(4).replace(':', '/')
  const commit = run(['rev-parse', 'HEAD'])
  const source = { type: 'git', url, commit }
  if (argv.includes('--path')) source.path = argv[argv.indexOf('--path') + 1]
  return source
}

const source = emit === 'git' ? gitSource() : { type: 'npm' }
const icon = fs.readFileSync(path.join(root, 'icon.svg')).toString('base64')
const ts = Math.floor(Date.now() / 1000)

const index = {
  format: 1,
  title: { en: 'DSH plugin market (lwd)', zh: '卢问底的 DSH 插件市场' },
  description: {
    en: 'Personal index of DeepSeek Harness bundles.',
    zh: '个人维护的 DeepSeek Harness 组合包索引。'
  },
  metadata: {
    categories: {
      theme: { title: { en: 'Themes & skins', zh: '主题与皮肤' } },
      ui: { title: { en: 'Interface', zh: '界面增强' } },
      workflow: { title: { en: 'Workflow', zh: '工作流' } }
    },
    labels: {
      web: { title: { en: 'Web UI', zh: 'Web 界面' } },
      'no-server': { title: { en: 'Client only', zh: '纯客户端' } }
    },
    sortKeys: {
      updated: { title: { en: 'Last updated', zh: '最近更新' }, order: 'desc' }
    }
  },
  plugins: [
    {
      name: pkg.name,
      title: { en: 'EVA Cel-Shade Skin', zh: 'EVA 赛璐璐皮肤' },
      description: {
        en: 'Cel-shaded EVA skin for the Harness Web UI: ink outlines, hard shadows, CRT scanlines, session status rails and a recolored turn navigator. Pure CSS token overrides, no component rewrites.',
        zh: '把 Web 界面换成 EVA 赛璐璐配色：墨线描边、无模糊硬投影、CRT 扫描线、会话状态轨，以及重配色的右侧跳转条。只覆盖官方设计令牌，不改组件结构。'
      },
      icon: `data:image/svg+xml;base64,${icon}`,
      author: '卢问底',
      homepage: 'https://github.com/luwendi-qq/dsh-eva-skin',
      repository: { url: 'https://github.com/luwendi-qq/dsh-eva-skin' },
      metadata: {
        category: 'theme',
        keywords: ['eva', 'cel-shade', 'dark', 'scanlines', 'skin', 'theme', 'rail', 'session-status'],
        labels: ['web', 'no-server'],
        sortKeys: { updated: ts }
      },
      versions: [
        {
          version: pkg.version,
          publishTimestamp: ts,
          source,
          engines: { dsh: pkg.engines.dsh }
        }
      ]
    }
  ]
}

const out = path.join(root, 'market', 'index.json')
fs.mkdirSync(path.dirname(out), { recursive: true })
fs.writeFileSync(out, JSON.stringify(index, null, 2) + '\n')
console.log(`wrote ${out} (${pkg.name}@${pkg.version}, source ${source.type}${source.commit ? ' ' + source.commit.slice(0, 7) : ''})`)
