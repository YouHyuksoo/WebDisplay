---
type: join-recipe
title: "설비 축 JOIN 레시피 (EQP_NO)"
stage: sql_generation
aliases: ["EQP_NO", "설비", "설비번호", "equipment"]
tables: [IM_FACT_EQUIPMENT]
tags: [join, equipment]
updated: 2026-04-18
---

### [EQP_NO 축] 설비 기준 조회
```sql
FROM 설비로그 l
  JOIN IM_FACT_EQUIPMENT e
    ON l.EQP_NO = e.EQP_NO
```
용도: 설비명·라인 소속·타입을 로그에 붙일 때.
