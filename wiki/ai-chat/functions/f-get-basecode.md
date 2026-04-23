---
object: F_GET_BASECODE
kind: function
returns: VARCHAR2
args:
  - { name: P_CODE_TYPE, type: VARCHAR2, mode: IN }
  - { name: P_CODE_NAME, type: VARCHAR2, mode: IN }
  - { name: P_LANG, type: VARCHAR2, mode: IN }
  - { name: P_ORG, type: NUMBER, mode: IN }
enabled: true
tags: [디코딩, 코드, 기준정보]
updated: 2026-04-18
---

## 개요
`ISYS_BASECODE` 의 범용 코드 디코더. 코드 타입(`'LINE CODE'`, `'LOCATION CODE'` 등)과 코드 값을
받아 다국어 이름으로 변환.

## 용도
- 모든 코드성 컬럼(예: `LOCATION_CODE`, `STATUS_CODE`, `BAD_CAUSE_BY`)을 **사람이 읽을 수 있는 한글/영문 이름**으로 변환.
- 컬럼명에서 `_` 를 공백으로 치환한 값이 `P_CODE_TYPE`. 예: `LOCATION_CODE` → `'LOCATION CODE'`.

## 사용법
```sql
-- 위치 코드 디코딩
SELECT F_GET_BASECODE('LOCATION CODE', t.LOCATION_CODE, 'KO', 1) AS "위치명"
  FROM 테이블 t;

-- 언어별 — 'KO', 'EN', 'ES', 'VN'
SELECT F_GET_BASECODE('BAD CAUSE BY', b.BAD_CAUSE_BY, 'KO', 1) AS "불량 원인"
  FROM IP_PRODUCT_WORK_QC b;
```

## 주의
- **`P_CODE_TYPE` 은 공백 포함 문자열**. 컬럼명 그대로 넣지 말고 `_` → 공백 치환 필요.
- `P_LANG` 은 문자열 (`'KO'`) — `F_GET_LINE_NAME` 의 숫자 인자와 다름.
- `P_ORG = 1` 이 대부분 (다중 법인 환경 기본).
- 등록되지 않은 코드면 NULL — `NVL(..., P_CODE_NAME)` 로 fallback 권장.
