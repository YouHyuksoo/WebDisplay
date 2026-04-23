# WebDisplay Wiki — Index

## AI Chat 런타임 컨텍스트 (`wiki/ai-chat/`)

AI chat 시스템 프롬프트에 주입되는 도메인 지식. 로더: `src/lib/ai/context/md-loader.ts`.

### Identity Prompts (`identity/`)
- [sql-generation](./ai-chat/identity/sql-generation.md) — SQL 생성 단계 role 프롬프트
- [analysis](./ai-chat/identity/analysis.md) — 결과 분석·마크다운·차트 응답 규칙

### SQL Rules (`rules/`)
- [sql-writing](./ai-chat/rules/sql-writing.md) — Oracle/MES SQL 작성 규칙 10개 + 패턴 예시

### SQL Skeletons (`skeletons/`)
- [master](./ai-chat/skeletons/master.md) — 기준 정보 테이블 골격
- [aggregate](./ai-chat/skeletons/aggregate.md) — 집계/실적 테이블 골격
- [history](./ai-chat/skeletons/history.md) — 검사/이력 로그 테이블 골격

### Formulas (`formulas/`)
- [yield](./ai-chat/formulas/yield.md) — FPY, 불량률, 수율, 달성률
- [equipment](./ai-chat/formulas/equipment.md) — 가동률, OEE, MTBF
- [smt](./ai-chat/formulas/smt.md) — SPI CpK, Pickup Rate, ZOE
- [common](./ai-chat/formulas/common.md) — 공식 공통 규칙 + 약어 번역

### Join Recipes (`joins/`)
- [line](./ai-chat/joins/line.md) — LINE_CODE / LINE_CODE+SHIFT / PLANT+LINE
- [product](./ai-chat/joins/product.md) — MODEL_NO / BARCODE / BOM
- [equipment](./ai-chat/joins/equipment.md) — EQP_NO
- [datetime](./ai-chat/joins/datetime.md) — WORK_DATE
- [code-decode](./ai-chat/joins/code-decode.md) — F_GET_BASECODE / USER_ID
- [common](./ai-chat/joins/common.md) — JOIN 공통 주의사항

### Functions (`functions/`) — 핵심 함수 학습자료
- [F_GET_LINE_NAME](./ai-chat/functions/f-get-line-name.md) — 라인 코드 → 라인명 (다국어)
- [F_GET_WORK_ACTUAL_DATE](./ai-chat/functions/f-get-work-actual-date.md) — 달력일 → MES 업무일 변환
- [F_GET_BASECODE](./ai-chat/functions/f-get-basecode.md) — 범용 코드 디코더 (ISYS_BASECODE)

### Procedures (`procedures/`)
- 아직 등록된 학습자료 없음. UI 에서 등록.

### Tables (`tables/`)
- 아직 등록된 학습자료 없음. UI 에서 등록.

---

## 편집 가이드

- 규칙·스키마: [SCHEMA.md](./SCHEMA.md) 참조. 편집 후 서버 재시작(또는 loader cache invalidate) 필요.
- 변경 이력: [log.md](./log.md).
- 새 페이지 추가 시: 적절한 `type` frontmatter 필수. 인덱스(이 파일)에도 엔트리 추가.

## 일반 Knowledge Base

현재 미사용. 향후 외부 소스 인제스트 시 `concepts/`, `entities/`, `sources/`, `synthesis/` 활성화.
