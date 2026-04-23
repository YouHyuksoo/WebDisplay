---
type: join-recipe
title: "라인 축 JOIN 레시피"
stage: sql_generation
aliases: ["LINE_CODE", "라인", "라인코드", "SHIFT_CODE", "시프트", "PLANT_CODE", "공장"]
tables: [IP_PRODUCT_LINE_TARGET, IP_PRODUCT_WORKSTAGE_IO]
tags: [join, line, shift, plant]
updated: 2026-04-18
---

### [LINE_CODE 축] 라인 기준 실적·설정 연결
```sql
FROM IP_PRODUCT_LINE_TARGET t
  LEFT JOIN IP_PRODUCT_WORKSTAGE_IO io
    ON t.LINE_CODE = io.LINE_CODE
   AND t.PLAN_DATE = io.ACTUAL_DATE
```
용도: 계획(target) ↔ 실적(io) 달성률 계산.

### [LINE_CODE + SHIFT 축] 라인·시프트별 비교
```sql
ON a.LINE_CODE = b.LINE_CODE
AND NVL(a.SHIFT_CODE,'X') = NVL(b.SHIFT_CODE,'X')
AND a.WORK_DATE = b.WORK_DATE
```
용도: 시프트 A/B/C 비교 — NULL 시프트 값 때문에 NVL 필수.

### [PLANT + LINE 축] 공장·라인 복합 키
```sql
ON a.PLANT_CODE = b.PLANT_CODE
AND a.LINE_CODE = b.LINE_CODE
```
용도: 다중 공장 환경에서 라인은 **PLANT + LINE** 복합 키.
