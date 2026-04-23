---
type: join-recipe
title: "날짜·작업일 축 (WORK_DATE)"
stage: sql_generation
aliases: ["WORK_DATE", "작업일", "오늘", "업무일", "F_GET_WORK_ACTUAL_DATE"]
tags: [join, date]
updated: 2026-04-18
---

### [WORK_DATE 축] 작업일 기준 정합
```sql
WHERE 테이블.WORK_DATE = F_GET_WORK_ACTUAL_DATE(SYSDATE,'A')
```
용도: "오늘" 질문에서 **달력일이 아닌 업무일** 기준. 공통 함수 사용.
