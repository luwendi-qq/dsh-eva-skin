/**
 * dsh-eva-skin —— 浏览器半边（DSH Web GUI 的 EVA 赛璐璐皮肤）。
 *
 * 这份文件是宿主直接送给浏览器的「束」，不是普通 ESM：必须包在
 * window.__ModuleLoader__.load({ id, factory }) 信封里，并导出具名的
 * name / inject / apply。本插件不渲染任何 React 组件，也不 require 任何种子模块，
 * 所以 inject 是空数组 —— 它只往 <head> 里放一张样式表，再加两个开关属性。
 *
 * 为什么只改 CSS：
 *   DSH 的视觉全部由官方 dsh-client-ui-theme 的 --dsw-* 设计令牌驱动（403 个）。
 *   覆盖令牌是最低耦合的做法：官方换组件、改类名、加页面都不影响，最多某个细节
 *   回到官方默认色，永远不会把界面改坏。所以这里绝不碰 CSS-in-JS 的哈希类名
 *   （形如 PIRFFq_bottomRow 之外的随机后缀），只用：
 *     1. 令牌覆盖（--dsw-alias-* / --dsw-font-family）
 *     2. 官方语义锚点（[data-shell-leading] / [role="dialog"] 等图中稳定存在的属性）
 *   锚点失效时的降级行为是「这条规则不生效」，不是「界面错乱」。
 *
 * 赛璐璐三要素（与 openlist-theme 同一套语言）：
 *   墨线   2px 纯黑描边 + 全方角
 *   硬影   无模糊、纯色、偏移的投影（紫 / 红两支）
 *   网点   全屏 3px 扫描线 + 高光描边
 */

window.__ModuleLoader__.load({
  id: '@winstonlu/dsh-eva-skin',
  factory: () => {
    const module = { exports: {} }
    const exports = module.exports
    Object.defineProperty(exports, Symbol.toStringTag, { value: 'Module' })

    const name = 'dsh-eva-skin'
    /**
     * 属性与样式只写 DOM；为了读“这个会话在跑还是跑完了”，
     * 读三个官方客户端服务的快照（只读，不注册、不修改）。
     * 这三个服务在 Web 客户端常驻；official 插件也这么 inject。
     */
    const inject = ['uiSession', 'sessions', 'workspaces']

    /** 样式表 id（防重复注入 / 便于卸载与 HMR 认领）。 */
    const STYLE_ID = 'dsh-eva-skin-style'
    /** 挂在 <html> 上的开关属性，所有装饰规则都以它为前缀。 */
    const ATTR = 'data-dsh-eva-skin'
    const SCAN_ATTR = 'data-dsh-eva-scanlines'
    const SHADOW_ATTR = 'data-dsh-eva-shadow'
    /** 压暗底纹开关属性。 */
    const BACKDROP_ATTR = 'data-dsh-eva-backdrop'
    const LAYER_ID = 'dsh-eva-backdrop-layer'
    const BADGE_ID = 'dsh-eva-badge'
    const VERSION = '1.0.0'
    /** 调试入口，卸载时删除。 */
    const GLOBAL_KEY = '__DSH_EVA_SKIN__'

    /** 与 cordis.patch.yml 里的 config 默认值保持一致。 */
    const DEFAULT_CONFIG = {
      scanlines: true,
      hardShadow: true,
      backdrop: true,
    }

    /**
     * 皮肤本体。
     *
     * 配色分工（沿用 EVA 三台机体 + 使徒警示黄）：
     *   初号机紫 #7B4BD8 —— 面板投影、悬停、次级强调
     *   零号机蓝 #2E6BE6 / #5FA8FF —— 链接、信息态、剧集/次级标识
     *   二号机红 #E8322D —— 主色：主按钮、当前项、焦点强调
     *   荧光绿 #B4FF39 —— 成功态、代码标签、聚焦轮廓
     *   警示黄 #FFD400 —— 危险条纹、警告态
     *   纸白  #F2F0E9 —— 暗底上的正文（比纯白柔）
     *   墨黑  #04040A —— 描边与深底
     */
    const CSS = `
/* ==========================================================================
   0. 调色板（只做变量，不直接上色）
   ========================================================================== */
html[data-dsh-eva-skin] {
  --ev-ink: #04040A;
  --ev-bg: #07070E;
  --ev-panel: #101020;
  --ev-panel-2: #15152A;
  --ev-panel-3: #1E1E38;
  --ev-paper: #F2F0E9;
  --ev-purple: #7B4BD8;
  --ev-blue: #2E6BE6;
  --ev-blue-l: #5FA8FF;
  --ev-red: #E8322D;
  --ev-red-l: #FF4B45;
  --ev-orange: #FF7A1A;
  --ev-green: #B4FF39;
  --ev-yellow: #FFD400;
  --ev-dim: #A9A9C4;
  --ev-dim-2: #7B7B9C;
}

/* ==========================================================================
   1. 令牌覆盖 —— 暗色（默认主题）
   ========================================================================== */
html[data-dsh-eva-skin] body[data-ds-dark-theme] {
  --dsw-alias-bg-base: rgba(7, 7, 14, 0.38) !important;
  --dsw-alias-bg-layer-1: rgba(16, 16, 32, 0.62) !important;
  --dsw-alias-bg-layer-2: rgba(21, 21, 42, 0.68) !important;
  --dsw-alias-bg-layer-3: rgba(30, 30, 56, 0.76) !important;
  --dsw-alias-bg-overlay: rgba(4, 4, 10, 0.86) !important;
  --dsw-alias-bg-mask-1: rgba(123, 75, 216, 0.10) !important;
  --dsw-alias-bg-mask-2: rgba(123, 75, 216, 0.18) !important;
  --dsw-alias-bg-mask-3: rgba(123, 75, 216, 0.26) !important;
  --dsw-alias-bg-skeleton: rgba(123, 75, 216, 0.16) !important;
  --dsw-alias-bg-multi-select: rgba(232, 50, 45, 0.18) !important;

  --dsw-alias-label-primary: #F2F0E9 !important;
  --dsw-alias-label-primary-foreground: #F2F0E9 !important;
  --dsw-alias-label-primary-bluish: #DCE6FF !important;
  --dsw-alias-label-secondary: #C9C9DE !important;
  --dsw-alias-label-tertiary: #9A9AB8 !important;
  --dsw-alias-label-caption: #7B7B9C !important;
  --dsw-alias-label-dimmed: #66668A !important;
  --dsw-alias-label-primary-inverted: #04040A !important;

  --dsw-alias-border-l1: #04040A !important;
  --dsw-alias-border-l2: #2B2B4C !important;
  --dsw-alias-border-l3: #3A3A63 !important;
  --dsw-alias-border-l4: #4C4C7C !important;
  --dsw-alias-border-inverted: #F2F0E9 !important;

  --dsw-alias-brand-primary: #E8322D !important;
  --dsw-alias-brand-text: #FF6A5E !important;
  --dsw-alias-link: #5FA8FF !important;

  --dsw-alias-button-primary-fill: #E8322D !important;
  --dsw-alias-button-primary-hover: #FF4B45 !important;
  --dsw-alias-button-primary-dimmed: #8E2320 !important;
  --dsw-alias-button-info-fill: rgba(46, 107, 230, 0.24) !important;
  --dsw-alias-button-info-hover: rgba(46, 107, 230, 0.36) !important;
  --dsw-alias-button-elevated-fill: #1E1E38 !important;
  --dsw-alias-button-floating-fill: #15152A !important;
  --dsw-alias-button-floating-hover: #1E1E38 !important;
  --dsw-alias-button-tool-bar-fill: transparent !important;
  --dsw-alias-button-tool-bar-hover: rgba(123, 75, 216, 0.30) !important;
  --dsw-alias-button-ghost-active-fill: rgba(232, 50, 45, 0.16) !important;
  --dsw-alias-button-ghost-active-hover: rgba(232, 50, 45, 0.26) !important;
  --dsw-alias-button-ghost-active-border: rgba(232, 50, 45, 0.55) !important;
  --dsw-alias-button-contrast-fill: #F2F0E9 !important;

  --dsw-alias-interactive-bg-hover: rgba(123, 75, 216, 0.18) !important;
  --dsw-alias-interactive-bg-active: rgba(123, 75, 216, 0.30) !important;
  --dsw-alias-interactive-bg-hover-solid: #1E1E38 !important;
  --dsw-alias-interactive-bg-hover-accent: rgba(180, 255, 57, 0.16) !important;
  --dsw-alias-interactive-bg-hover-danger: rgba(232, 50, 45, 0.20) !important;

  --dsw-alias-markdown-code-block: #0D0D1C !important;
  --dsw-alias-markdown-code-block-banner: #15152A !important;
  --dsw-alias-markdown-inline-code: #1E1E38 !important;
  --dsw-alias-markdown-tag: #B4FF39 !important;
  --dsw-alias-markdown-placeholder: #7B7B9C !important;
  --dsw-alias-markdown-citation: #5FA8FF !important;

  --dsw-alias-menu-group-header-fill: #101020 !important;
  --dsw-alias-menu-icon: #9A9AB8 !important;
  --dsw-alias-toast-bg: #15152A !important;
  --dsw-alias-toast-label: #F2F0E9 !important;
  --dsw-alias-tooltip-bg: #15152A !important;
  --dsw-alias-tooltip-key-bg: #1E1E38 !important;

  --dsw-alias-specific-bubble: #15152A !important;
  --dsw-alias-specific-bubble-highlight: #1E1E38 !important;
  --dsw-alias-specific-sidebar-fill: rgba(11, 11, 24, 0.50) !important;
  --dsw-alias-specific-sidebar-nav-item-active: #1E1E38 !important;
  --dsw-alias-specific-sidebar-nav-item-hover: #15152A !important;
  --dsw-alias-specific-sidebar-nav-item-active-accent: #FFD400 !important;
  --dsw-alias-specific-input-major: #101020 !important;
  --dsw-alias-specific-menu: #15152A !important;
  --dsw-alias-specific-tip: #15152A !important;
  --dsw-alias-specific-selector: #1E1E38 !important;

  --dsw-alias-scrollbar-bg-l1: #101020 !important;
  --dsw-alias-scrollbar-hover-l1: #3A3A63 !important;
  --dsw-alias-scrollbar-bg-l2: #15152A !important;
  --dsw-alias-scrollbar-hover-l2: #4C4C7C !important;

  --dsw-alias-state-success-primary: #B4FF39 !important;
  --dsw-alias-state-success-secondary: rgba(180, 255, 57, 0.55) !important;
  --dsw-alias-state-success-tertiary: rgba(180, 255, 57, 0.24) !important;
  --dsw-alias-state-warn-primary: #FFD400 !important;
  --dsw-alias-state-warn-secondary: rgba(255, 212, 0, 0.55) !important;
  --dsw-alias-state-warn-tertiary: rgba(255, 212, 0, 0.24) !important;
  --dsw-alias-state-warn-label: #FFE566 !important;
  --dsw-alias-state-error-primary: #FF4B45 !important;
  --dsw-alias-state-error-secondary: rgba(255, 75, 69, 0.55) !important;
  --dsw-alias-state-business-primary: #5FA8FF !important;
  --dsw-alias-state-business-tertiary: rgba(95, 168, 255, 0.24) !important;
  --dsw-alias-state-idle-primary: #7B7B9C !important;

  --dsw-alias-code-diff-added: rgba(180, 255, 57, 0.16) !important;
  --dsw-alias-code-diff-deleted: rgba(255, 75, 69, 0.16) !important;
  --dsw-alias-file-diff-added-bg: rgba(180, 255, 57, 0.10) !important;
  --dsw-alias-file-diff-deleted-bg: rgba(255, 75, 69, 0.10) !important;
  --dsw-alias-file-diff-added-gutter: rgba(180, 255, 57, 0.22) !important;
  --dsw-alias-file-diff-deleted-gutter: rgba(255, 75, 69, 0.22) !important;
  --dsw-alias-file-diff-added-marker: #B4FF39 !important;
  --dsw-alias-file-diff-deleted-marker: #FF4B45 !important;

  --dsw-alias-onboarding-accent: #E8322D !important;
  --dsw-alias-onboarding-card-fill: #15152A !important;
  --dsw-alias-turn-trigger-bg: rgba(123, 75, 216, 0.18) !important;
  --dsw-alias-turn-trigger-bg-hover: rgba(123, 75, 216, 0.30) !important;
  --dsw-alias-switch-thumb: #F2F0E9 !important;
}

/* ==========================================================================
   1.5 底纹 —— 压暗的 EVA 控制室背景（纯 CSS，不依赖外部图片）
   --------------------------------------------------------------------------
   五层：两团紫色辉光、一团荧光绿、一团警示红、一层正交网格，
   最后压上一条很暗的底色渐变。画在根画布上，永远在最底层；
   各面板用半透明令牌（bg-base 0.82 / layer 0.86–0.90）透出一点质感。
   关掉：补丁层给 eva-skin 加 config: { backdrop: false }。
   ========================================================================== */
html[data-dsh-eva-skin][data-dsh-eva-backdrop] {
  background-color: #07070E !important;
  background-image:
    radial-gradient(115% 95% at 52% 48%, rgba(7, 7, 14, 0.74) 0%, rgba(7, 7, 14, 0.62) 42%, rgba(7, 7, 14, 0.30) 74%, rgba(7, 7, 14, 0.10) 100%),
    radial-gradient(1100px 640px at 78% -12%, rgba(123, 75, 216, 0.22), transparent 62%),
    radial-gradient(820px 560px at 6% 106%, rgba(180, 255, 57, 0.09), transparent 60%),
    radial-gradient(700px 480px at 96% 88%, rgba(232, 50, 45, 0.10), transparent 62%),
    linear-gradient(160deg, #0A0A16 0%, #08080F 58%, #0A0710 100%) !important;
  background-size: cover !important;
  background-position: center !important;
  background-repeat: no-repeat !important;
  background-attachment: fixed !important;
}

html[data-dsh-eva-skin][data-dsh-eva-backdrop] body,
html[data-dsh-eva-skin][data-dsh-eva-backdrop] body > div,
html[data-dsh-eva-skin][data-dsh-eva-backdrop] #root {
  background-color: transparent !important;
}


/* 版本徽标：证明客户端确实跑起来了，也方便我截图时认版本。 */
#dsh-eva-badge {
  position: fixed;
  right: 10px;
  bottom: 8px;
  z-index: 2147483000;
  pointer-events: none;
  font: 600 10px/1.4 var(--dsw-font-family-monospace, ui-monospace, monospace);
  letter-spacing: 0.08em;
  color: rgba(180, 255, 57, 0.55);
  text-transform: uppercase;
}
/* 底图另起一层：不跟外壳自带的 html 背景规则抢权。z-index:-1 让它贴在 html 画布上、所有内容之下。 */
#dsh-eva-backdrop-layer {
  position: fixed;
  inset: 0;
  z-index: -1;
  pointer-events: none;
  background-color: #2A1B4A;
  background-image: url("data:image/webp;base64,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");
  background-size: cover;
  background-position: center;
  background-repeat: no-repeat;
}

#dsh-eva-backdrop-layer::after {
  content: '';
  position: absolute;
  inset: 0;
  background: linear-gradient(rgba(7, 7, 14, 0.20), rgba(7, 7, 14, 0.38));
}

/* ==========================================================================
   2. 令牌覆盖 —— 亮色（纸张档：米白底 + 墨线，同样赛璐璐）
   ========================================================================== */
html[data-dsh-eva-skin] body:not([data-ds-dark-theme]) {
  --dsw-alias-bg-base: #F2F0E9 !important;
  --dsw-alias-bg-layer-1: #FFFFFF !important;
  --dsw-alias-bg-layer-2: #FFFFFF !important;
  --dsw-alias-bg-layer-3: #EDEAE0 !important;
  --dsw-alias-label-primary: #04040A !important;
  --dsw-alias-label-primary-foreground: #04040A !important;
  --dsw-alias-label-secondary: #3A3A46 !important;
  --dsw-alias-label-tertiary: #55555F !important;
  --dsw-alias-label-caption: #6B6B75 !important;
  --dsw-alias-label-primary-inverted: #F2F0E9 !important;
  --dsw-alias-border-l1: #04040A !important;
  --dsw-alias-border-l2: #C9C5B8 !important;
  --dsw-alias-border-l3: #B3AE9E !important;
  --dsw-alias-border-l4: #8F8A7A !important;
  --dsw-alias-specific-sidebar-fill: #EDEAE0 !important;
  --dsw-alias-specific-sidebar-nav-item-active: #DBD7C9 !important;
  --dsw-alias-specific-sidebar-nav-item-hover: #E4E0D4 !important;
  --dsw-alias-specific-sidebar-nav-item-active-accent: #E8322D !important;
  --dsw-alias-specific-bubble: #FFFFFF !important;
  --dsw-alias-brand-primary: #D02A25 !important;
  --dsw-alias-link: #1D4FD8 !important;
}

/* ==========================================================================
   3. 赛璐璐形状语言
   ========================================================================== */
html[data-dsh-eva-skin] ::selection {
  background: #E8322D;
  color: #FFFFFF;
}

/* 3.7 右侧轮次导航（TurnNavigator）：绿=可跳、黄=当前，条形改成方块刻度 */
html[data-dsh-eva-skin] [class*="4if9eW_mark"]::before {
  width: 18px;
  height: 3px;
  border-radius: 0;
  background: rgba(180, 255, 57, 0.42);
  transform: translateY(-50%) scaleX(1);
}
html[data-dsh-eva-skin] [class*="4if9eW_markUnloaded"]::before {
  background: rgba(180, 255, 57, 0.20);
  opacity: 1;
  transform: translateY(-50%) scaleX(0.55);
}
html[data-dsh-eva-skin] [class*="4if9eW_markPreview"]::before {
  background: #B4FF39;
  transform: translateY(-50%) scaleX(1);
  box-shadow: 0 0 6px rgba(180, 255, 57, 0.5);
}
html[data-dsh-eva-skin] [class*="4if9eW_markActive"]::before {
  background: #FFD400;
  transform: translateY(-50%) scaleX(1);
  box-shadow: 0 0 6px rgba(255, 212, 0, 0.6);
}
html[data-dsh-eva-skin] [class*="4if9eW_markBusy"]::before {
  background: #FF7A1A;
}

/* 3.8 悬停预览卡：交给组件自身，只靠 token 让背景不透明 */

html[data-dsh-eva-skin] [class*="_float_6nhg2"] {
  background: #0B0B18 !important;
  border: 1px solid rgba(123, 75, 216, 0.5) !important;
  border-radius: 2px !important;
  box-shadow: 4px 4px 0 #04040A !important;
  backdrop-filter: none !important;
}
html[data-dsh-eva-skin] [role="tooltip"] {
  background: #0B0B18 !important;
  border: 1px solid rgba(180, 255, 57, 0.4) !important;
  border-radius: 2px !important;
  opacity: 1 !important;
}

html[data-dsh-eva-skin] :focus-visible {
  outline: 2px solid #B4FF39;
  outline-offset: 2px;
}

/* 滚动条：墨线 + 硬边滑块 */
html[data-dsh-eva-skin] ::-webkit-scrollbar {
  width: 10px;
  height: 10px;
}
html[data-dsh-eva-skin] ::-webkit-scrollbar-track {
  background: transparent;
}
html[data-dsh-eva-skin] ::-webkit-scrollbar-thumb {
  background: #3A3A63;
  border: 2px solid #07070E;
  border-radius: 0;
}
html[data-dsh-eva-skin] ::-webkit-scrollbar-thumb:hover {
  background: #7B4BD8;
}
html[data-dsh-eva-skin] ::-webkit-scrollbar-corner {
  background: transparent;
}

/* 弹层：墨线 + 硬影 + 方角（[role=dialog] 是官方对话框/浮层的稳定语义锚点） */
html[data-dsh-eva-skin] [role="dialog"],
html[data-dsh-eva-skin] [role="alertdialog"] {
  border: 2px solid #04040A !important;
  border-radius: 2px !important;
}
html[data-dsh-eva-skin] [role="menu"],
html[data-dsh-eva-skin] [role="listbox"],
html[data-dsh-eva-skin] [role="tooltip"] {
  border-radius: 2px !important;
}
html[data-dsh-eva-skin] [role="dialog"] {
  box-shadow: 10px 10px 0 rgba(232, 50, 45, 0.32) !important;
}

/* ==========================================================================
   3.5 选中态标签页
   --------------------------------------------------------------------------
   官方 tab 组件把 --dsw-alias-markdown-tag 当“选中底色”用，文字却用 label-primary（白）。
   这个 token 本来是给行内代码标签的，被染成荧光绿后，选中态就变成“绿底 + 白字”。
   这里只改选中态的文字颜色（墨字），不动 token 本身，行内代码标签仍然是荧光绿。
   选择器用 CSS Modules 的下划线命名（_tabActive_<hash>_），不会误伤 detailTabActive 这类下划线式命名。
   ========================================================================== */
html[data-dsh-eva-skin] [class*="_tabActive_"] {
  color: #04040A !important;
  font-weight: 700 !important;
  text-shadow: none !important;
  box-shadow: 3px 3px 0 rgba(123, 75, 216, 0.45) !important;
}

/* ==========================================================================
   3.6 左栏会话行的状态轨（跑 / 完成未看 / 等人处理）
   --------------------------------------------------------------------------
   行本身不改背景，只在左缘画一条 3px 的状态轨：
     跑   → 荧光绿 + 呼吸
     完成 → 警示黄
     等人 → 警示红 + 慢闪
   状态由 apply() 从官方快照算出来，写在 data-eva-state 上。
   ========================================================================== */
html[data-dsh-eva-skin] [data-row-key^="session:"] {
  position: relative;
}

html[data-dsh-eva-skin] [data-row-key^="session:"][data-eva-state]::before {
  content: "";
  position: absolute;
  left: 0;
  top: 3px;
  bottom: 3px;
  width: 3px;
  border: 1px solid #04040A;
  pointer-events: none;
  z-index: 3;
}

html[data-dsh-eva-skin] [data-row-key^="session:"][data-eva-state="run"]::before {
  background: #B4FF39;
  animation: eva-row-run 1.6s ease-in-out infinite;
}

html[data-dsh-eva-skin] [data-row-key^="session:"][data-eva-state="done"]::before {
  background: #FFD400;
}

html[data-dsh-eva-skin] [data-row-key^="session:"][data-eva-state="ask"]::before {
  background: #E8322D;
  animation: eva-row-ask 1.1s steps(2, jump-none) infinite;
}

@keyframes eva-row-run {
  0%, 100% { opacity: 1; box-shadow: 0 0 6px rgba(180, 255, 57, 0.55); }
  50% { opacity: 0.4; box-shadow: none; }
}

@keyframes eva-row-ask {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.25; }
}

/* ==========================================================================
   4. 外壳
   ========================================================================== */
/* 左栏（侧边栏）：右侧墨线 + 紫色硬影 */
html[data-dsh-eva-skin] [data-shell-leading] {
  position: relative;
  border-right: 2px solid #04040A !important;
  box-shadow: 6px 0 0 rgba(123, 75, 216, 0.16) !important;
}

/* 侧栏顶部的黄黑警示条（EVA 使徒警报色） */
html[data-dsh-eva-skin] [data-shell-leading]::before {
  content: "";
  position: absolute;
  left: 0;
  right: 0;
  top: 0;
  height: 5px;
  pointer-events: none;
  z-index: 20;
  background: repeating-linear-gradient(
    45deg,
    #FFD400 0 7px,
    #04040A 7px 14px
  );
  opacity: 0.85;
}

/* ==========================================================================
   5. 扫描线（可关）：全屏 3px 网点，纯装饰，不吃点击
   ========================================================================== */
html[data-dsh-eva-scanlines] body::after {
  content: "";
  position: fixed;
  inset: 0;
  z-index: 2147483000;
  pointer-events: none;
  background: repeating-linear-gradient(
    180deg,
    rgba(0, 0, 0, 0.22) 0 1px,
    rgba(0, 0, 0, 0) 1px 3px
  );
  opacity: 0.35;
}

/* ==========================================================================
   6. 硬影（可关）：给"卡片类"浮层再补一层无模糊投影
   ========================================================================== */
html[data-dsh-eva-skin][data-dsh-eva-shadow] [role="menu"],
html[data-dsh-eva-skin][data-dsh-eva-shadow] [role="listbox"] {
  border: 2px solid #04040A !important;
  box-shadow: 8px 8px 0 rgba(123, 75, 216, 0.42) !important;
}
`

    /**
     * 左栏会话行的状态轨。
     * 只读官方快照：uiSession.sessionStatus / sessions.list / workspaces.list。
     * 返回拆卸函数；服务缺席时返回空函数。
     * 绝不能让 apply 抛错 —— apply 抛错会把条目永远留在 loading，
     * 启动审计会直接重启整个 app。
     */
    function installSessionStatus(ctx) {
      const read = (serviceName, member) => {
        try {
          const service = ctx[serviceName]
          return service === undefined || service === null ? undefined : service[member]
        } catch (error) {
          return undefined
        }
      }
      const statusSource = read('uiSession', 'sessionStatus')
      const sessionSource = read('sessions', 'list')
      const workspaceSource = read('workspaces', 'list')
      const usable = (source) =>
        source !== undefined && source !== null &&
        typeof source.getSnapshot === 'function' &&
        typeof source.subscribe === 'function'
      if (!usable(statusSource) || !usable(sessionSource) || !usable(workspaceSource)) return () => {}

      const ROW_SELECTOR = '[data-row-key^="session:"]'
      const ROW_PREFIX = 'session:'
      const STATE_ATTR = 'data-eva-state'

      /** 会话有没有仍在跑的子智能体（与官方 runningChildCount 同源）。 */
      const hasRunningChild = (id, list, statuses) => {
        const children = list?.projectionsBySession?.[id]?.values?.subagentCatalog
        if (!Array.isArray(children)) return false
        return children.some((child) => {
          const entry = statuses.get(child.id)
          const running = entry === undefined ? undefined : entry.running
          return (running ?? list?.byId?.[child.id]?.running) === true
        })
      }

      /** 一个会话当前该有的状态；null 表示不画。 */
      const stateOf = (id, statuses, list, archived) => {
        if (archived.has(id)) return null
        const entry = statuses.get(id)
        if (entry === undefined || entry === null) return null
        if (entry.pendingInteraction !== undefined) return 'ask'
        if (entry.running === true) return 'run'
        if (hasRunningChild(id, list, statuses)) return 'run'
        if (entry.completionUnread === true) return 'done'
        return null
      }

      /** 全量对账一次：读快照，逐行写/清 data 属性。 */
      const sync = () => {
        const rows = document.querySelectorAll(ROW_SELECTOR)
        if (rows.length === 0) return
        let statuses
        let list
        let workspace
        try {
          statuses = statusSource.getSnapshot() ?? new Map()
          list = sessionSource.getSnapshot() ?? {}
          workspace = workspaceSource.getSnapshot() ?? {}
        } catch (error) {
          return
        }
        const archived = new Set(workspace.archivedSessionIds ?? [])
        for (const row of rows) {
          const key = row.getAttribute('data-row-key')
          if (typeof key !== 'string' || !key.startsWith(ROW_PREFIX)) continue
          const id = key.slice(ROW_PREFIX.length)
          const next = stateOf(id, statuses, list, archived)
          if (next === null) {
            if (row.hasAttribute(STATE_ATTR)) row.removeAttribute(STATE_ATTR)
          } else if (row.getAttribute(STATE_ATTR) !== next) {
            row.setAttribute(STATE_ATTR, next)
          }
        }
      }

      let scheduled = false
      /** 同一轮里的多次触发合成一个微任务。 */
      const schedule = () => {
        if (scheduled) return
        scheduled = true
        queueMicrotask(() => {
          scheduled = false
          sync()
        })
      }

      const offs = []
      for (const source of [statusSource, sessionSource, workspaceSource]) {
        try {
          offs.push(source.subscribe(schedule))
        } catch (error) {
          /* 订阅不了就只靠 MutationObserver */
        }
      }
      const observer = new MutationObserver(schedule)
      observer.observe(document.body, {
        childList: true,
        subtree: true,
        attributes: true,
        attributeFilter: ['data-row-key'],
      })
      sync()

      return function disposeStatus() {
        for (const off of offs.splice(0)) {
          try {
            if (typeof off === 'function') off()
          } catch (error) {
            /* 已注销 */
          }
        }
        try {
          observer.disconnect()
        } catch (error) {
          /* 已断开 */
        }
        for (const row of document.querySelectorAll(ROW_SELECTOR)) {
          row.removeAttribute(STATE_ATTR)
        }
      }
    }

    /**
     * 装表：只做三件事 —— 放样式、打开关属性、留一个调试入口。
     * 幂等：重复调用只会替换同名样式表。
     */
    function apply(ctx, config) {
      /** 补丁层可传 config；没传就用默认（扫描线开、硬影开）。
       *  注意：不能读 ctx.config —— cordis 要求先 inject config 服务，
       *  否则会抛 "cannot get property config without inject"，进程直接停在 loading。 */
      const cfg = { ...DEFAULT_CONFIG, ...(config ?? {}) }

      /** 会话状态轨的拆卸句柄；服务缺席时是空函数。 */
      let stopStatus = () => {}

      const previous = document.getElementById(STYLE_ID)
      if (previous !== null) previous.remove()

      const tag = document.createElement('style')
      tag.id = STYLE_ID
      tag.dataset.plugin = 'dsh-eva-skin'
      tag.textContent = CSS
      document.head.appendChild(tag)

      const root = document.documentElement
      root.setAttribute(ATTR, 'on')
      if (cfg.scanlines === false) root.removeAttribute(SCAN_ATTR)
      else root.setAttribute(SCAN_ATTR, 'on')
      if (cfg.hardShadow === false) root.removeAttribute(SHADOW_ATTR)
      else root.setAttribute(SHADOW_ATTR, 'on')
      if (cfg.backdrop === false) root.removeAttribute(BACKDROP_ATTR)
      else root.setAttribute(BACKDROP_ATTR, 'on')

      /** 底图元素：挂在 html 下面，不依赖 body 是否已就绪。 */
      const staleLayer = document.getElementById(LAYER_ID)
      if (staleLayer !== null) staleLayer.remove()
      let backdropLayer = null
      if (cfg.backdrop !== false) {
        backdropLayer = document.createElement('div')
        backdropLayer.id = LAYER_ID
        backdropLayer.setAttribute('aria-hidden', 'true')
        document.documentElement.appendChild(backdropLayer)
      }

      /** 版本徽标：一行小字，能证明「这个构建真的跑起来了」。 */
      const staleBadge = document.getElementById(BADGE_ID)
      if (staleBadge !== null) staleBadge.remove()
      const badge = document.createElement('div')
      badge.id = BADGE_ID
      badge.textContent = 'EVA SKIN ' + VERSION
      document.documentElement.appendChild(badge)

      /** 卸载即净：样式表、开关属性、调试入口一起清掉。 */
      function dispose() {
        stopStatus()
        if (backdropLayer !== null) backdropLayer.remove()
        badge.remove()
        const el = document.getElementById(STYLE_ID)
        if (el !== null) el.remove()
        root.removeAttribute(ATTR)
        root.removeAttribute(SCAN_ATTR)
        root.removeAttribute(SHADOW_ATTR)
        root.removeAttribute(BACKDROP_ATTR)
        if (window[GLOBAL_KEY] === api) delete window[GLOBAL_KEY]
      }

      const api = { config: cfg, css: CSS, dispose }
      window[GLOBAL_KEY] = api
      try {
        stopStatus = installSessionStatus(ctx)
      } catch (error) {
        console.error('[dsh-eva-skin] 会话状态轨不可用:', error)
      }



      ctx.effect(() => dispose, 'dsh-eva-skin: dispose')
    }

    exports.name = name
    exports.inject = inject
    exports.apply = apply
    return module.exports
  },
})
