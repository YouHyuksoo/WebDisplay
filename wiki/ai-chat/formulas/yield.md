---
type: formula
title: "수율/품질 지표 공식"
stage: sql_generation
aliases: ["FPY", "first pass yield", "양품률", "초기양품률", "직행율", "불량률", "defect", "defect rate", "수율", "yield", "pass rate", "달성률", "목표달성", "achievement"]
tags: [formula, yield, quality]
updated: 2026-04-18
---

## 수율/품질 지표
- **FPY (First Pass Yield, 초기 양품률)**
  `ROUND(SUM(GOOD_QTY) / NULLIF(SUM(INPUT_QTY), 0) * 100, 2)`
- **불량률 (Defect Rate)**
  `ROUND(SUM(BAD_QTY) / NULLIF(SUM(TOTAL_QTY), 0) * 100, 2)`
- **수율 (Yield)**
  `ROUND(SUM(OUT_QTY) / NULLIF(SUM(IN_QTY), 0) * 100, 2)`
- **달성률 (Achievement Rate)**
  `ROUND(SUM(ACTUAL_QTY) / NULLIF(SUM(PLAN_QTY), 0) * 100, 2)`
