---
name: spc
description: SPC 관리도 — 통계적 공정 관리
tables: [LOG_EOL]
---

## 업무 설명
LOG_EOL 측정값(MEAS_2 등) 기반 Xbar-R/관리한계(UCL/LCL) 분석.

## 핵심 흐름
1. 모델/항목 필터
2. 유효 숫자값 정제(REGEXP_LIKE)
3. 샘플링 그룹별 통계 계산
4. 이상점(outlier) 탐지
