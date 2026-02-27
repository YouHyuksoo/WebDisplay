# SOLUM MES Display - Design Document

## 1. Overview

PowerBuilder MES 모니터링 프로그램을 Next.js 웹 애플리케이션으로 전환.
공장 대형 모니터 전용 풀스크린 디스플레이.

## 2. Tech Stack

| Category | Choice |
|----------|--------|
| Framework | Next.js 15 (App Router) |
| Language | TypeScript |
| Styling | Tailwind CSS 4 |
| DB | Oracle (oracledb) |
| Data Fetching | SWR (polling) |
| Charts | Recharts |
| i18n | next-intl (ko/en/es) |
| Theme | next-themes (light/dark) |
| 3D/Animation | Three.js + GSAP (mydesktop 그대로) |
| Color Theme | mydesktop GLOW_THEMES 8색 그대로 |

## 3. Architecture (Approach A)

```
[Browser] → [Next.js Server Component] → [API Route] → [Oracle DB]
                                              ↑
[Browser] → [SWR Polling (interval)] ─────────┘
```

- Server Components로 초기 렌더링
- SWR로 설정 가능한 주기 폴링 (기본 30초)
- API Route에서 oracledb connection pool로 Oracle 직접 연결

## 4. Menu System = mydesktop 그대로 사용

### 4-1. 핵심 원칙

mydesktop(`C:/Project/mydesktop/`)을 **통째로** Next.js로 포팅.
변경 최소화 — 카드 클릭 시 라우팅만 Next.js로 교체.

### 4-2. mydesktop에서 그대로 가져오는 것

| Feature | Source |
|---------|--------|
| 3D 터널/워프/오로라 배경 | Three.js space modes |
| 캐러셀 + 3D 전진/후진/좌우 항해 | GSAP carousel |
| 그리드/캐러셀 레이아웃 토글 | layout toggle |
| 컬러 글로우 테마 바 (8색) | GLOW_THEMES (gold/purple/cyan/pink/green/red/blue/white) |
| 카드 스타일 (9종) | glass/rainbow/gradient/dark/neon/hermes/cyberpunk/apple/luxury |
| 앰비언트 글로우 오브 | ambient orbs |
| 클릭 이펙트 | click-effects.js |
| 설정 옵션 전부 | space mode, card style, glow theme 등 |

### 4-3. 이스터 에그 (전부 그대로)

| Easter Egg | Description |
|------------|-------------|
| 드래곤 습격 | Lottie 드래곤 → 카드 불태우기 → 피닉스 부활 |
| 까마귀 도둑 | 까마귀가 카드 물고 도망 → 클릭으로 되찾기 |
| 늑대 | 늑대 이펙트 |
| 유성 충돌 | 유성 → 화면 크랙 → 충격파 → 복구 |
| UFO & 우주인 | UFO 빔 + 문어 우주인 |
| 별 날아오기 | 금색 별 화면 횡단 |
| 고양이 발자국 | 화면에 발자국 |
| 카드 수면 | Zzz 효과 |
| 클릭 이펙트 | 클릭 파티클 |

### 4-4. 변경되는 것 (단 하나)

```
기존 mydesktop: 카드 클릭 → window.open(URL) 또는 외부 링크
MES 버전:      카드 클릭 → Next.js router.push('/display/[screenId]')
```

### 4-5. 메뉴 카드 데이터

mydesktop의 앱 바로가기 → MES 메뉴 화면 카드로 교체:

**그룹 1: Management (관리)**
| Menu ID | Screen | Window |
|---------|--------|--------|
| 12 | ASSY 생산 현황 | w_display_assy_production_status |
| 16 | 설비 로그 수집 오류 | w_display_machine_log_gather_error_list |
| 18 | 옵션 설정 | w_display_option |

**그룹 2: Monitoring (모니터링)**
| Menu ID | Screen | Window |
|---------|--------|--------|
| 21 | ASSY 기계 상태 | w_display_machine_status_assy |
| 22 | ASSY 생산량 | w_display_production_assy |
| 23 | AOI 수율 | w_display_aoi_yield |
| 24 | SMD 기계 상태 | w_display_machine_status_smd |
| 25 | SMD 생산량 | w_display_production_smd |
| 26 | 자재 투입 현황 | w_display_material_input |
| 27 | MSL 관리 | w_display_msl_mgmt |
| 28 | 설비 가동률 | w_display_machine_operation_rate |

**그룹 3: Quality (품질)**
| Menu ID | Screen | Window |
|---------|--------|--------|
| 31 | Solder Paste 관리 | w_display_solderpaste_mgmt |
| 32 | Stencil 관리 | w_display_stencil_mgmt |
| 34 | 비전 불량 | w_display_vision_defect |
| 37 | 온도 관리 | w_display_temp_mgmt |
| 38 | 습도 관리 | w_display_humidity_mgmt |

## 5. Auto-Launch (자동 실행)

```
앱 진입 → localStorage.autoLaunchScreen 확인
  ├─ 설정됨 → 해당 디스플레이 화면으로 바로 라우팅
  └─ 없음   → mydesktop 메뉴 화면 표시
```

- 설정에서 자동 실행 화면 선택 가능
- ESC 키로 메뉴로 복귀 가능

## 6. Display Screen Layout (공통 레이아웃)

### 핵심 원칙: 100vh 꽉 채움, 페이지 스크롤 절대 없음

모니터 전체를 꽉 채우는 고정 레이아웃. `html, body { overflow: hidden; height: 100vh; }`
전체 페이지 스크롤은 절대 발생하지 않으며, **데이터 영역만 내부 스크롤**.

```
┌─────────────────────────────────────────────────┐ ─┐
│  [화면 제목]              [시간] [새로고침 주기]    │  │ 고정 헤더 (h-12)
├─────────────────────────────────────────────────┤  │
│                                                 │  │
│             [ 디스플레이 콘텐츠 영역 ]              │  │ flex-1 (남은 공간 전부)
│             overflow-y: auto ← 여기만 스크롤      │  │ 데이터만 내부 스크롤
│             (자동 스크롤 / 페이지 회전)             │  │
│                                                 │  │ 100vh
├─────────────────────────────────────────────────┤  │
│  [메시지 바]                                      │  │ 고정 푸터 (h-8)
└─────────────────────────────────────────────────┘ ─┘
```

```
html, body     → h-screen overflow-hidden
layout         → h-screen flex flex-col
헤더 바        → h-12 shrink-0 (고정)
콘텐츠 영역    → flex-1 overflow-y-auto (데이터만 스크롤)
메시지 바      → h-8 shrink-0 (고정)
```

- 헤더 바: 화면 제목 + 현재 시간 + 새로고침 주기 표시
- 콘텐츠: 각 화면별 DataWindow 데이터 테이블/차트 (이 영역만 내부 스크롤)
- 메시지 바: 알림 메시지 (PB의 st_msg 역할)
- ESC 키: mydesktop 메뉴로 복귀
- 테마/글로우 색상: 메뉴에서 선택한 것 그대로 적용

## 7. Priority Screen: SMD Machine Status (Menu 24)

### DataWindows
- `dw_1` → `d_display_machine_status_check_items_smd` (점검 항목)
- `dw_2` → `d_display_machine_status_es` (기계 상태)

### API Endpoint
```
GET /api/display/machine-status-smd
  → Query: organization_id, language
  → Response: { checkItems: [...], machineStatus: [...] }
```

### Auto-scroll
- PB의 `Gvi_scroll_timer` 패턴 유지
- 설정 가능한 스크롤 간격 (기본 5초)
- 데이터가 화면 초과 시 페이지 단위 자동 스크롤

## 8. API & DB Layer

### Connection Pool
```typescript
// lib/db.ts
oracledb.createPool({
  user, password, connectString,
  poolMin: 2, poolMax: 10, poolIncrement: 1
})
```

### API Route Pattern
```
/api/display/[screenId]
  → connection pool에서 connection 획득
  → SQL 실행 (PB DataWindow SQL 재사용)
  → JSON 응답
  → connection 반환
```

### Error Handling
- DB 연결 실패 → 마지막 성공 데이터 캐시 표시 + 재연결 시도
- 타임아웃 → 기본 30초, 설정 가능

## 9. i18n (next-intl)

- 지원 언어: ko (한국어), en (English), es (Español)
- PB `Gvs_language` → next-intl locale
- DB `ISYS_DUAL_LANGUAGE` 테이블 활용
- 메뉴/UI 라벨 + 디스플레이 컬럼 헤더 번역

## 10. Theme System

### Light/Dark Mode
- `next-themes` 사용
- 메뉴(mydesktop)와 디스플레이 화면 모두 적용
- 다크 모드 기본값 (공장 모니터 특성상)

### Glow Color Theme
- mydesktop GLOW_THEMES 8색 그대로 사용
- CSS 변수 기반: `--glow-primary`, `--glow-secondary`, `--glow-orb`
- 메뉴 + 디스플레이 화면 액센트 컬러로 적용

| Theme | Primary | Secondary |
|-------|---------|-----------|
| Gold | #ffd700 | #ff8c00 |
| Purple | #a855f7 | #6366f1 |
| Cyan | #06b6d4 | #0ea5e9 |
| Pink | #ec4899 | #f43f5e |
| Green | #10b981 | #22c55e |
| Red | #ef4444 | #f97316 |
| Blue | #3b82f6 | #6366f1 |
| White | #e2e8f0 | #94a3b8 |

## 11. Routing Structure

```
/                           → 메인 (auto-launch or mydesktop 메뉴)
/display/[screenId]         → 각 디스플레이 화면
```

screenId = menu ID (12, 16, 18, 21~28, 31, 32, 34, 37, 38)

## 12. Folder Structure

```
src/
├── app/
│   ├── layout.tsx              # Root layout (theme, i18n, glow provider)
│   ├── page.tsx                # 메인 = mydesktop 메뉴
│   ├── display/
│   │   └── [screenId]/
│   │       └── page.tsx        # 디스플레이 화면 (공통 레이아웃)
│   └── api/
│       └── display/
│           └── [screenId]/
│               └── route.ts    # API endpoint
├── components/
│   ├── menu/                   # mydesktop 포팅 (Three.js, carousel, cards...)
│   ├── display/                # 디스플레이 공통 (header, table, message bar)
│   └── ui/                     # 공통 UI
├── lib/
│   ├── db.ts                   # Oracle connection pool
│   ├── queries/                # SQL queries (PB DataWindow 기반)
│   └── config.ts               # 설정
├── hooks/
│   ├── useAutoRefresh.ts       # SWR polling hook
│   └── useAutoScroll.ts        # 자동 스크롤 hook
├── i18n/
│   ├── ko.json
│   ├── en.json
│   └── es.json
└── styles/
    ├── glow-themes.css         # mydesktop 글로우 테마 CSS
    └── effects/                # mydesktop 이스터에그 CSS
```
