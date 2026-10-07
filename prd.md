
# 《像素精酿酒吧》产品需求文档 PRD

## 1. 产品概述

### 1.1 游戏名称

暂定：

**《像素精酿酒吧 / Pixel Craft Brewery》**

### 1.2 游戏类型

- 2D 像素风
- 精酿啤酒模拟经营
- 配方研究
- 酿造模拟
- 酒吧经营
- 客人模拟
- 全球啤酒图鉴
- 收集养成
- 单机网页游戏

### 1.3 核心概念

玩家从一家只有几张桌子和一套基础酿造设备的小型精酿酒吧开始。

玩家需要：

**购买原料 → 研究配方 → 酿造 → 发酵 → 熟成 → 装桶 → 上架 → 客人点酒 → 获得评价 → 赚钱 → 解锁新原料/设备/风格 → 收集全球精酿图鉴**

最终目标不是简单成为“最赚钱的酒吧”，而是：

> **酿遍世界啤酒风格，打造一家拥有完整全球精酿图鉴的传奇像素酒吧。**

---

# 2. 核心设计原则

游戏围绕四个关键词：

**酿、卖、研、藏**

### 酿

玩家真正参与配方和酿造，而不是点击按钮等待。

### 卖

自己酿出的酒在自己的酒吧出售。

### 研

通过实验发现新的配方、原料组合和啤酒风格。

### 藏

每成功酿造一种新的啤酒风格，就会点亮对应图鉴。

最终形成：

```text
研究配方
   ↓
采购原料
   ↓
酿造啤酒
   ↓
等待发酵
   ↓
品鉴
   ↓
酒吧出售
   ↓
顾客评价
   ↓
获得金币 + 声望 + 研究经验
   ↓
解锁新原料 / 新设备 / 新地区
   ↓
挑战更复杂的啤酒
   ↓
完善全球精酿图鉴
```

---

# 3. 世界观

玩家接手一家即将倒闭的小酒吧。

酒吧后方留下了一套老旧的：

- 糖化锅
- 煮沸锅
- 发酵桶
- 木桶
- 冰箱
- 酒头

以及一本只有第一页内容的：

> 《世界精酿图鉴》

第一页写着：

> “世界上的啤酒远比你想象得复杂。”

玩家决定重新经营这家酒吧，并尝试酿出来自世界各地的啤酒。

随着声望提高，会有来自不同国家和地区的：

- 酒客
- 酿酒师
- 啤酒收藏家
- 旅行者
- 啤酒评审
- 原料商
- 神秘客人

来到酒吧。

他们可能带来：

- 新配方
- 特殊酵母
- 地方啤酒知识
- 稀有酒花
- 历史配方
- 特殊挑战

---

# 4. 美术风格

## 4.1 整体风格

采用：

**温暖、复古、略微杂乱的 2D Pixel Art 精酿酒吧。**

推荐内部逻辑分辨率：

```text
320 × 180
或
480 × 270
```

再进行整数倍放大。

---

# 5. 酒吧主场景

采用横向剖面式酒吧。

```text
┌──────────────────────────────────────────┐
│                 酒吧招牌                 │
│                                          │
│ 客桌      客桌       吧台                │
│ 👤🍺      👤🍺      👤 │ 🍺🍺🍺         │
│                        │                 │
│                        │ 酒头            │
│                                          │
│──────────── 后方酿造区域 ───────────────│
│                                          │
│ 麦芽 │ 糖化锅 │ 煮锅 │ 发酵桶 │ 木桶   │
│ 🌾     ♨️       ♨️     🛢️       🪵     │
└──────────────────────────────────────────┘
```

玩家能够直接看到：

- 客人进入
- 找位置
- 看菜单
- 点酒
- 调酒/接酒
- 喝酒
- 聊天
- 评价
- 离开

与此同时，后方：

- 糖化锅冒蒸汽
- 麦汁沸腾
- 发酵桶冒气泡
- 木桶陈酿
- 员工搬运酒桶

形成一个持续运转的小型像素世界。

---

# 6. 全球啤酒分类系统

## 6.1 分类原则

游戏不要宣称存在一个永远固定的“全部啤酒”。

采用：

> **全球啤酒风格数据库 Global Beer Style Database**

内部允许版本更新和新增风格。

基础参考：

- BJCP
- Brewers Association
- 世界各地历史啤酒
- 地方传统风格
- 现代 Craft Beer 风格
- 实验型啤酒

---

# 7. 一级啤酒家族

游戏 UI 不直接把数百种风格平铺出来，而采用：

```text
全球啤酒
│
├── Lager 拉格
├── Pale Ale 淡色艾尔
├── IPA
├── Wheat Beer 小麦啤酒
├── Porter 波特
├── Stout 世涛
├── Belgian 比利时系
├── Sour 酸啤
├── Wild 野生发酵
├── Farmhouse 农舍艾尔
├── Strong Ale 强艾尔
├── Scottish / Irish
├── German 德式
├── Czech 捷克系
├── British 英式
├── American 美式
├── Fruit 水果啤酒
├── Spice 香料啤酒
├── Smoke 烟熏啤酒
├── Wood / Barrel 木桶陈酿
├── Historical 历史啤酒
└── Experimental 实验精酿
```

一级分类主要服务玩家理解。

底层数据库仍然保存更加详细的标准风格。

---

# 8. 全球精酿图鉴

这是游戏最大的长期收集系统。

入口：

**《世界精酿图鉴》**

打开之后是一整本像素百科。

---

## 8.1 Lager

包括但不限于：

### American

- American Light Lager
- American Lager

### International

- International Pale Lager
- International Amber Lager
- International Dark Lager

### Czech

- Czech Pale Lager
- Czech Premium Pale Lager
- Czech Amber Lager
- Czech Dark Lager

### German

- Munich Helles
- German Pils
- German Leichtbier
- Helles Exportbier
- Märzen
- Festbier
- Kellerbier
- Munich Dunkel
- Schwarzbier

### Bock

- Helles Bock
- Dunkles Bock
- Doppelbock
- Eisbock

### Modern Lager

- Rice Lager
- Italian Pilsner
- West Coast Pilsner
- Mexican-style Lager

---

# 9. Pale Ale / Bitter

包含：

- Ordinary Bitter
- Best Bitter
- Strong Bitter
- British Golden Ale
- Australian Sparkling Ale
- English IPA
- American Pale Ale
- Belgian Pale Ale
- Belgian Blond Ale
- Blonde Ale
- Cream Ale

---

# 10. IPA 系

IPA 是游戏中最大的独立收藏树之一。

```text
IPA
│
├ American IPA
├ English IPA
├ Double IPA
├ Imperial IPA
├ Session IPA
├ Hazy IPA
├ NEIPA
├ West Coast IPA
├ Black IPA
├ White IPA
├ Red IPA
├ Brown IPA
├ Rye IPA
├ Belgian IPA
├ Brut IPA
├ Cold IPA
├ Milkshake IPA
├ Fruit IPA
├ Brett IPA
└ Experimental IPA
```

IPA 可以设计成游戏中最适合玩家自由实验的类别。

---

# 11. Wheat Beer

包括：

- Weissbier
- Hefeweizen
- Kristallweizen
- Dunkles Weissbier
- Weizenbock
- American Wheat Beer
- Belgian Witbier
- Berliner Weisse

---

# 12. Porter

包括：

- English Porter
- American Porter
- Baltic Porter
- Robust Porter
- Historical Porter

---

# 13. Stout

包括：

- Irish Stout
- Irish Extra Stout
- Sweet Stout
- Milk Stout
- Oatmeal Stout
- American Stout
- Foreign Extra Stout
- Tropical Stout
- Imperial Stout
- Russian Imperial Stout

现代扩展：

- Coffee Stout
- Chocolate Stout
- Pastry Stout
- Coconut Stout
- Vanilla Stout
- Barrel-aged Stout

---

# 14. Belgian 系

包含：

- Witbier
- Belgian Pale Ale
- Belgian Blond Ale
- Saison
- Bière de Garde
- Belgian Dubbel
- Belgian Tripel
- Belgian Golden Strong Ale
- Belgian Dark Strong Ale
- Belgian Single

修道院系列可以单独形成：

```text
Monastic Beer
│
├ Single
├ Dubbel
├ Tripel
└ Belgian Dark Strong
```

---

# 15. Sour / Wild

酸啤是中后期高级酿造路线。

包括：

- Berliner Weisse
- Gose
- Lambic
- Gueuze
- Fruit Lambic
- Flanders Red Ale
- Oud Bruin
- American Wild Ale
- Brett Beer
- Mixed Fermentation Sour
- Kettle Sour
- Fruited Sour

需要不同：

- 菌种
- 发酵设备
- 发酵时间
- 木桶

---

# 16. Fruit Beer

允许大量组合。

基础酒：

```text
IPA
Wheat
Sour
Stout
Lager
Saison
...
```

+

水果：

```text
樱桃
覆盆子
草莓
蓝莓
桃
杏
芒果
百香果
菠萝
葡萄
李子
柚子
柠檬
橙
荔枝
火龙果
椰子
...
```

例如：

```text
Mango Hazy IPA
Cherry Lambic
Raspberry Sour
Peach Saison
Blueberry Wheat
```

---

# 17. 香料 / 特殊原料啤酒

玩家可以加入：

- 咖啡
- 可可
- 香草
- 肉桂
- 丁香
- 胡椒
- 生姜
- 蜂蜜
- 枫糖
- 茶叶
- 辣椒
- 盐
- 香草植物

产生特殊风格。

---

# 18. Barrel Aged

后期开放酒窖。

木桶：

- American Oak
- French Oak
- Bourbon Barrel
- Whisky Barrel
- Rum Barrel
- Wine Barrel
- Sherry Barrel

例如：

```text
Imperial Stout
+
Bourbon Barrel
+
12个月

→ Bourbon Barrel Aged Imperial Stout
```

---

# 19. Historical Beer

世界地图中存在隐藏的历史啤酒。

例如：

- Grodziskie
- Sahti
- Kvass-like historical beer
- Kentucky Common
- Pre-Prohibition Lager
- Pre-Prohibition Porter
- Lichtenhainer
- Roggenbier
- Dampfbier
- Steinbier

历史风格主要通过：

**旅行者 / 老酿酒师 / 古籍 / 特殊任务**

发现。

---

# 20. 啤酒图鉴页面

每一种啤酒都有独立页面。

例如：

```text
────────────────────────
🍺 Hazy IPA

国家/地区：
美国

类型：
IPA

颜色：
金黄 → 橙黄

ABV：
6.0% ～ 9.0%

苦度：
●●○○○

酒体：
●●●○○

麦芽：
●●○○○

酒花：
●●●●●

水果香：
●●●●○

常见香气：
🥭 Mango
🍊 Citrus
🍑 Peach
🍍 Tropical

推荐酒花：
Citra
Mosaic
Galaxy

推荐温度：
7℃

已酿造：
✔

最高评分：
92

最佳批次：
第 38 批

酿造次数：
12
────────────────────────
```

---

# 21. 图鉴发现状态

每种酒存在：

```text
？？？
↓
听说过
↓
获得线索
↓
成功酿造
↓
优秀
↓
大师级
```

颜色：

```text
灰色 = 未发现
暗色 = 已获得线索
彩色 = 已酿造
银框 = 优秀
金框 = 大师
```

---

# 22. 原料系统

酿造由四大核心组成：

```text
水
麦芽
酒花
酵母
```

然后加入：

```text
水果
香料
糖
咖啡
可可
木材
特殊辅料
```

---

# 23. 麦芽系统

基础：

- Pilsner Malt
- Pale Malt
- Vienna Malt
- Munich Malt

焦糖：

- Crystal
- Caramel

深色：

- Chocolate Malt
- Black Malt
- Roasted Barley

特殊：

- Wheat Malt
- Rye Malt
- Oat
- Smoked Malt

每种麦芽拥有：

```text
颜色
甜度
烘烤味
焦糖味
巧克力味
咖啡味
烟熏味
```

---

# 24. 酒花系统

设计全球酒花收藏。

例如：

### 美国

- Citra
- Mosaic
- Cascade
- Centennial
- Simcoe
- Amarillo
- Chinook

### 新西兰

- Nelson Sauvin
- Motueka
- Riwaka

### 澳大利亚

- Galaxy
- Vic Secret
- Enigma

### 德国

- Hallertau
- Tettnang
- Spalt

### 捷克

- Saaz

### 英国

- Fuggle
- East Kent Goldings

不同酒花拥有：

```text
柑橘
热带水果
松针
花香
草本
葡萄
莓果
辛香
```

等属性。

---

# 25. 酵母系统

酵母决定大量风味。

主要类别：

```text
Ale Yeast
Lager Yeast
Belgian Yeast
Weizen Yeast
Kveik
Brettanomyces
Lactobacillus
Pediococcus
Mixed Culture
```

---

# 26. 水质系统

中后期开放。

包括：

```text
Ca
Mg
Na
Cl
SO4
HCO3
pH
```

普通玩家可以直接使用：

```text
柔软水
平衡水
IPA 水
深色啤酒水
拉格水
```

高级模式允许调整矿物质。

---

# 27. 配方设计系统

玩家进入：

**酿酒实验室**

可以创建自己的 Recipe。

界面：

```text
【基础风格】

Hazy IPA

【麦芽】

Pale Malt       4kg
Wheat Malt      1kg
Oat             0.8kg

【酒花】

Citra           80g
Mosaic          60g

【酵母】

London Ale III

【特殊原料】

Mango           500g

预计：

ABV  6.8%
IBU  35
SRM  5

苦度     ███
甜度     ██
酒体     ████
果香     █████
麦芽香   ██
```

---

# 28. 配方不是固定答案

这是游戏的重要机制。

例如目标：

**American IPA**

并不存在唯一配方。

系统根据最终结果判断：

```text
ABV
IBU
颜色
麦芽表现
酒花表现
发酵表现
香气
甜度
酸度
酒体
```

是否落入对应风格。

因此玩家可以自己研究。

---

# 29. 实验发现机制

例如玩家完全不知道 NEIPA 怎么做。

第一次：

```text
Pale Malt
Cascade
普通 Ale Yeast

结果：

American Pale Ale
```

第二次：

```text
增加酒花
降低苦度
加入燕麦
```

结果：

```text
？？？

非常接近一种未知风格。
```

第三次：

加入：

```text
Citra
Mosaic
London Ale Yeast
大量 Dry Hop
```

结果：

```text
🎉 新风格发现！

Hazy IPA

世界精酿图鉴 +1
```

产生类似炼金术的发现感。

---

# 30. 酿造流程

完整流程：

```text
研磨
↓
糖化
↓
过滤
↓
煮沸
↓
加入酒花
↓
冷却
↓
加入酵母
↓
主发酵
↓
Dry Hop / 辅料
↓
熟成
↓
碳酸化
↓
装桶
↓
上酒头
```

---

# 31. 酿造小游戏

部分过程允许操作。

例如糖化：

需要保持：

```text
64℃～68℃
```

像素温度计不断变化。

玩家调整火力。

温度控制越稳定：

```text
酿造质量 +++
```

但不要求玩家每次操作。

成功酿造后可以：

> 保存为标准流程

以后员工自动生产。

---

# 32. 发酵系统

不同啤酒需要不同时间。

例如：

```text
Hefeweizen
7～14 天

IPA
10～21 天

Lager
30～60 天

Imperial Stout
30～90 天

Barrel Aged Stout
6～24 月
```

游戏时间会进行压缩。

例如：

```text
现实 1 秒 = 游戏 10 分钟
```

并支持：

```text
1x
2x
4x
8x
```

时间速度。

---

# 33. 酒吧菜单

玩家决定每天卖什么。

例如：

```text
TODAY'S TAP

1. House Lager       $5
2. Hazy IPA          $8
3. Mango Sour        $9
4. Imperial Stout    $12
5. Saison            $7
6. Mystery Tap       $6
```

酒头数量受设备限制。

最开始：

```text
2 Tap
```

后期：

```text
4
8
12
20
30
```

---

# 34. 客人系统

每个客人都有隐藏偏好。

例如：

```text
NPC：程序员阿杰

喜欢：
IPA
Hazy IPA
Double IPA

讨厌：
Sweet Stout

苦度偏好：
★★★★☆

酒精接受：
★★★★☆

消费能力：
★★★☆☆
```

---

# 35. 客人类型

设计大量随机客人：

- 普通上班族
- 学生
- 游客
- 啤酒新人
- 精酿老炮
- IPA 狂热者
- Stout 爱好者
- 酸啤爱好者
- 德啤爱好者
- 比利时啤酒爱好者
- 酒花猎人
- 摄影游客
- 美食博主
- 啤酒评审
- 酿酒师
- 神秘客人

---

# 36. 客人的实时对话

客人喝酒之后头顶出现像素气泡。

例如：

```text
“这个酒花香也太猛了！”

“有芒果味？”

“苦，但是好爽。”

“这杯是不是有点氧化？”

“再来一杯！”

“第一次喝酸啤，好奇怪……”

“这杯世涛像液体巧克力。”

“老板，这是什么酒花？”
```

让玩家通过 NPC 对话直接理解自己的产品。

---

# 37. 顾客评分

每杯酒根据：

```text
风格准确度
酿造质量
新鲜度
温度
客人偏好
价格
酒杯
```

计算满意度。

例如：

```text
🍺 Hazy IPA

风格准确：92
酿造质量：87
新鲜度：98
温度：90

客人偏好：+15%

最终：

❤️ 94

“太棒了，再来一杯。”
```

---

# 38. 酒吧声望

等级：

```text
Lv.1 无名小酒馆
Lv.2 街角精酿
Lv.3 社区名店
Lv.4 城市热门酒吧
Lv.5 精酿圣地
Lv.6 全国知名
Lv.7 世界级酒吧
Lv.8 传奇精酿酒吧
```

---

# 39. 酒吧装修

玩家可以购买：

- 木桌
- 高脚椅
- 沙发
- 黑板菜单
- 啤酒海报
- 霓虹灯
- 酒桶墙
- 酒花装饰
- 黑胶唱机
- 音响
- 飞镖
- 桌游
- 冰箱
- 展示柜
- 世界地图

部分装饰影响客人类型。

例如：

```text
飞镖
→ 上班族 +10%

黑胶唱机
→ 文艺客 +15%

专业啤酒冰箱
→ 精酿玩家 +20%
```

---

# 40. 设备升级

设备包括：

### Mill

麦芽研磨机

### Mash Tun

糖化锅

### Brew Kettle

煮沸锅

### Fermenter

发酵罐

### Bright Tank

清酒罐

### Keg

酒桶

### Cold Storage

冷库

### Barrel

木桶

升级：

```text
家庭级
↓
小型精酿
↓
专业级
↓
工业级
```

---

# 41. 设备容量

例如：

```text
小发酵桶
20L

中型发酵罐
100L

大型发酵罐
500L
```

玩家必须考虑：

> 我要不要用唯一的大罐生产最畅销的 IPA？

形成经营策略。

---

# 42. 新鲜度系统

IPA 等酒非常依赖新鲜度。

例如：

```text
刚完成：
100

7 天：
95

30 天：
75

90 天：
40
```

但部分酒：

```text
Barleywine
Imperial Stout
Belgian Strong Ale
Barrel Aged Beer
```

反而可以随着熟成提升品质。

---

# 43. 啤酒缺陷系统

酿造失败不会简单显示：

> 失败

而会产生真实感官缺陷。

例如：

```text
氧化
纸板味

Diacetyl
黄油味

Acetaldehyde
青苹果味

DMS
玉米味

感染
酸败

过度酒精
溶剂感
```

客人会反馈：

> “怎么有股黄油味？”

玩家由此学习问题。

---

# 44. 研究系统

研究树：

```text
BREWING TECH TREE
│
├ 麦芽
│
├ 酒花
│
├ 酵母
│
├ 水质
│
├ 发酵
│
├ 拉格
│
├ IPA
│
├ 比利时
│
├ 酸啤
│
├ 野生发酵
│
└ 木桶陈酿
```

---

# 45. 世界地图

随着游戏进行开放：

```text
🇬🇧 英国
🇩🇪 德国
🇨🇿 捷克
🇧🇪 比利时
🇺🇸 美国
🇨🇦 加拿大
🇦🇺 澳大利亚
🇳🇿 新西兰
🇯🇵 日本
🇨🇳 中国
🇳🇴 北欧
...
```

不是让玩家真正离开酒吧旅行，而是作为：

**原料 / 风格 / NPC / 配方 / 图鉴**

解锁地图。

---

# 46. 地区探索

例如解锁：

## Belgium

获得：

```text
Belgian Yeast
Candi Sugar
Dubbel
Tripel
Saison
Lambic
Gueuze
```

解锁：

**比利时酿酒师 NPC**

---

# 47. 神秘配方

部分啤酒不会直接告诉玩家怎么做。

例如：

```text
？？？？？？？

线索：

“这种啤酒来自烟熏麦芽传统。”

“颜色非常浅。”

“酒体轻盈。”

“它来自波兰。”
```

玩家研究：

```text
小麦
+
烟熏麦芽
+
高碳酸
```

最终：

```text
🎉 Grodziskie
```

---

# 48. 自创精酿系统

玩家不仅能复刻标准风格。

还可以：

> 自创啤酒。

例如：

```text
名称：

宇宙猫猫 IPA

基础：
Hazy IPA

麦芽：
Pale + Oat

酒花：
Citra
Galaxy

水果：
Mango

ABV：
7.2%

IBU：
35
```

游戏自动生成像素酒标。

---

# 49. 酒标生成器

提供：

```text
背景颜色
图案
Logo
字体
边框
图标
```

玩家可以创建：

```text
宇宙猫 IPA
午夜世涛
银河酸啤
像素拉格
程序员 IPA
```

自创酒会进入：

> **我的精酿图鉴**

---

# 50. 酒吧事件

随机事件增加经营变化。

例如：

```text
🔥 IPA 周

IPA 客流 +50%
```

```text
🌧️ 下雨

客流 -20%
Stout 点单 +25%
```

```text
☀️ 酷暑

Lager +40%
Sour +30%
```

```text
🍺 精酿节

游客 +100%
```

---

# 51. 天气系统

包括：

- 晴
- 阴
- 雨
- 雷雨
- 雪
- 高温
- 寒潮

窗外拥有对应 Pixel Animation。

天气同时改变消费偏好。

---

# 52. 昼夜系统

酒吧从下午营业到深夜。

```text
16:00 开门
↓
18:00 下班客流
↓
20:00 高峰
↓
23:00 夜生活
↓
02:00 打烊
```

窗外颜色实时变化。

---

# 53. 成就系统

例如：

### 第一杯

成功酿造第一批啤酒。

### 酒花入门

发现 10 种酒花。

### IPA 狂魔

酿造 20 种 IPA。

### 黑暗料理

酿造 ABV > 12% 的 Stout。

### 酸掉牙

完成 20 种 Sour。

### 世界旅行者

发现 100 种啤酒风格。

### 啤酒博士

完成全球啤酒图鉴。

---

# 54. 图鉴统计

主页显示：

```text
WORLD BEER COLLECTION

发现：

128 / 300+

Lager
████████░░ 82%

IPA
██████████ 100%

Stout
██████░░░░ 61%

Sour
████░░░░░░ 43%

Belgian
███████░░░ 76%

Historical
██░░░░░░░░ 21%
```

具体数量不要硬编码为产品宣传中的永久上限。

数据库可以不断增加。

---

# 55. 每日经营循环

每天：

```text
14:00
检查库存

15:00
安排生产

16:00
开门

18:00
客流增加

20:00
高峰

23:00
特殊客人

02:00
打烊

02:10
每日结算
```

---

# 56. 每日结算

显示：

```text
DAY 38

营业额
$3,820

原料
-$920

工资
-$600

利润
$2,300

卖出
312 杯

最畅销：

🥇 Hazy IPA
🥈 Mango Sour
🥉 Pilsner

新增图鉴：

🍺 Saison

酒吧声望：

★★★★☆
```

---

# 57. 核心经济系统

货币：

### 金币 $

用于：

- 原料
- 装修
- 设备
- 工资

### Brewing XP

用于：

- 解锁技术

### Reputation

用于：

- 解锁 NPC
- 新地区
- 稀有原料

不要设计：

- 钻石
- 体力
- 抽卡

保持纯模拟经营体验。

---

# 58. 游戏失败机制

游戏不设计传统 Game Over。

即使破产：

NPC：

> “看来我们得从小规模重新开始了。”

玩家可以：

- 出售设备
- 降低菜单数量
- 使用便宜原料
- 重新经营

避免存档彻底报废。

---

# 59. 新手流程

第一次进入：

```text
老酿酒师：

“先别想着什么帝国世涛。”

“我们先做一杯 Pale Ale。”
```

步骤：

```text
选择 Pale Malt
↓
选择 Cascade
↓
选择 Ale Yeast
↓
糖化
↓
煮沸
↓
加入酒花
↓
发酵
↓
装桶
↓
连接酒头
↓
第一位客人点酒
```

客人喝完：

```text
“还不错。”

★★★★☆
```

随后：

```text
🎉 American Pale Ale

已加入《世界精酿图鉴》
```

正式开始自由经营。

---

# 60. 数据结构

建议啤酒风格：

```ts
interface BeerStyle {

  id: string

  name: string
  nameZh: string

  family: string

  country: string[]
  region?: string

  fermentation:
    | "ale"
    | "lager"
    | "wild"
    | "mixed"

  abv: {
    min: number
    max: number
  }

  ibu: {
    min: number
    max: number
  }

  color: {
    min: number
    max: number
  }

  body: number

  sweetness: number

  bitterness: number

  acidity: number

  roast: number

  hopAroma: number

  tags: string[]

  ingredients: string[]

  relatedStyles: string[]

}
```

---

# 61. 配方结构

```ts
interface BeerRecipe {

  id: string

  name: string

  targetStyle?: string

  malts: RecipeIngredient[]

  hops: HopAddition[]

  yeast: string

  waterProfile: string

  adjuncts: RecipeIngredient[]

  mashTemperature: number

  boilTime: number

  fermentationTemperature: number

  fermentationDays: number

  maturationDays: number

  barrel?: BarrelConfig

}
```

---

# 62. 啤酒批次

```ts
interface BeerBatch {

  id: string

  recipeId: string

  brewDate: number

  volume: number

  abv: number

  ibu: number

  color: number

  freshness: number

  quality: number

  styleAccuracy: number

  defects: string[]

  flavorProfile: FlavorProfile

}
```

---

# 63. 推荐技术栈

游戏完全可以采用纯前端实现。

推荐：

```text
Vue 3
+
TypeScript
+
PixiJS
+
Pinia
+
IndexedDB
+
Web Audio API
```

其中：

### Vue

负责：

- 菜单
- 图鉴
- 配方
- 商店
- 设置

### PixiJS

负责：

- 酒吧场景
- NPC
- 酿造动画
- 天气
- 粒子效果

### IndexedDB

负责：

- 存档
- 图鉴
- 配方
- 酒吧状态

无需服务器即可完成整个单机版本。

---

# 64. 数据驱动设计

不要把啤酒写死在代码里。

采用：

```text
/data

beer-styles.json
malts.json
hops.json
yeasts.json
adjuncts.json
countries.json
customers.json
events.json
achievements.json
```

例如：

```text
beer-styles.json
```

保存全球风格。

这样以后新增：

```text
Rice Lager
Cold IPA
Italian Pilsner
新兴地方风格
```

只需要更新数据，而无需修改游戏核心代码。

---

# 65. “全球所有啤酒”更新机制

推荐加入：

```text
beerDatabaseVersion
```

例如：

```text
Beer DB

Version:
2026.1
```

将：

**游戏程序**

和

**啤酒数据库**

彻底分离。

以后可以发布：

```text
2027 Beer Database Update
```

加入新的：

- 风格
- 酒花
- 酵母
- 历史啤酒
- 地区风格

从架构上真正实现“持续覆盖世界精酿”。

---

# 66. MVP

第一版不建议直接做几百种。

MVP：

### 啤酒

30 种。

重点包括：

```text
Pilsner
Helles
Märzen
American Pale Ale
American IPA
Hazy IPA
Double IPA
Porter
Stout
Imperial Stout
Witbier
Hefeweizen
Saison
Dubbel
Tripel
Gose
Berliner Weisse
Fruit Sour
...
```

### 原料

```text
10 麦芽
20 酒花
10 酵母
15 辅料
```

### NPC

```text
30 种外观
10 种性格
15 种口味模型
```

组合生成数百种客人。

### 设备

```text
研磨机
糖化锅
煮锅
发酵桶
冰箱
酒桶
酒头
```

---

# 67. V2

扩展：

```text
100+ 啤酒风格
50+ 酒花
30+ 酵母
100+ 原料

世界地图

天气

昼夜

历史啤酒

木桶系统

水质系统

自创精酿

酒标编辑器
```

---

# 68. V3

目标：

> **Global Craft Beer Encyclopedia**

进一步加入：

```text
200～300+ 风格与子风格
全球地方风格
历史啤酒
实验啤酒
完整原料数据库
```

并允许数据库持续更新。

---

# 69. 最重要的游戏体验

本项目不能变成：

> 点击“IPA” → 等待 10 秒 → 获得 IPA。

核心乐趣必须来自：

```text
我想做 Hazy IPA
↓
研究它为什么浑浊
↓
换麦芽
↓
换酵母
↓
换酒花
↓
改变 Dry Hop
↓
酿出来
↓
客人喝
↓
“酒花不错，但是太苦了。”
↓
调整配方
↓
再次酿造
↓
评分 96
↓
图鉴金色点亮
```

玩家会逐渐从：

> “啤酒不就是啤酒吗？”

变成：

> “原来 Pils、Helles、Saison、Gose、Lambic、NEIPA、Imperial Stout 完全不是一种东西。”

因此这款游戏真正的核心定位应该是：

# **一款披着像素模拟经营游戏外衣的全球精酿啤酒百科 + 酿酒实验游戏。**

它同时满足：

**模拟经营的成长感 + 配方实验的探索感 + 图鉴收集的满足感 + 精酿知识的学习感。**