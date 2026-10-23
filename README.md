# Migoo Intelligent UI · 商品卡自适应配置台

单文件原型：`index.html`（无依赖，双击即开）。参考 [open-intelligent-ui](https://github.com/thesysdev/open-intelligent-ui) 的架构——模型只写一份 UI 描述、布局由组件库渲染——Migoo 电商版把「模型」换成可配置的 **策略引擎**：

```
信号 Signals ──▶ 策略引擎 Policy ──▶ 卡片 Spec（JSON / Migoo UI Lang） ──▶ Migoo 组件渲染
用户画像·查询·上下文     规则库 × 优先级 × 注意力预算 × 现网约束        槽位·强调等级·文案·顺序·排序权重      小卡 / 大卡 / feed 卡
```

## 页面怎么用

- **左栏**：7 个预设画像（价格敏感 / 冲动 / 研究 / 品牌粉 / 求稳 / 送礼急用 / 盯价命中）、6 个画像滑块、预算、分层、查询框（自动解析类目 / 品牌 / 线索 / 意图）、宿主（对话小卡 / 对话大卡 / feed 双列）、决策阶段、历史行为开关。
- **中间**：393 宽手机屏，用 Migoo 现网组件渲染排序后的前 3（feed 为 4）张卡；上方是引擎的版式建议与排序依据。点卡片选中。
- **右栏**：`决策追踪`（命中规则、每条 effect 是否生效、注意力预算、候选排序打分）/ `卡片 Spec`（快速覆盖控件 + 可编辑 JSON + Migoo UI Lang 导出）/ `约束检查`（现网 CTA 矩阵、宿主上限、越权规则需拍板）/ `规则库`（逐条开关、改优先级）。
- `#preset=impulse` 之类的 hash 可直达某个预设（只决定首屏画像，不碰你保存的规则开关与覆盖，读取后自动清掉）；状态存 localStorage，损坏时自动重置。
- 「并排对比另一个画像」可在中间放第二块手机屏，同一查询下看另一类用户得到的卡。

## Spec 与规则

信号 schema、卡片 Spec schema、规则 schema 见 `index.html` 第一段 `<script>` 顶部的注释与 `RULES` 数组；设计基线来自《Migoo AutoTask 组件库》（`migoo-autotask-components.html`）的 token 与 CTA 矩阵。

- 规则 = `when`（JS 布尔表达式，只能引用 `user./query./context./product.`）→ `effects`（对 Spec 路径的 `set / max / min / push / add`）+ `priority` + `designRisk`。
- 冲突裁决：硬性约束（缺货、命中）＞ 宿主上限 ＞ 优先级（升序应用，高者后写）＞ 注意力预算（价格强调 + 购买入口等级 + 理由条数 ≤ 7，超了先削低优先级槽位）＞ 现网默认。
- `designRisk: 'override'` 的规则（如冲动型实心 Buy）默认生效，但在「约束检查」里标「拍板」；关掉总开关即收敛到现网 CTA 矩阵。
- 一句话只说一次：AI 行说过的内容，比价行 / 紧迫行 / 角标 / 理由不再重复。

## 规则库来源

`RULES` 共 70 条：40 条手写基线 + 21 条并入自 `rules-workflow-candidates.json`（5 个并行 agent 按维度枚举、逐维批判、合并后的 66 条候选；未并入的多为与引擎宿主约束重复或文案硬编码的条目，保留供参考）+ 9 条按五视角审查（token 合规 / 引擎逻辑 / 产品 / 前端 / 规则内容）补的规则（点名型号优先、cheap 钉顶、小幅超预算给到价提醒、品牌点名的替代品明示、大促对价格敏感/VIP 生效等）。

审查后加的硬约束：一屏只有首卡可以越过 CTA 矩阵（其余卡收敛到现网）；角标必须有商品字段背书（可退货 / 正品 / 到货天数）；小卡图上不放 pill、无次动作；feed 无任务入口与社会证明；信息区行数上限；「一句话只说一次」去重（AI 行 ↔ 紧迫行 / 角标 / 理由 / 评分行 / 图上 pill）。

## 扩展

- **加商品**：`CATALOG` 里按类目加一条，字段即规则可引用的 `product.*`；`parseQuery` 的类目正则加关键词。
- **加规则**：往 `RULES` 追加一条即可，页面会自动出现在规则库。
- **换成模型驱动**：让模型输出同一份 Spec JSON（或 Migoo UI Lang），跳过规则阶段，渲染层不变。

## 无浏览器测试

```bash
node harness.js all          # 跑全部预设，打印每张卡的 Spec 摘要、命中规则、约束检查
node harness.js impulse --json
```
