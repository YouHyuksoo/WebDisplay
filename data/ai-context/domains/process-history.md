---
name: process-history
description: 공정통과이력 — PID별 각 공정 통과 여부 피벗 조회
tables: [IQ_MACHINE_INSPECT_RESULT]
---

## 업무 설명
날짜 범위와 PID 조건으로 검사이력을 조회하고, PID 행 + WORKSTAGE 열 형태로 피벗한다.

## 핵심 쿼리 패턴
- INSPECT_DATE 문자열 범위 비교
- IS_LAST(Y/N/all) 필터
- PID 부분일치 필터

## 주의사항
- INSPECT_DATE가 VARCHAR2이므로 형식 일관성 전제
- 서버 측 피벗 처리(동적 PIVOT 미사용)
