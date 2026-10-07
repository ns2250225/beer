# Beer style authoring guide (for data authors)

Project: Chinese pixel craft-beer brewing sim at /Users/mac/Desktop/craftbeer. You write beer style records into ONE part file `src/data/styles/<part>.json` (a JSON array). A merge+validate script combines all parts into `src/data/beer-styles.json` and checks each style's reference recipe with the real brewing engine.

Read first:
- `src/types.ts` — interfaces `BeerStyle`, `ExampleRecipe`, `StyleRequirement`, `HopAddition`, FlavorDim list, FamilyId, RegionId, RECIPE_PROCESSES.
- `src/engine/brewing.ts` — how a recipe becomes ABV/IBU/SRM + a 15-dim flavor profile (0–5), and how `matchStyle` scores a recipe against a style (range penalties for abv/ibu/srm; for each flavor dim, free tolerance ±0.75 then 7 points per unit × weight; unmet requirement −25 (soft −8)). Identification needs score ≥ 70.
- Ingredient data: `src/data/malts.json`, `hops.json`, `yeasts.json`, `adjuncts.json`, `barrels.json`, `water.json` (ids, unlocks, flavor values). `src/data/aromas.json` (allowed aroma ids), `src/data/glasses.json` (glass ids), `src/data/research.json` (which processes need which research).
- `scripts/style-plan.txt` — the master list (id | English name | family | alsoIn | primary country). Use exactly these ids/families/alsoIn for your assigned styles.

## Each style record
Fill every field of `BeerStyle`:
- `name` (English, as in plan), `nameZh` (natural Chinese name, e.g. "浑浊 IPA", "慕尼黑清亮拉格"), `family`, `alsoIn` (from plan; omit if empty), `group` (sub-heading inside the family page, e.g. for lager: "American" / "International" / "Czech" / "German" / "Bock" / "Modern Lager"; IPA: "Classic" / "Modern" / "Strong" / "Specialty"…), `country` (RegionId[], first = primary from plan), optional `region` (city/area text e.g. "Bamberg"), `fermentation`.
- `abv`, `ibu`, `color` (SRM) ranges — realistic, BJCP-like.
- All 15 flavor dims (body, sweetness, bitterness, acidity, roast, hopAroma, malt, caramel, fruity, spicy, funk, smoke, wood, alcohol, haze), 0–5, one decimal. These are the TARGET profile and must be consistent with what the engine produces for a good recipe of that style (see calibration below). Optional `weights` to emphasize defining dims (e.g. `{"smoke":2}` for Rauchbier, `{"acidity":1.5}` for sours) — use sparingly.
- `tags` (3–6 short Chinese or English tags), `ingredients` (4–8 recommended ingredient ids that exist), `relatedStyles` (2–4 style ids from the plan), `aromas` (3–5 ids from aromas.json), `glass` (glass id), `servingTemp` (°C), `freshness` ('fresh' for hop-forward / delicate beers, 'aging' for barleywine, imperial stout, belgian strong, barrel-aged, lambic/gueuze/flanders, eisbock, old ale; else 'normal').
- `discovery`: 'open' for mainstream styles that players can discover by free experiment; 'clue' for regional/advanced ones (players need to have "heard" of them first — e.g. most Czech, Belgian, sour/wild, specialty IPAs); 'hidden' ONLY for the Historical family (and very obscure ones).
- `clues`: 3–4 Chinese hints in the PRD §47 riddle style (“这种啤酒来自烟熏麦芽传统。” “颜色非常浅。” “酒体轻盈。” “它来自波兰。”). Hints should progressively point to the key ingredients/process without just listing the recipe.
- `description`: 2–3 sentences Chinese: history/culture + tasting.
- `requirements`: the DEFINING features that a flavor profile alone can't capture, so similar styles are distinguishable and players must use the right technique. Examples: Hefeweizen `{"type":"yeastType","in":["weizen"]}` + `{"type":"maltShare","category":"wheat","min":0.5}` + `{"type":"noProcess","in":["filtered"]}`; Kristallweizen same but `{"type":"process","in":["filtered"]}`; Gose `adjunct sea_salt` + `adjunct coriander`; German Pils `{"type":"hopOrigin","in":["germany"],"minShare":0.7}` + lager yeastType; Czech styles hopOrigin czech + `yeast czech_lager|bohemian_lager` soft; Lambic `process coolship`; Gueuze `process coolship` + `process blend`; Eisbock `process freeze`; Steinbier `process hotStone`; Brut IPA `process enzyme`; Rice Lager `maltShare rice min 0.2`; Cold IPA lager/`california_lager_yeast` + rice or corn; NEIPA vs Hazy IPA (NEIPA require oat ≥ 0.12 and yeast london_ale_iii|vermont_ale; Hazy IPA looser); Milkshake IPA lactose + fruit or vanilla; Barrel styles `{"type":"barrel","in":[...],"minMonths":6}`; Fruit styles `adjunctCategory fruit min 40` (g/L!); Kettle sour `process kettleSour`; Berliner Weisse wheat + (kettleSour or lacto yeast — write two soft alternatives or pick kettleSour). Each requirement may have a Chinese `hint` (shown to the player after they get clues), and `soft: true` for nice-to-haves. Keep 0–4 requirements per style.
  - Note `adjunctCategory.min` and `adjunct` amounts are in grams per LITER (recipe grams / 20).
  - Lager styles: use `{"type":"yeastType","in":["lager"]}`; the engine auto-adds the derived process `lagering` when maturationDays ≥ 14 with lager yeast (or ale yeast at ≤14 °C), and `dryHop` when dry-hop ≥ 0.2 g/L, `fruitSecondary` when fruit is added in secondary/fermentation, `barrel` when a barrel is used.
- `example`: a realistic reference recipe for a 20 L batch (malts in kg, hops in grams with `use` boil/whirlpool/dryHop and `time` for boil, adjunct grams). Use only existing ingredient ids. Reasonable process settings (mashTemp 62–70, boilTime 60–90 (90 for pilsner-malt heavy beers to avoid DMS), fermentTemp inside the yeast's tempMin–tempMax, fermentDays ≥ yeast.minDays, maturationDays (lagers ≥ 21; ales 3–14; big beers 30+; wild beers fermentDays+maturationDays ≥ 180), carbonation 1.5–4.0 vol, `processes` list from RECIPE_PROCESSES only, `barrel` for barrel styles). Water id from water.json. This recipe is shown to staff/NPC hints, so it must look like something a brewer would actually brew.
- `dbVersion`: "2026.1".

## Validation loop (mandatory)
Run from the project root:
```
npx tsx scripts/styles.ts --part=<your part name> --quiet
npx tsx scripts/styles.ts --part=<part> --show=<styleId>    # details: computed profile(target), OG/FG, top-5 matches
```
A style passes when its own reference recipe scores ≥ 80 for itself AND is within 2 points of the best-matching style overall (synonym-like neighbours are allowed to tie). Iterate: adjust the style's target dims/ranges (to what the engine produces for a realistic recipe), the recipe, or add distinguishing requirements, until all of your styles are `OK` and there are no data errors for your ids. Other agents are writing other part files at the same time; if one of your styles collides with a style in another part, fix it on your side (requirements/profile), never edit other parts. Data-error lines like "[plan] 缺少风格 xyz" for styles not assigned to you are expected while others are still working — ignore them.

Do NOT edit any file other than your own part file. Don't change engine code or ingredient data; if something is truly impossible, say so in your final report.

Final report: number of styles written, all-OK confirmation (paste the summary line), and any concerns (≤ 10 lines).
