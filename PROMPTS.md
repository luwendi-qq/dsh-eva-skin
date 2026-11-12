# EVA 皮肤背景图 · 提示词（写明出处与角色）

作品：**Neon Genesis Evangelion（新世纪福音战士）**。角色：**明日香 / Asuka Langley Soryu**。机体：**EVA-02 / Evangelion Unit-02（二号机）**。场景：**NERV 总部地下 EVA 机库**。

尺寸 **3:2（1536×1024）** 或 16:9。要「暗、有信息、但不抢正文」。
硬要求：**左三分之一或下三分之一留空**（正文压在那儿），**不要文字 / 标志 / 水印**，整体低亮度低饱和。

---

## 主图 · 机库对望

EN:
```
Neon Genesis Evangelion fan art, cinematic anime key visual, 3:2, 1536x1024.

Setting: the underground EVA cage of NERV headquarters at night — a vast concrete cavern
with steel catwalks, thick power cables, umbilical cable reels, red rotating warning beacons
and cold floodlights.

Subject 1 — EVA-02 (Evangelion Unit-02): the red production-model evangelion, crimson armor
plates over black rubber joints, a single horn on the forehead, four glowing green eyes, huge
shoulder pylons, hunched biomechanical posture, umbilical cable plugged into its back.
Seen from a low angle, towering in the middle distance, armor rim-lit by cold light.

Subject 2 — Asuka Langley Soryu: 14-year-old girl, long orange-red hair, blue eyes, wearing her
red and black plugsuit with A10 nerve clips in her hair, seen from behind in the near foreground,
standing on a steel catwalk, hands at her sides, looking up at EVA-02.

Style: 1990s cel-shaded anime, hand-painted background, subdued palette of deep indigo, crimson
and magenta rim light, volumetric haze, heavy shadow, low-key lighting, subtle film grain.
The left third and the bottom third are dark and empty for text.

negative: text, logo, watermark, signature, bright center, daylight, cheerful colors, 3D render.
```

中文:
```
《新世纪福音战士》同人，电影感动画主视觉，3:2，1536x1024。

场景：NERV 总部地下的 EVA 机库，深夜——巨大的混凝土洞窟，钢制栈道，粗电力电缆，
脐带电缆绞盘，红色旋转警示灯，冷白投光灯。

主体一 —— 二号机 EVA-02：红色生产型 EVA，绯红装甲板覆盖黑色橡胶关节，额头单角，
四只发绿光的眼睛，巨大肩部拘束架，微微前倾的生物机械体态，背部插着脐带电缆。
低机位仰拍，矗立在中景，红色装甲被冷光勾出轮廓。

主体二 —— 明日香·兰格雷·苍龙：14 岁少女，橘红色长发，蓝眼睛，穿红黑配色战斗服（plugsuit），
头发上别着 A10 神经接驳器，近景背影，站在钢制栈道上，双手自然下垂，仰头看着二号机。

风格：90 年代赛璐璐动画，手绘背景，深靛蓝 + 绯红 + 品红边缘光的低调配色，
体积雾，重阴影，低调布光，轻微胶片颗粒。左三分之一与下方三分之一保持暗、留空。

反向词：文字、logo、水印、签名、中心过亮、日光、鲜艳糖色、3D 渲染感。
```

---

## 备选 A · 发射架升格

```
Neon Genesis Evangelion, EVA-02 (Evangelion Unit-02) rising inside a vertical launch shaft on
its steel catapult cradle, red armor over black joints, single horn, four green eyes, shoulder
pylons; steam venting from the shaft walls, red emergency strobes and cold blue guide lights
raking across the armor, sparks, condensation. low angle, strong vertical composition, 3:2,
1990s cel-shaded anime, dark, left third empty, no text.
```

## 备选 B · 明日香特写

```
Neon Genesis Evangelion, close-up of Asuka Langley Soryu, long orange-red hair, blue eyes,
red plugsuit with black seams, A10 nerve clips, three-quarter back view glancing over her
shoulder, inside the dim EVA cage, out-of-focus red armor and green indicator lights behind,
shallow depth of field, 1990s cel-shaded anime, very dark low-key lighting, film grain, 3:2,
left two thirds almost black, no text.
```

## 备选 C · 第三新东京市远景

```
Neon Genesis Evangelion, wide shot of Neo Tokyo-3 at dusk, brutalist fortress city with
retractable buildings, purple and magenta sky with heavy clouds, the distant silhouette of
EVA-02 standing between the towers, tiny cars on the elevated highway, haze, practical lights
starting to glow, 3:2, 1990s anime background art, lower half dark rooftops and empty,
no text, no logos.
```

---

## 挑图标准
1. 正文区（左/下）亮度低——正文直接压在背景上，没有面板兜着。
2. 主体偏一侧：明日香 + 二号机放右或左，另一侧留空。
3. 红/紫为主，绿只做点睛（绿色多了像另一套皮肤）。
4. 90 年代赛璐璐质感，不要 3D 渲染感。

出图后：
```
python tools/set-background.py 你的图.png 0.95
```
把打印出的 tgz 装上；或直接把图丢进工作区。
