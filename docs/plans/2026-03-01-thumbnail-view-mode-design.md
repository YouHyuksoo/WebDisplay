# 썸네일 보기 모드 디자인

## 목표

메뉴의 카드 레이아웃에 **thumbnail** 모드를 추가하여, 사용자가 등록한 스크린샷 이미지로 각 디스플레이 화면을 미리 볼 수 있게 한다.

## 아키텍처

- **보기 모드 순환**: `grid → carousel → thumbnail → grid`
- **이미지 저장**: 사용자가 직접 캡처한 스크린샷을 업로드 → 서버 API가 `/public/thumbnails/{screenId}.png`에 저장
- **DB 부담 없음**: 정적 이미지 파일만 사용, DB 조회 없음

## 카드 레이아웃

```
┌──────────────────────────────────────────┐
│            ★ PRODUCTION  생산             │
│                                          │
│  ┌───────────────┐  ┌───────────────┐    │
│  │ ░░░░░░░░░░░░░ │  │ ░░░░░░░░░░░░░ │    │
│  │ ░ 스크린샷   ░ │  │ ░ 스크린샷   ░ │    │
│  │ ░ 이미지     ░ │  │ ░ 이미지     ░ │    │
│  │ ░░░░░░░░░░░░░ │  │ ░░░░░░░░░░░░░ │    │
│  │ SMD 생산현황   │  │ MSL 경고목록   │    │
│  └───────────────┘  └───────────────┘    │
│  ┌───────────────┐  ┌───────────────┐    │
│  │  [이미지 등록] │  │ ░ 스크린샷   ░ │    │
│  │  미등록 상태   │  │ ░░░░░░░░░░░░░ │    │
│  │ 픽업률 현황    │  │ 온도/습도      │    │
│  └───────────────┘  └───────────────┘    │
└──────────────────────────────────────────┘
```

- **카드 크기**: 320×200px, 2열 그리드
- **구성**: 상단 이미지 영역 (~160px) + 하단 제목 (~40px)
- **스크롤**: 카드가 많으면 세로 스크롤

## 카드 상태

| 상태 | 표시 |
|------|------|
| 이미지 미등록 | 스켈레톤 배경 + "이미지 등록" 버튼 |
| 이미지 등록됨 | 스크린샷 이미지 + 제목 |
| 호버 시 (등록됨) | 반투명 오버레이 + "이미지 변경" 버튼 |

## 클릭 동작

- **카드 클릭**: 기존과 동일 — `window.open(url)` 로 새 창에서 디스플레이 화면 열기
- **이미지 등록/변경 버튼 클릭**: 파일 선택 다이얼로그 → 이미지 업로드

## API 설계

### POST `/api/thumbnails`

스크린샷 이미지 업로드.

- **Request**: `multipart/form-data`
  - `screenId`: string (예: "24")
  - `file`: 이미지 파일 (png/jpg/webp)
- **Response**: `{ success: true, path: "/thumbnails/24.png" }`
- **동작**: 이미지를 리사이즈(640×400) 후 `/public/thumbnails/{screenId}.png`로 저장

### GET `/thumbnails/{screenId}.png`

Next.js static file serving으로 자동 제공 (API 불필요).

## 파일 변경 목록

### 신규 파일
- `src/app/api/thumbnails/route.ts` — 이미지 업로드 API
- `src/styles/menu/components-thumbnail.css` — 썸네일 카드 스타일
- `public/thumbnails/` — 스크린샷 이미지 저장 디렉토리

### 수정 파일
- `src/lib/menu/types.ts` — `cardLayout`에 `'thumbnail'` 타입 추가
- `src/lib/menu/cards.ts` — `renderCards()`에 thumbnail 분기 추가
- `src/lib/menu/carousel.ts` — `changeCardLayout()`에 thumbnail 처리
- `src/lib/menu/handlers/index.ts` — 레이아웃 토글 3단 순환, 이미지 업로드 핸들러
- `src/components/menu/MenuControls.tsx` — 토글 버튼에 thumbnail 아이콘 추가
- `src/styles/menu/components-cards.css` — thumbnail-layout 클래스
- `src/app/(menu)/menu-theme.css` — thumbnail CSS import 추가

## 설정 저장

- `state.cardLayout = 'thumbnail'` → `saveSettings()` → localStorage
- 다음 접속 시 `loadSettings()`로 복원
