# SMD Production Status 컴포넌트 분리 구현 계획

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** 기존 MachineStatusSmd.tsx를 3개 파일(메인 + 상단그리드 + 하단체크항목)로 분리하여 구조를 개선한다.

**Architecture:** SmdProductionStatus(메인)가 SWR로 데이터를 가져오고, SmdStatusGrid(상단)와 SmdCheckItems(하단)에 props로 전달. 전체 영역이 useAutoScroll로 자동 스크롤. DisplayLayout이 100vh 프레임 제공.

**Tech Stack:** Next.js 15, TypeScript, Tailwind CSS 4, SWR, next-intl

---

## Task 1: SmdStatusGrid 컴포넌트 생성

**Files:**
- Create: `src/components/display/screens/smd-status/SmdStatusGrid.tsx`

**Step 1: 폴더 생성**

```bash
mkdir -p src/components/display/screens/smd-status
```

**Step 2: SmdStatusGrid.tsx 작성**

멀티라인 그리드 컴포넌트. 각 라인(S01~S06)의 생산현황을 메인행+서브행으로 표시.

```tsx
/**
 * @file SmdStatusGrid.tsx
 * @description SMD 생산현황 상단 그리드. 라인별 상태를 멀티라인(메인행+서브행)으로 표시.
 * 초보자 가이드: 각 라인의 상태/모델/Step/계획/실적 등을 2줄 이상으로 보여주는 TV 모니터링용 테이블.
 */
```

**핵심 구현 사항:**
- Props: `rows: MachineStatusRow[]` (타입 정의 포함)
- 메인행 컬럼: 상태, 라인, 모델명, Step, 계획일자, 제조번호, 계획, 실적, 비율
- 서브행 컬럼: LCR 상태, WAIT 정보, AOI 상태, Start Time, AOI Time
- 상태 뱃지: `line_status_name` 기반 색상 (정상=emerald, 정지=amber)
- Step 값: `use_rate` 기반 컬러 강조
- TV 가독성: text-lg ~ text-2xl 수준 폰트
- 현대적 다크 UI: zinc 계열, rounded, subtle borders
- `StatusBadge`와 `formatNumber`는 `DataBadges.tsx`에서 import

**Step 3: 빌드 확인**

```bash
npm run build
```

---

## Task 2: SmdCheckItems 컴포넌트 생성

**Files:**
- Create: `src/components/display/screens/smd-status/SmdCheckItems.tsx`

**Step 1: SmdCheckItems.tsx 작성**

기존 `CheckItemsCards.tsx`의 로직을 기반으로 하되, 현대적 다크 UI로 재구현.

```tsx
/**
 * @file SmdCheckItems.tsx
 * @description SMD 점검 항목 하단 테이블. 행=점검항목, 열=라인 매트릭스.
 * 초보자 가이드: 메탈마스크/스퀴지/Solder 등 각 점검 항목의 OK/NG 상태를 라인별로 보여준다.
 */
```

**핵심 구현 사항:**
- Props: `rows: CheckItemRow[]` (타입 정의 포함)
- 매트릭스 구조: 행=7개 점검항목, 열=라인(S01~S06)
- 점검 항목: 메탈마스크, 스퀴지, Solder/Epoxy, First Check, 풀체크, Master Check, 프로파일검사
- OK = emerald 계열, NG = red + animate-pulse
- 비활성 라인(데이터 없음) = zinc/회색 처리
- 각 셀: 상태 뱃지(OK/NG) + 값 텍스트(날짜, 코드 등)
- NG가 있는 라인 헤더는 빨강 강조
- 현대적 다크 UI 스타일
- `useTranslations('display')` 다국어 지원

**Step 2: 빌드 확인**

```bash
npm run build
```

---

## Task 3: SmdProductionStatus 메인 컴포넌트 생성

**Files:**
- Create: `src/components/display/screens/smd-status/SmdProductionStatus.tsx`

**Step 1: SmdProductionStatus.tsx 작성**

```tsx
/**
 * @file SmdProductionStatus.tsx
 * @description SMD 생산현황 메인 화면 (메뉴 24). SWR polling + 자동 스크롤.
 * 초보자 가이드: 데이터를 SWR로 가져와서 상단(SmdStatusGrid) + 하단(SmdCheckItems)에 전달.
 */
```

**핵심 구현 사항:**
- SWR로 `/api/display/24?orgId=1` polling (refreshInterval prop)
- DisplayLayout 래핑 (title, screenId)
- useAutoScroll로 전체 콘텐츠 영역 자동 스크롤
- 로딩/에러 상태 처리
- SmdStatusGrid에 `machineStatus` 전달
- SmdCheckItems에 `checkItems` 전달
- Props: `{ screenId: string; refreshInterval?: number }`

**Step 2: 빌드 확인**

```bash
npm run build
```

---

## Task 4: 라우트 연결 및 기존 코드 정리

**Files:**
- Modify: `src/app/(display)/display/[screenId]/page.tsx:11,23-24` — import 및 컴포넌트 교체
- Delete: `src/components/display/screens/MachineStatusSmd.tsx` — SmdProductionStatus로 대체

**Step 1: page.tsx에서 import 변경**

```tsx
// Before:
import MachineStatusSmd from '@/components/display/screens/MachineStatusSmd';

// After:
import SmdProductionStatus from '@/components/display/screens/smd-status/SmdProductionStatus';
```

**Step 2: page.tsx에서 컴포넌트 교체**

```tsx
// Before:
if (screenId === '24') {
  return <MachineStatusSmd screenId={screenId} />;
}

// After:
if (screenId === '24') {
  return <SmdProductionStatus screenId={screenId} />;
}
```

**Step 3: MachineStatusSmd.tsx 삭제**

```bash
rm src/components/display/screens/MachineStatusSmd.tsx
```

**Step 4: 빌드 확인**

```bash
npm run build
```

**Step 5: 커밋**

```bash
git add src/components/display/screens/smd-status/
git add src/app/\(display\)/display/\[screenId\]/page.tsx
git rm src/components/display/screens/MachineStatusSmd.tsx
git commit -m "refactor: split SMD Production Status into 3 components (grid + check items + main)"
```

---

## Task 5: CheckItemsCards.tsx 정리

**Files:**
- Check: `src/components/display/shared/CheckItemsCards.tsx` — 다른 곳에서 사용하는지 확인

**Step 1: 사용처 확인**

```bash
grep -r "CheckItemsCards" src/ --include="*.tsx" --include="*.ts"
```

**Step 2: 미사용 시 삭제 또는 유지**

- 다른 화면에서 사용 중이면 유지
- 미사용이면 삭제하고 커밋

---

## 파일 크기 예상

| 파일 | 예상 줄 수 | 제한 |
|------|-----------|------|
| SmdProductionStatus.tsx | ~70줄 | 300줄 (페이지) |
| SmdStatusGrid.tsx | ~160줄 | 200줄 (컴포넌트) |
| SmdCheckItems.tsx | ~140줄 | 200줄 (컴포넌트) |

## 의존성 관계

```
Task 1 (SmdStatusGrid) ──┐
                          ├── Task 3 (SmdProductionStatus) → Task 4 (라우트 연결) → Task 5 (정리)
Task 2 (SmdCheckItems) ──┘
```

Task 1과 Task 2는 병렬 진행 가능.
