---
name: fpy
description: First Pass Yield(1차 양품률) 분석
tables: [LOG_AOI, LOG_ICT, LOG_EOL, LOG_SPI, LOG_COATINGVISION, LOG_DOWNLOAD]
---

## 업무 설명
설비별 로그 테이블에서 PASS/FAIL 집계를 계산해 시간대별 FPY를 제공한다.

## 핵심 흐름
1. 대상 테이블별 결과 컬럼/바코드 컬럼 설정
2. 시간 조건(work day 또는 사용자 범위) 적용
3. groupedFpy 테이블은 바코드 단위 최종 PASS 판정
4. hourly/day bucket으로 집계
