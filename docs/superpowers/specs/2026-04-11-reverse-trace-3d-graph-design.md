# 멕시코전장 역추적 3D 시각화 — 설계 문서

**날짜**: 2026-04-11
**대상 페이지**: `/mxvc/reverse-trace`
**목적**: 자재릴(ReelCd) 중심 5단계(입고/출고/릴투입/릴교환/PCB) 관계를 3D Force-Directed 그래프로 시각화

---

## 1. 결정 사항 요약

| 항목 | 선택 | 사유 |
|------|------|------|
| **시각 형태** | Force-Directed 3D | 릴 중심 허브-스포크 구조에 적합, 인터랙티브 |
| **노드 단위** | 하이브리드 (카테고리 + 드릴다운) | 초기 6노드로 간결, 드릴 시 세부 표시 |
| **시각 구분** | 색상 + 크기 + 아이콘 텍스처 | 최대 정보량, 크게보기 모드 확보 |
| **엣지 효과** | 파티클 애니메이션 | 공정 흐름의 방향성 시각화 |
| **클릭 동작** | 카테고리 펼침 + 엔티티 하이라이트 | 두 상호작용 모두 활용 |
| **기술 스택** | react-force-graph-3d + Bloom 후처리 | 빠른 구현 + 시네마틱 연출 |

---

## 2. 전체 레이아웃

```
┌────────────── 역추적 페이지 ─────────────────────────┐
│ [상단 바: ReelCd 입력 / 조회 / 요약 건수]            │
├──────────────────────────────────┬───────────────────┤
│                                   │                   │
│  좌측 (기본 70%, 리사이즈 가능)   │  우측 (기본 30%)  │
│  - 입고이력 그리드                 │  [🗖 최대화]     │
│  - 출고이력 그리드                 │                   │
│  - 릴 투입이력 그리드              │  3D Force-Graph   │
│  - 릴교환이력 그리드               │  (Bloom 효과)     │
│  - 사용된 PCB 그리드               │                   │
│                                   │                   │
└──────────────────────────────────┴───────────────────┘
```

- **좌우 분할**: 기본 70:30, 드래그 가능한 세로 divider
- **최대화 모드**: 우측 3D 영역이 전체 화면 차지 (좌측 숨김)
- **ESC 키**: 최대화 해제
- **빈 상태**: 데이터 없으면 "릴을 조회하세요" 안내

---

## 3. 노드 구조 (하이브리드)

### 3.1 노드 타입

| 타입 | 크기 (val) | 색상 | 스프라이트 | 클릭 동작 |
|------|-----------|------|-----------|----------|
| **root (릴)** | 20 | `#8b5cf6` | 📦 + ReelCd 텍스트 | 없음 (정보) |
| **category** | 10 | 섹션별 색상 | 이모지 + 건수 | **펼침/접힘 토글** |
| **entity** | 5 | 카테고리 색상(옅게) | ID 끝 8자리 | **좌측 테이블 하이라이트** |

### 3.2 카테고리 매핑

| 카테고리 | ID | 색상 | 아이콘 |
|---------|-----|------|--------|
| 입고 | `cat-receipt` | `#10b981` (초록) | 📦 |
| 출고 | `cat-issue` | `#f59e0b` (주황) | 🚚 |
| 릴투입 | `cat-reel` | `#06b6d4` (청록) | 🔧 |
| 릴교환 | `cat-change` | `#a855f7` (보라) | 🔄 |
| PCB | `cat-pcb` | `#3b82f6` (파랑) | 🔩 |

### 3.3 연결 구조

- **root → category**: 5개 항상 표시 (파티클 3개/엣지)
- **category → entity**: 펼침 상태일 때만 생성 (파티클 1개/엣지)
- 엣지 색상: 목적지 노드 색상 따라감
- 엣지 투명도: 0.3 (노드가 두드러지도록)

---

## 4. 데이터 변환

### 4.1 입력 (기존 API 응답)

```typescript
{
  reelCd: string;
  lotNo: string;
  receipt: ReceiptInfo[];
  issues: IssueInfo[];
  reelMaster: ReelMasterInfo[];
  reelChanges: ReelChangeInfo[];
  boards: BoardSummary[];
}
```

### 4.2 출력 (그래프 데이터)

```typescript
{
  nodes: [
    { id: "root", type: "root", label: reelCd, val: 20, color: "#8b5cf6", icon: "📦" },
    { id: "cat-receipt", type: "category", label: `입고 ${receipt.length}`, val: 10, color: "#10b981", icon: "📦", count: receipt.length },
    // ... 5개 카테고리
    // 펼침 상태의 카테고리만 엔티티 추가:
    ...(expandedCats.has("cat-pcb") ? boards.map(b => ({
      id: `pcb-${b.BoardSN}`,
      type: "entity",
      parentCat: "cat-pcb",
      originalId: b.BoardSN,
      label: b.BoardSN.slice(-8),
      val: 5,
      color: "#3b82f6",
      sourceData: b,
    })) : []),
  ],
  links: [
    { source: "root", target: "cat-receipt", particles: 3 },
    // ... 5개 기본 + 펼침 시 entity 링크
  ]
}
```

### 4.3 변환 함수

- **위치**: `src/components/mxvc/reverseTraceGraphBuilder.ts`
- **시그니처**: `buildGraphData(api: ApiResponse, expandedCats: Set<string>): GraphData`
- **순수 함수** (side effect 없음, `useMemo`로 감쌈)

---

## 5. 상태 관리

```typescript
// reverse-trace/page.tsx 내
const [expandedCats, setExpandedCats] = useState<Set<string>>(new Set());
const [maximized, setMaximized] = useState(false);
const [rightWidth, setRightWidth] = useState(30); // %
const [highlightedRow, setHighlightedRow] = useState<{ section: string; id: string } | null>(null);
```

### 5.1 클릭 핸들러

```typescript
const handleNodeClick = (node: GraphNode) => {
  if (node.type === "category") {
    setExpandedCats(prev => {
      const next = new Set(prev);
      if (next.has(node.id)) next.delete(node.id);
      else next.add(node.id);
      return next;
    });
  } else if (node.type === "entity") {
    setHighlightedRow({ section: node.parentCat, id: node.originalId });
    document.getElementById(`row-${node.originalId}`)?.scrollIntoView({
      behavior: 'smooth',
      block: 'nearest',
    });
  }
};
```

### 5.2 하이라이트 효과

- 좌측 테이블 각 행에 `id="row-${entityId}"` 부여
- `highlightedRow` 변경 시 해당 행에 CSS 클래스 추가 (노란 배경)
- 2초 후 자동 제거 (`setTimeout` + cleanup)

---

## 6. 3D 시각 효과 (Bloom 후처리)

### 6.1 Bloom 파라미터

```typescript
const bloomPass = new UnrealBloomPass(
  new THREE.Vector2(w, h),
  1.2,   // strength: 발광 강도
  0.6,   // radius: 번짐 반경
  0.1,   // threshold: 최소 밝기 (낮을수록 많은 요소 빛남)
);
```

### 6.2 시각 설정

| 요소 | 설정 |
|------|------|
| **배경** | `#0a0a1e` (어두운 남색, 거의 검정) |
| **노드 재질** | `MeshBasicMaterial` — Bloom이 자연스럽게 발광 |
| **엣지** | 반투명 선 (opacity 0.3) |
| **파티클** | 흰색 입자 → Bloom으로 빛나는 흐름 |
| **호버** | scale 1.3배 + 색상 +20% 밝기 |
| **하이라이트** | 외곽 흰색 링 추가 |

### 6.3 성능 안전장치

- **노드 100개 이상** → Bloom 자동 비활성화
- **WebGL 컨텍스트 해제**: 페이지 이탈 시 `useEffect` cleanup
- **SSR 방지**: `dynamic(() => import(...), { ssr: false })`

---

## 7. UX 인터랙션

### 7.1 마우스 조작

| 조작 | 동작 |
|------|------|
| **좌클릭 + 드래그** | 카메라 궤도 회전 |
| **우클릭 + 드래그** | 카메라 팬 이동 |
| **휠** | 줌인/아웃 |
| **호버** | 노드 스케일 1.3배 + 툴팁 |
| **카테고리 클릭** | 펼침/접힘 |
| **엔티티 클릭** | 좌측 테이블 하이라이트 + 스크롤 |
| **더블클릭** | 해당 노드로 카메라 포커싱 (1초 전환) |

### 7.2 툴바 버튼

- **🎯 중심으로**: 카메라를 릴 노드 정면으로 리셋
- **🔄 리셋**: 모든 펼침 해제 + 카메라 기본 위치
- **🗖 최대화**: 좌측 숨기고 3D 영역 100% (다시 누르면 복원)

### 7.3 하단 범례

- 5개 카테고리 색상 + 아이콘 + 이름 가로 배치
- 작은 폰트, 뷰포트 하단 고정

### 7.4 툴팁 (노드 호버 시)

| 노드 타입 | 툴팁 내용 |
|-----------|-----------|
| **root** | ReelCd / PartNo / 초기수량 / 현재수량 |
| **category** | 카테고리명 / 건수 / "클릭하여 펼침" |
| **entity (PCB)** | BoardSN / 라인 / 장비 / 장착 스텝 수 |
| **entity (입고)** | 입고일 / 수량 / Vendor |
| **entity (출고)** | 출고일 / 수량 / 모델 / 라인 |
| **entity (릴교환)** | 장착시간 / Feeder / Slot / 장비 |

---

## 8. 파일 구조

### 8.1 신규 파일

```
src/
├── components/mxvc/
│   ├── ReverseTrace3DGraph.tsx            # dynamic import 래퍼 (SSR 방지)
│   ├── ReverseTrace3DGraphInner.tsx       # 실제 ForceGraph3D + Bloom
│   ├── reverseTraceGraphBuilder.ts        # API → 그래프 데이터 변환
│   └── ReverseTracePanelSplitter.tsx      # 좌우 분할 리사이저
└── lib/three/
    └── bloomPass.ts                       # Bloom 설정 유틸
```

### 8.2 수정 파일

```
src/app/(mxvc)/mxvc/reverse-trace/page.tsx   # 좌우 분할 + 최대화 + 하이라이트 상태
```

### 8.3 패키지 추가

```json
{
  "dependencies": {
    "react-force-graph-3d": "^1.x",
    "three": "^0.160.x",
    "three-spritetext": "^1.x"
  },
  "devDependencies": {
    "@types/three": "^0.160.x"
  }
}
```

---

## 9. 개발 순서

1. **패키지 설치 + 스켈레톤**
   - `react-force-graph-3d`, `three`, `three-spritetext` 설치
   - `ReverseTrace3DGraph.tsx` dynamic import 래퍼 생성
   - 더미 데이터로 기본 그래프 렌더링 확인

2. **데이터 변환 + 카테고리 노드 표시**
   - `reverseTraceGraphBuilder.ts` 구현
   - 요약형(6노드: root + 5 category) 렌더링
   - 아이콘 스프라이트 적용

3. **파티클 애니메이션 + Bloom 후처리**
   - `linkDirectionalParticles` 설정
   - `UnrealBloomPass` 적용
   - 배경/재질/투명도 조정

4. **하이브리드 드릴다운**
   - 카테고리 클릭 → entity 노드 펼침
   - 툴팁 추가
   - 호버 효과

5. **좌우 분할 + 최대화 + 좌측 연동**
   - `ReverseTracePanelSplitter.tsx` 구현 (CSS grid + 드래그)
   - 최대화 토글
   - 엔티티 클릭 → 좌측 테이블 하이라이트 + 스크롤
   - 툴바 버튼 (🎯 / 🔄 / 🗖)

---

## 10. 제약 및 가정

- **데스크톱 전용**: WebGL 2.0 + postprocessing 필요. 생산 라인 터미널은 데스크톱이므로 OK.
- **노드 100개 상한**: PCB 44 + 기타 카테고리 여유로 충분.
- **SSR 미지원**: `ssr: false` 강제. 페이지 첫 로딩 시 그래프 컴포넌트 지연 로드.
- **번들 크기**: three.js 약 600KB (gzipped) — 이 페이지에만 로드.
- **저성능 환경 대비**: 노드 수가 극단적으로 많으면 Bloom 자동 OFF.
