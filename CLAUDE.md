# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

SOLUM MES Display 모니터링 프로그램을 PowerBuilder에서 Next.js + Tailwind CSS + React로 전환하는 프로젝트.
원본 PowerBuilder 소스는 `SOLUM MES_DISP/` 폴더에 위치.

### 원본 시스템 특성
- **DB**: Oracle (XE/SOLUM, 사용자: ADMIN)
- **기능**: SMD/IMD 라인 기계 상태 모니터링, 생산 현황, SMT 픽업률, 품질 경고(납땜/MSL/온도)
- **다국어**: 한국어/영어/중국어 (ISYS_DUAL_LANGUAGE 테이블)
- **듀얼 모니터** 지원, 자동 갱신(스크롤 간격 300ms)

## Tech Stack

- **Framework**: Next.js 15 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS 4
- **DB**: Oracle (oracledb)
- **Charts**: 추후 결정 (recharts 또는 chart.js)

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
├── SOLUM MES_DISP/          # PowerBuilder 원본 소스 (참조용, 수정 금지)
│   ├── *.srw                # Window (화면 정의)
│   ├── *.srd                # DataWindow (데이터 조회/SQL)
│   ├── *.sru                # User Object (재사용 컴포넌트)
│   ├── *.srf                # Global Function
│   └── *.ini                # 설정 (DB, 화면옵션, 메시지)
├── src/
│   ├── app/                 # Next.js App Router 페이지
│   │   ├── (auth)/          # 로그인 관련
│   │   ├── (dashboard)/     # 대시보드 레이아웃 그룹
│   │   ├── api/             # API Route Handlers (Oracle 쿼리)
│   │   └── layout.tsx       # 루트 레이아웃
│   ├── components/          # React 컴포넌트
│   │   ├── ui/              # 공통 UI (버튼, 테이블, 모달)
│   │   ├── charts/          # 차트/그래프 컴포넌트
│   │   └── display/         # 모니터링 전용 디스플레이 컴포넌트
│   ├── lib/                 # 유틸리티, DB 연결, 헬퍼
│   ├── hooks/               # Custom React Hooks
│   ├── types/               # TypeScript 타입 정의
│   └── i18n/                # 다국어 (ko, en, zh)
└── public/                  # 정적 파일
```

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

## Key Conventions

- 모든 API Route는 Oracle DB 연결 풀을 공유 (`lib/db.ts`)
- 실시간 데이터 갱신: React Query 또는 SWR의 polling 패턴 사용
- 다크 모드: `dark:` 클래스 사용 시 반드시 기본값도 함께 지정
- 다국어: 서버 컴포넌트에서는 DB 번역 테이블, 클라이언트에서는 i18n 파일 사용
