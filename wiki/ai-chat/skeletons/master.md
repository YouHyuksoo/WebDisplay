---
type: skeleton
title: "master 카테고리 SQL 골격"
stage: sql_generation
tags: [skeleton, master]
updated: 2026-04-18
---

## 1) master — 기준 정보 (라인·모델·설비·사용자·코드 사전)
변화 적고 참조 대상. 단건 조회 또는 LIKE 검색 중심.
```sql
-- 단건/조건 조회
SELECT 컬럼목록
  FROM 마스터테이블
 WHERE 키컬럼 = :키값
   AND USE_YN = 'Y'        -- 일반적으로 사용 여부 필터
```
