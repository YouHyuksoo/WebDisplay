# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

SOLUM MES Display 모니터링 프로그램을 PowerBuilder에서 Next.js + Tailwind CSS + React로 전환하는 프로젝트.
원본 PowerBuilder 소스는 `SOLUM MES_DISP/` 폴더에 위치 (참조용, 수정 금지).

- **원본 DB**: Oracle (멀티 프로필: 멕시코VD내부/외부, 멕시코전장내부/외부, 베트남VD내부/외부)
- **기능**: SMD/IMD 라인 기계 상태 모니터링, 생산 현황, SMT 픽업률, 품질 경고(납땜/MSL/온도), CTQ 이상점 감지
- **다국어**: 한국어/영어/스페인어/베트남어

## Tech Stack

- **Framework**: Next.js 15 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS 4
- **DB**: Oracle (oracledb) — `lib/db.ts`
- **알림**: Microsoft Teams Incoming Webhook (`lib/teams.ts`)
- **설정 저장**: `data/` 폴더 JSON 파일 (DB 불필요)

## Commands

```bash
npm run dev          # 개발 서버 (http://localhost:3000)
npm run build        # 프로덕션 빌드
npm run start        # 프로덕션 서버
npm run lint         # ESLint 검사
```

## Architecture

```
WebDisplay/
├── config/
│   └── database.json        # DB 프로필 설정 (activeProfile + profiles[])
├── data/                    # 런타임 상태 파일 (DB 대신 JSON)
│   ├── slack-settings.json  # Teams/Slack 알림 설정
│   ├── monitor-state.json   # CTQ 모니터 이전 등급 상태
│   └── cards.json           # 대시보드 카드 설정
├── SOLUM MES_DISP/          # PowerBuilder 원본 (수정 금지)
└── src/
    ├── app/
    │   ├── (menu)/          # 3D 터널 메인 메뉴
    │   ├── (display)/       # SMD/PBA/품질 모니터링 화면
    │   ├── (u1)/u1/         # U1 라인 화면
    │   ├── (mxvc)/mxvc/     # 멕시코전장 (FPY, SPC, 로그, 추적성 등)
    │   ├── (ctq)/ctq/       # CTQ 품질 대시보드
    │   ├── settings/        # DB/알림 설정 UI
    │   └── api/             # API Route Handlers
    │       ├── mxvc/        # 멕시코전장 전용 API
    │       ├── ctq/         # CTQ 품질 API
    │       ├── mexico/      # 멕시코 공통 API
    │       ├── display/     # 모니터링 화면 API
    │       └── monitor/     # CTQ 백그라운드 잡 제어 (start/stop/status/run-now)
    ├── components/
    │   ├── menu/            # 3D 터널 메뉴 컴포넌트
    │   ├── mxvc/            # 멕시코전장 전용 컴포넌트
    │   ├── ctq/             # CTQ 품질 컴포넌트
    │   ├── display/         # 공통 모니터링 컴포넌트
    │   └── ui/              # 공통 UI (Button, Modal)
    ├── lib/
    │   ├── db.ts            # Oracle 커넥션 풀 + 쿼리 헬퍼 (핵심)
    │   ├── screens.ts       # 화면 레지스트리 (Single Source of Truth)
    │   ├── teams.ts         # MS Teams 웹훅 알림
    │   ├── slack-settings.ts # 알림/설정 JSON 저장소
    │   ├── queries/         # SQL 쿼리 파일 (기능별 분리)
    │   └── monitor/         # CTQ 백그라운드 모니터 잡
    │       ├── ctq-monitor.ts   # globalThis 싱글톤 JobManager
    │       ├── ctq-checker.ts   # A등급 이상점 감지 로직
    │       └── monitor-state.ts # 상태 JSON 읽기/쓰기
    ├── hooks/               # Custom React Hooks
    └── types/               # TypeScript 타입 정의
```

## DB 접근 규칙

`lib/db.ts`에서 export하는 함수 3가지:

| 함수 | 용도 | 주의 |
|---|---|---|
| `executeQuery<T>(sql, binds)` | SELECT 전용 | autoCommit 없음 — DML에 쓰면 커밋 안 됨 |
| `executeDml(sql, binds)` | INSERT/UPDATE/DELETE | autoCommit: true 포함 |
| `executeQueryByProfile<T>(profileName, sql, binds)` | 보조 DB 인스턴스 | `멕시코전장내부` 등 다른 DB 프로필 사용 시 |

> **멕시코전장 LOG_ 테이블**은 `SVEHICLEPDB` 사이트 — 반드시 `executeQueryByProfile('멕시코전장내부', ...)` 사용.

DB 프로필은 `config/database.json`에서 관리. 설정 변경 후에는 `resetPool()` 호출 필요.

## 화면 레지스트리

`src/lib/screens.ts`의 `SCREENS` 객체가 **모든 화면의 Single Source of Truth**.
- 화면 제목(한/영/스/베)은 여기서만 관리 — i18n JSON의 screens 네임스페이스 사용 금지
- `lineFilter: true` 화면은 최초 접속 시 라인 선택 팝업 자동 표시

새 화면 추가 시 반드시 `SCREENS`에 먼저 등록.

## CTQ 백그라운드 모니터

`lib/monitor/ctq-monitor.ts` — `globalThis.__ctqMonitorJob`으로 싱글톤 관리 (Next.js 핫리로드 대응).
- `/api/monitor/start` POST → 모니터 시작 (intervalMinutes 파라미터)
- `/api/monitor/stop` POST → 모니터 중지
- `/api/monitor/status` GET → 현재 상태 조회
- `/api/monitor/run-now` POST → 즉시 1회 실행
- 이전 등급은 `data/monitor-state.json`에 저장 (서버 재시작 후에도 유지)
- Teams 알림은 `teamsEnabled + teamsWebhookUrl` 모두 설정된 경우에만 발송

## Key Conventions

- 모든 API Route는 Oracle DB 연결 풀을 공유 (`lib/db.ts`)
- 실시간 데이터 갱신: React Query 또는 SWR의 polling 패턴 사용
- 다크 모드: `dark:` 클래스 사용 시 반드시 기본값도 함께 지정
- 다국어: 서버 컴포넌트에서는 DB 번역 테이블, 클라이언트에서는 i18n 파일 사용
- 런타임 설정(알림, 모니터 상태)은 DB가 아닌 `data/*.json`에 저장

## PowerBuilder → React 매핑 규칙

| PowerBuilder | React/Next.js |
|---|---|
| Window (`.srw`) | Page 또는 Layout 컴포넌트 |
| DataWindow (`.srd`) | API Route + React 테이블/리스트 컴포넌트 |
| User Object (`.sru`) | 재사용 React 컴포넌트 또는 Custom Hook |
| Global Function (`.srf`) | `lib/` 유틸리티 함수 |
| Timer 이벤트 | `useEffect` + `setInterval` 또는 React Query `refetchInterval` |
| DataWindow SQL | API Route에서 Oracle 쿼리 실행 |

## PowerBuilder 소스 분석 도구

`powerbuilder-analyzer` 스킬 사용 가능:
```bash
python scripts/pb_analyzer.py --parse-window --source <file.srw>
python scripts/pb_analyzer.py --parse-datawindow --source <file.srd>
python scripts/pb_analyzer.py --parse-all --source-dir "SOLUM MES_DISP/" --output ./analysis/
```

## AI 챗 (메뉴 진입: 우하단 ✨ 아이콘)

- 라우트: `/ai-chat` (SCREENS 레지스트리 미등록 — 라인 필터·시프트 무관)
- 설정: `/settings/ai-models`(키 등록), `/settings/ai-personas`(어조), `/settings/ai-glossary`(용어)
- DB 접속: 메인 풀(`getPool()`) 그대로 사용. 별도 read-only 계정 없음 — 안전은 sql-guard.ts의 SELECT-only 정규식 + ROWNUM 자동 주입 + EXPLAIN PLAN 비용 가드 + executeQuery 무커밋(=DML 시도해도 자동 롤백) 3중 방어.
- API 키는 `AI_PROVIDER_SETTING.API_KEY_ENC`에 base64 저장 (운영 DB 백업에 포함되니 주의)
- 새 도메인 용어/약어는 `/settings/ai-glossary`에서 추가 → 즉시 LLM 시스템 프롬프트 반영
- 스키마 컨텍스트 갱신: `scripts/extract-schema-context.mjs`의 WHITELIST 배열을 채우고 `npm run extract-schema` → `src/lib/ai/schema-context.ts` 자동 갱신 → 커밋. 빈 배열이면 USER_TABLES/USER_VIEWS 전수 추출도 가능 (필요 시 스크립트 수정).
- 멕시코 LOG_* 테이블 등 보조 DB 사이트 조회는 `executeQueryByProfile`을 별도로 써야 하며, 현재 AI 챗은 메인 풀만 사용.
- SQL 안전: SELECT/WITH만 허용, ROWNUM ≤ 1000 자동 주입, EXPLAIN PLAN cost ≥ 1M 또는 rows ≥ 10K 시 사용자 확인
- 다중 사이트 배포: 사이트마다 activeProfile이 다르면 각 사이트 DB에 `migrations/001_ai_chat_tables.sql` 1회 실행 필요 (테이블 5개 + 시드).
