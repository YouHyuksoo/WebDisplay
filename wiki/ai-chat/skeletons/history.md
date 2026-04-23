---
type: skeleton
title: "history 카테고리 SQL 골격"
stage: sql_generation
tags: [skeleton, history, log]
updated: 2026-04-18
---

## 3) history — 검사/이력 로그 (LOG_*, INSP_*, 바코드 단위)
키(BARCODE/MODEL_NO/EQP_NO) 기반. 최신 순 정렬 또는 공정 순 조회.
```sql
-- 키 기반 이력 조회
SELECT *
  FROM 이력테이블
 WHERE 키컬럼 = :키값
 ORDER BY 시각컬럼 DESC
 FETCH FIRST 100 ROWS ONLY

-- 최신 1건만 (윈도우 함수)
SELECT *
  FROM (
    SELECT h.*,
           ROW_NUMBER() OVER (PARTITION BY 키컬럼 ORDER BY 시각컬럼 DESC) AS rn
      FROM 이력테이블 h
     WHERE 시각컬럼 BETWEEN :from AND :to
  )
 WHERE rn = 1
```

## 미지정(category 없음) 테이블
스키마(컬럼명·타입·코멘트)로 성격을 추정하되, 확신이 낮으면 질문자에게 의도를
한 줄로 확인하세요. (예: "최신 1건만 필요한가요, 기간 전체 합계인가요?")
