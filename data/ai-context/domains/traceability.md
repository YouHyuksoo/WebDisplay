---
name: traceability
description: 바코드(PID/SERIAL_NO) 기반 제품 추적성 분석 — 공정 타임라인/자재 이력
tables: [IP_PRODUCT_2D_BARCODE, IP_PRODUCT_RUN_CARD, IP_PRODUCT_MODEL_MASTER, IP_PRODUCT_WORK_QC, IP_PRODUCT_WORKSTAGE_IO, LOG_AOI, LOG_ICT, LOG_EOL, LOG_SPI, LOG_COATINGVISION, LOG_LCR, LOG_DOWNLOAD]
---

## 업무 설명
제품 바코드를 입력하면 마스터 정보 + 공정 이벤트를 시간순으로 반환한다.

## 핵심 흐름
1. 바코드로 IP_PRODUCT_2D_BARCODE에서 RUN_NO 조회
2. RUN_NO로 IP_PRODUCT_RUN_CARD 조회
3. MODEL_NAME으로 IP_PRODUCT_MODEL_MASTER 조회
4. LOG_* 이벤트를 바코드 컬럼 매칭으로 병렬 조회
5. WORK_QC/WORKSTAGE_IO 이벤트 포함
6. timestamp 기준 오름차순 정렬

## 주의사항
- LOG 테이블마다 바코드 컬럼명이 다름
- LOG_ALARM/LOG_ERROR/LOG_MOUNTER/LOG_PROCESS는 제외
- REFLOW는 바코드가 없어 AOI 시각 윈도우로 별도 조회
