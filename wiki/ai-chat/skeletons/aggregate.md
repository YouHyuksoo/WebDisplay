---
type: skeleton
title: "aggregate 카테고리 SQL 골격"
stage: sql_generation
tags: [skeleton, aggregate]
updated: 2026-04-18
---

## 2) aggregate — 집계/실적 (일·시간 집계, 생산·품질 실적)
기간 필터 필수. 축(라인·시프트·모델) 기준 GROUP BY + 집계함수.
```sql
SELECT 축컬럼1, 축컬럼2,
       SUM(측정컬럼) AS 합계,
       COUNT(*)       AS 건수
  FROM 집계테이블
 WHERE 기간컬럼 BETWEEN :from AND :to
   AND (선택 필터: 라인/모델/시프트)
 GROUP BY 축컬럼1, 축컬럼2
 ORDER BY 축컬럼1
```
