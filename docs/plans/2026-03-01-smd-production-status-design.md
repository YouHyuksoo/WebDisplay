# SMD Production Status 컴포넌트 분리 설계

## 개요

메뉴 24 (Production Status SMD) 화면을 상단 그리드 + 하단 점검 항목으로 분리하여
재사용 가능한 구조로 리팩터링한다.

## 결정 사항

- **범위**: SMD 전용, 구조만 분리 (추후 확장 가능)
- **디자인**: 현대적 다크 UI (PB 원본 충실 재현 아님)
- **스크롤**: 상단+하단 전체 화면 스크롤 (useAutoScroll)
- **그리드 행**: 멀티라인 지원 (메인행 + 서브행)
- **용도**: TV 모니터링 전용 (대형 폰트, 읽기 전용, 자동 갱신)

## 컴포넌트 구조

```
src/components/display/screens/smd-status/
  ├── SmdProductionStatus.tsx   # 메인 조합 (~80줄)
  ├── SmdStatusGrid.tsx         # 상단 그리드 (~180줄)
  └── SmdCheckItems.tsx         # 하단 점검 항목 (~150줄)
```

### SmdProductionStatus.tsx (메인)

- SWR polling으로 `/api/display/24` 데이터 fetching
- DisplayLayout 래핑 (헤더, 메시지바)
- useAutoScroll로 전체 영역 자동 스크롤
- SmdStatusGrid + SmdCheckItems에 데이터 전달

### SmdStatusGrid.tsx (상단 그리드)

멀티라인 그리드. 각 라인(S01~S06)의 생산현황을 표시.

**행 구조 (2줄 이상):**

| 메인행 | 상태 | 라인 | 모델명 | Step | 계획일자 | 제조번호 | 계획 | 실적 | 비율 |
|--------|------|------|--------|------|----------|----------|------|------|------|
| 서브행 | LCR상태 | WAIT정보 | AOI상태 | Start Time | AOI Time | 날짜 | | | |

**스타일:**
- 상태 뱃지: 정상=초록, 정지=노랑
- Step 값: 가동 중이면 컬러 강조
- 큰 폰트 (TV 가독성)
- 서브행은 작은 폰트로 보조 정보

### SmdCheckItems.tsx (하단 점검 항목)

매트릭스 테이블. 행=점검항목, 열=라인.

**점검 항목:**
메탈마스크, 스퀴지, Solder/Epoxy, First Check, 풀체크, Master Check, 프로파일검사

**스타일:**
- OK = 초록 배경
- NG = 빨강 배경 + 깜박임(animate-pulse)
- 비활성 라인 = 회색
- 각 셀에 상태 뱃지 + 값 텍스트

## 데이터 흐름

```
API GET /api/display/24?orgId=1
  → { machineStatus: [...], checkItems: [...] }

SmdProductionStatus
  ├── useSWR('/api/display/24') → data
  ├── SmdStatusGrid rows={data.machineStatus}
  └── SmdCheckItems rows={data.checkItems}
```

## 기존 코드 처리

- `MachineStatusSmd.tsx` → 삭제 (SmdProductionStatus로 대체)
- `CheckItemsCards.tsx` → SmdCheckItems가 이 역할을 흡수
- `screens.ts` → screenId=24 매핑을 새 컴포넌트로 변경
