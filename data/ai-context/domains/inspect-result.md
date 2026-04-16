---
name: inspect-result
description: 검사 결과 — AOI/ICT/EOL/SPI 공정별 검사 결과 조회
tables: [LOG_AOI, LOG_ICT, LOG_EOL, LOG_SPI, IQ_MACHINE_INSPECT_RESULT]
---

## 업무 설명
검사 로그를 공정/라인/시간 조건으로 조회하고 PASS/FAIL 분포를 분석한다.

## 핵심 흐름
1. 테이블별 시간 컬럼과 결과 컬럼 정규화
2. 공정 코드/라인 코드 필터
3. 결과 집계 및 상세 drill-down 제공
