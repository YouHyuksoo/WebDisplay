---
type: formula
title: "SMT 공정 특화 공식"
stage: sql_generation
aliases: ["SPI", "CpK", "Cpk", "pickup rate", "SMT 픽업률", "픽업률", "ZOE", "LOG_SPI"]
tables: [LOG_SPI, LOG_SPI_VD, LOG_AOI]
tags: [formula, smt, spi]
updated: 2026-04-18
---

## SMT 공정 특화
- **SPI CpK** — 측정 테이블에 CPK_VALUE 컬럼이 존재하면 직접 사용. 집계 시:
  `AVG(CPK_VALUE)`    -- CpK는 평균이 의미 있는 지표
- **Pickup Rate (SMT 픽업률)**
  `ROUND(SUM(PICKUP_OK) / NULLIF(SUM(PICKUP_OK + PICKUP_NG), 0) * 100, 2)`
- **SPI 불량 (LOG_SPI 기반, ZOE_FLAG 기준)**
  `SUM(CASE WHEN ZOE_FLAG = 'Y' THEN 1 ELSE 0 END)`
