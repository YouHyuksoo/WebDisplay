---
type: formula
title: "설비 효율 지표 공식"
stage: sql_generation
aliases: ["가동률", "operation rate", "가용률", "uptime", "OEE", "overall equipment effectiveness", "MTBF", "mean time between failures"]
tags: [formula, equipment, oee]
updated: 2026-04-18
---

## 설비 효율 지표
- **가동률 (Operation Rate)**
  `ROUND(SUM(RUN_TIME) / NULLIF(SUM(TOTAL_TIME), 0) * 100, 2)`
- **OEE (Overall Equipment Effectiveness)**
  `ROUND(가동률 * 성능가동률 * 양품률 / 10000, 2)`   -- 3개 인자 각각 0~100 입력 기준
- **MTBF (Mean Time Between Failures, 시간)**
  `ROUND(SUM(RUN_TIME) / NULLIF(COUNT(고장건), 0) / 60, 2)`   -- 분 → 시간
