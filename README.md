# 中医AI健康管家 · 客户端 MVP 可点击演示

TCM AI Health Manager — clickable prototype of the patient-side mobile client.

一个零依赖的单文件原型:14 个页面、真实的 10 题体质初探与自适应早停评分(ZYYXH/T 157-2009)、方案生成、打卡、养生问答分流、家庭成员切换、老年模式、八段锦导引浮层、穴位按压倒计时,**中英文一键切换**(右上角「EN / 中」或设置页)。

> 这是产品原型,不是医疗软件。所有内容为演示数据;体质评分规则按行业标准实现,但题目文字仍标注为待核对草案。

---

## 快速开始

### 方式零:在线直接看(最简单)

**https://shenrao682.github.io/tcm-health-manager-demo/** — 任何浏览器打开即可,手机也行,无需安装。

### 方式一:本机打开 `index.html`

必须用**浏览器**打开,而不是代码查看器:在 Finder 里右键 `index.html` → **打开方式 → Google Chrome**(或 Safari / Edge),或把文件拖进浏览器窗口。

> 在 GitHub 网页上点 `index.html`、或在编辑器 / IDE 的文件面板里点开,看到的都是源代码,不是运行中的 demo。
> 如果双击默认用编辑器打开,可右键 → 显示简介 → "打开方式"改为 Chrome → "全部更改"。

### 方式二:本地服务器(推荐,避免个别浏览器对 `file://` 的限制)

需要 Node.js 18+:

```bash
npm install
npm start
```

然后打开 http://localhost:5173 。

或者用 Python(任意版本 3.x):

```bash
python3 -m http.server 5173
```

### 方式三:手机上看

在同一 Wi‑Fi 下运行方式二,然后在手机浏览器输入电脑的局域网 IP,例如 `http://192.168.1.23:5173`。页面在手机宽度下会自动隐藏侧栏,只显示 App。

---

## 目录结构

```
tcm-health-manager-demo/
├─ index.html                     演示本体(HTML + CSS + JS,单文件,无构建)
├─ data/
│  ├─ constitution_questionnaire_zyyxh_t157_2009.json
│  │                              60 题量表结构化数据:题目、子量表、评分、判定、渐进式评估与早停规则
│  ├─ solar_terms_24.json         24 节气定义:双语名称、黄经、季节、养生要点;九种体质 × 四季调养提示
│  └─ solar_terms_instants_2024_2040.json
│                                 2024–2040 每个节气的精确交节时刻(UTC + 北京时间),供日期→节气查表
├─ docs/
│  ├─ proposal-client-mvp.html    客户端 MVP 开发方案(网页版)
│  ├─ data-architecture.html      数据架构与存储策略:两层存储、表结构、同步协议、加密、合规
│  ├─ navigation-map.png          14 页导航组织图
│  ├─ captions.js                 25 条字幕/旁白文本(中英)
│  ├─ record-walkthrough.js       录屏脚本(Playwright):`node record-walkthrough.js zh ../index.html out_zh/`
│  ├─ composite.js · compositor.html  配音合成:用 Chromium MediaRecorder 把 TTS 旁白混入录屏
│  └─ 中医AI健康管家-客户端MVP方案-v0.5.docx
├─ package.json                   仅用于 `npm start` 起静态服务器
└─ README.md
```

`index.html` 内嵌了与 `data/*.json` 等价的题目、量表与节气数据(为了单文件可运行)。正式开发时应改为读取 JSON。

**节气**按用户本地时间实时计算:`termAt(date)` 在交节时刻表中找最后一个 ≤ 当前时刻的节气,「今日」页显示当前节气、序号、交节时刻和距下一节气天数;方案、食疗标签、问答推荐问题随之变化。

---

## 演示路线(约 5 分钟)

1. **今日 → 引导卡 → 快速初探**(10 题)。选"对话方式",输入:`我特别怕冷,手脚老凉,一吃凉的就拉肚子` —— 一句话自动记录 5 题。
2. **我的体质**:看雷达图的阴影带(可能区间)与置信度标签;点来源标签看标准出处。
3. **选目标 → 生成初版方案**:五个板块,每条带来源;食疗方和穴位可点进详情。
4. **今日 → 打卡**:完成后出现"体质小问题 3 题";答几轮后回报告页看区间收窄、剩余题数减少(早停)。全部判定后出现"正式报告已生成"。
5. **方案页 → 问一问**:输入 `我血压 150 该吃什么中药` 看分流卡;输入 `胸痛` 看紧急卡;输入 `寒露该怎么吃` 看正常回答。
6. **穴位详情**:按压倒计时(2 分钟 × 两侧)。**运动板块**:八段锦浮层与外链视频。
7. **我的**:切换家庭成员、添加成员、开老年模式(字号 +25%)。
8. **语言**:右上角「EN」切到英文;所有界面、60 题题目、九种体质的方案内容、问答回答、八段锦动作名都有英文版;自由文本映射与分流分类器同时支持中英文输入。

左侧"重置演示数据"可清空状态(状态保存在浏览器 localStorage)。

---

## 代码结构(`index.html` 内)

| 区块 | 内容 |
|---|---|
| `<style>` | 设计 token(浅/深色)、手机框、组件样式;深色模式含祥云纹背景 |
| `/* i18n */` | `S.lang` 当前语言;`tt(zh,en)` 内联双语;`pick({zh,en})`;`IT()/LK()/CT()/sn()` 按语言取题目、量表选项、方案内容、体质名 |
| `/* data */` | `ITEMS_ZH/EN` 60 题、`SCALES` 9 个子量表(含 `short` 雷达图短名)、`SCREENER` 14 题初探、`PHRASES` 中英自然语言→题目映射、`CONTENT_ZH/EN` 九种体质的方案内容 |
| `/* state */` | `S` 全局状态(成员、当前 Tab、导航栈、老年模式),持久化到 localStorage |
| `/* scoring */` | `scaleState()` 区间计算与早停判定、`assess()` 主/兼夹体质与置信度、`nextItems()` 下一批题目 |
| `/* nav */` | `go()` 切 Tab、`push()/pop()` 推入页、`openSheet()` 模态浮层 |
| `/* render */` | `S01`–`S14` 各页面渲染函数、`radar()` 雷达图、`timerBlock()` 倒计时 |
| `/* events */` | `bind()` 事件委托、`act()` 所有按钮动作、`handleAsk()` 问答分类与分流 |

### 评分逻辑摘要

```
转化分 = (原始分 − 题数) / (题数 × 4) × 100
偏颇体质:≥40 是;30–39 倾向是;<30 否
平和质:≥60 且其他均 <30 → 是;≥60 且其他均 <40 → 基本是
早停:已答题固定部分分数,未答题取 1 或 5 得到 [t_min, t_max];
     区间落入单一判定区即停止提问,结论与答满 60 题一致
```

---

## 这个原型不包含的东西

- 真实 LLM 对话(自然语言映射用关键词规则;正式版由模型做映射并输出 `{item_id, value, confidence}`)
- 服务端、账号、数据同步
- HealthKit / Health Connect 读取(打卡页的"已自动获取"为模拟)
- 内嵌视频播放(八段锦链出到 YouTube)

正式客户端的技术选型、接口依赖、排期与预算见 `docs/proposal-client-mvp.html`;用户数据放哪里、怎么存、怎么删见 `docs/data-architecture.html`。

---

## 从原型到正式客户端

建议路径(与方案第 7 节一致):

1. 用 Expo + React Native 新建项目,按 `docs` 中的路由结构建 `(tabs)` / `(assessment)` / `chat`
2. 把 `data/*.json` 作为知识层第一份数据源;评分引擎直接移植 `scaleState / assess / nextItems`(纯函数,无 DOM 依赖)
3. `CONTENT` 中的方案内容迁入带 `source` 字段的内容库
4. 对话映射改为调用服务端 `/assessment/chat`(由 Claude 完成映射)
5. 问答的 `classify()` 改为服务端 `/chat/classify`;客户端保留紧急关键词本地词典

---

## 许可

内部原型,未定许可。体质分类依据中华中医药学会《中医体质分类与判定》(ZYYXH/T 157-2009);使用前请核对标准原文。

---

## 演示视频

带配音的演示录屏(中文 3:23 / 英文 3:07,WebM)体积较大,不放在仓库内,按需单独分享;也可以用下面的脚本自行重录。

## 重新录制带配音的演示视频

需要 Node 18+、Playwright 1.62(浏览器已缓存时可 `PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1`)和 macOS 的 `say`:

```bash
cd docs
npm i playwright@1.62
# 1. 旁白 TTS(中文 Tingting / 英文 Samantha)
node -e 'const c=require("./captions.js"),{execFileSync}=require("child_process");require("fs").mkdirSync("tts",{recursive:true});for(const l of["zh","en"])for(const x of c)execFileSync("say",["-v",l=="zh"?"Tingting":"Samantha","-r",l=="zh"?"185":"175","--data-format=LEI16@22050","-o",`tts/${l}_${x.id}.wav`,x[l]])'
python3 -c 'import wave,glob,json,os;json.dump({os.path.basename(f)[:-4]:round(wave.open(f).getnframes()/22050,2) for f in glob.glob("tts/*.wav")},open("tts/durations.json","w"))'
# 2. 录屏(无声)+ 字幕时间轴
node record-walkthrough.js zh ../index.html out_zh
# 3. 合成配音
node composite.js zh out_zh demo-walkthrough-zh.webm
```
