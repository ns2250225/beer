# 像素精酿酒吧 · Pixel Craft Brewery

一款披着像素模拟经营外衣的**全球精酿啤酒百科 + 酿酒实验游戏**。纯前端单机网页游戏，无需服务器。

## 运行

```bash
npm install
npm run dev        # 开发模式  http://localhost:5173
npm run build      # 生产构建到 dist/（相对路径，可直接部署到任意静态空间）
```

技术栈：Vue 3 + TypeScript + Pinia + PixiJS 8 + IndexedDB + Web Audio API。所有像素画面、音效、音乐均由代码实时生成，没有外部素材。

## 玩法一览

研究配方 → 采购原料 → 酿造（糖化控温 / 冷却投种小游戏）→ 发酵 / 熟成 → 品鉴鉴定风格 → 装桶 → 上酒头 → 客人点酒、评价 → 金币 + 声望 + XP → 解锁研究 / 设备 / 地区 → 完善《世界精酿图鉴》

| 系统 | 说明 |
|---|---|
| 酿酒实验室 | 麦芽 / 酒花（煮沸·回旋·干投）/ 酵母 / 辅料 / 水质（预设或自定义矿物质）/ 工艺参数 / 特殊工艺；实时预测 ABV·IBU·SRM·15 维风味·香气 |
| 风格鉴定 | 配方没有唯一答案：引擎按理化指标、风味轮廓和关键工艺（如冷却池、冰冻浓缩、热石）判断落入哪种风格，“非常接近未知风格”会给出线索 |
| 图鉴 | 22 个家族、153 种风格；？？？→ 听说过 → 获得线索 → 成功酿造 → 优秀（银框）→ 大师（金框）；水果/木桶变体；我的精酿图鉴（自创酒 + 酒标生成器） |
| 酒吧 | 剖面式像素酒吧，客人进门、找座、点单、等待、喝酒、气泡对话、评价、离开；调酒师接酒；后场酿造区动画 |
| 客人 | 16 种客人原型 × 10 种性格 × 15 种口味模型 × 随机外观；评分 = 风格准确度、酿造品质、新鲜度、温度、酒杯、偏好、价格 |
| 缺陷 | 氧化、双乙酰、乙醛、DMS、感染、杂醇、涩感、发酵不足——客人会用台词告诉你 |
| 经营 | 每日营业 16:00–02:00、结算报表、天气、随机事件、声望 8 级、员工（调酒师 / 按标准流程自动生产的酿酒师）、设备四级升级、装修、酒杯、批发啤酒、破产不 Game Over |
| 长线 | 46 项研究、20 个世界地区、16 位特殊 NPC 与委托、木桶陈酿、47 个成就、古籍线索 |
| 时间 | 现实 1 秒 = 游戏 10 分钟，1x / 2x / 4x / 8x |
| 存档 | IndexedDB 自动存档（每天开始）+ 3 个手动槽位 + JSON 导入导出 |

## 数据驱动

游戏内容全部位于 `src/data/`，核心代码不写死任何啤酒：

```
beer-styles.json   ← 由 src/data/styles/*.json 合并生成
malts.json hops.json yeasts.json adjuncts.json barrels.json water.json
countries.json customers.json dialogue.json events.json weather.json
achievements.json npcs.json quests.json decorations.json defects.json
equipment.json research.json glasses.json aromas.json meta.json
```

`meta.json` 中的 `beerDatabaseVersion` 与程序分离；读取旧存档时会自动补齐新增风格并提示“啤酒数据库已更新”。

### 新增 / 修改风格

1. 在 `src/data/styles/` 的任一分片中加入风格记录（字段见 `src/types.ts` 的 `BeerStyle`，编写指南见 `scripts/STYLE_GUIDE.md`），每个风格附带 20L 参考配方。
2. 运行校验（会合并生成 `beer-styles.json`）：

```bash
npx tsx scripts/styles.ts --quiet            # 全部风格：参考配方须 ≥80 分且为最佳匹配
npx tsx scripts/styles.ts --show=hazy_ipa     # 查看某风格的计算风味与前 5 匹配
```

### 无界面试玩

```bash
npx tsx scripts/playtest.ts 30   # 用真实 store + 酒吧模拟跑 30 天，输出每日经营数据
```

## 目录

```
src/engine/   brewing.ts（配方分析/风格匹配/品质缺陷/新鲜度） customers.ts（客人决策与评分）
              sim.ts（酒吧实时模拟） db.ts（数据索引） audio.ts idb.ts
src/stores/   game.ts（经营主状态） ui.ts
src/scene/    BarScene.ts（PixiJS 像素场景） layout.ts
src/components/  GameView / ModalHost / Tutorial / panels/*（实验室、酿造、酒窖、酒头、商店、图鉴、研究、设备、装修、员工、地图、委托、成就、统计、设置）
```
