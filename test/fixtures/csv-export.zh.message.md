<proposed_plan>
# 订单列表导出 CSV

## 概述
在订单列表页增加“导出 CSV”按钮，导出当前筛选条件下的订单。大批量导出走后台任务，完成后发站内通知。

## 主要改动
- 后端新增 `GET /orders/export`（`server/routes/orders.ts`），复用列表页的筛选参数。
- 新增后台任务 `server/jobs/exportOrders.ts`，结果文件存到对象存储，链接 24 小时有效。
- 前端在 `web/pages/orders/index.vue` 的工具栏加按钮。

## 待决
- 同步导出的上限：方案 A：1 万行以内同步返回；方案 B：一律走后台任务。推荐：方案 A
- 金额字段用元还是分？
  - 影响：`server/routes/orders.ts`
- 文件编码
  - UTF-8 带 BOM（推荐）
  - UTF-8 不带 BOM
  - GBK

## 测试计划
- 筛选条件和列表页一致，导出行数与列表总数一致。
- 超过上限时返回任务 id，而不是文件。

## 假设
- 只导出当前用户有权限看到的订单。
- 列顺序与列表页一致。
</proposed_plan>
