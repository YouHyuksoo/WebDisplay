# 멕시코전장 역추적 3D 시각화 구현 계획

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 역추적 페이지(`/mxvc/reverse-trace`)에 Force-Directed 3D 그래프를 우측 패널로 추가하여 자재릴 중심의 5단계(입고/출고/릴투입/릴교환/PCB) 관계를 시각화한다.

**Architecture:** `react-force-graph-3d` 라이브러리(Three.js 기반)를 dynamic import로 SSR 회피. UnrealBloomPass 후처리로 시네마틱 발광 효과. 좌우 분할 레이아웃(기본 70:30, 드래그 리사이즈, 최대화 토글). 카테고리 노드 클릭 시 엔티티로 드릴다운하고, 엔티티 클릭 시 좌측 테이블 행을 하이라이트.

**Tech Stack:** Next.js 15 App Router, TypeScript, Tailwind CSS 4, react-force-graph-3d, three, three-spritetext

---

## File Structure

### 신규 파일

```
src/
├── components/mxvc/
│   ├── ReverseTrace3DGraph.tsx            # dynamic import 래퍼 (SSR 방지)
│   ├── ReverseTrace3DGraphInner.tsx       # ForceGraph3D 렌더러 + Bloom
│   ├── reverseTraceGraphBuilder.ts        # API 응답 → 그래프 데이터 변환
│   └── ReverseTracePanelSplitter.tsx      # 좌우 분할 리사이저
└── lib/three/
    └── bloomPass.ts                       # Bloom 설정 팩토리 함수
```

### 수정 파일

```
src/app/(mxvc)/mxvc/reverse-trace/page.tsx   # 좌우 분할 + 최대화 + 하이라이트 상태
```

### 책임 분리

- **page.tsx**: 상태 관리(expandedCats, maximized, rightWidth, highlightedRow), 좌우 레이아웃, 테이블 행 id 부여 + 하이라이트 CSS 적용
- **ReverseTrace3DGraph.tsx**: `next/dynamic`으로 Inner 컴포넌트 지연 로드 + 로딩 UI
- **ReverseTrace3DGraphInner.tsx**: ForceGraph3D 인스턴스, Bloom 적용, 노드/엣지 렌더링, 툴바 버튼, 범례
- **reverseTraceGraphBuilder.ts**: 순수 함수 `buildGraphData(api, expandedCats): { nodes, links }`
- **bloomPass.ts**: `createBloomPass(w, h): UnrealBloomPass` 팩토리
- **ReverseTracePanelSplitter.tsx**: 좌우 분할 드래그 리사이저 (mousedown/mousemove/mouseup)

---

## Task 1: 패키지 설치 + Spec 확인

**Files:**
- Modify: `package.json`

- [ ] **Step 1: Spec 문서 확인**

Run: `cat docs/superpowers/specs/2026-04-11-reverse-trace-3d-graph-design.md | head -50`
Expected: "# 멕시코전장 역추적 3D 시각화 — 설계 문서" 로 시작하는 내용

- [ ] **Step 2: 패키지 설치**

Run:
```bash
npm install react-force-graph-3d three three-spritetext
npm install -D @types/three
```

Expected: `added N packages` 출력, 에러 없음

- [ ] **Step 3: 설치 확인**

Run: `cat package.json | grep -E "(react-force-graph-3d|three|three-spritetext)"`

Expected:
```
"react-force-graph-3d": "^1...",
"three": "^0.16...",
"three-spritetext": "^1..."
```

- [ ] **Step 4: Commit**

```bash
git add package.json package-lock.json
git commit -m "chore: 3D Force-Graph 시각화 패키지 추가 (three, react-force-graph-3d, three-spritetext)"
```

---

## Task 2: 그래프 데이터 변환 함수 구현

**Files:**
- Create: `src/components/mxvc/reverseTraceGraphBuilder.ts`

- [ ] **Step 1: 타입 정의 + 순수 변환 함수 작성**

```typescript
/**
 * @file src/components/mxvc/reverseTraceGraphBuilder.ts
 * @description 역추적 API 응답을 3D Force-Graph 데이터로 변환하는 순수 함수.
 *
 * 초보자 가이드:
 * - 입력: /api/mxvc/reverse-trace 응답 객체 + 펼쳐진 카테고리 Set
 * - 출력: { nodes, links } 형식의 그래프 데이터
 * - root(릴) 1개 + category 5개 + expandedCats에 포함된 카테고리의 entity들
 */
export interface ReceiptInfo {
  ITEM_BARCODE: string; ITEM_CODE: string; LOT_NO: string;
  SCAN_DATE: string; SCAN_QTY: number; VENDOR_LOTNO: string;
}
export interface IssueInfo {
  ISSUE_DATE: string; ITEM_CODE: string; MATERIAL_MFS: string;
  LINE_CODE: string; WORKSTAGE_CODE: string; ISSUE_QTY: number;
  MODEL_NAME: string;
}
export interface ReelMasterInfo {
  ReelCd: string; PartNo: string; CurrentCnt: number; InitCnt: number;
  VendorNm: string; PartType: string; LastLoadDt: string;
}
export interface ReelChangeInfo {
  ReelChangeID: number; PartNo: string; FeederCd: string;
  FeederSlot: string; EqpCd: string; ReelInstallDt: string;
}
export interface BoardSummary {
  BoardSN: string; LineNm: string; EqpNm: string; PartNo: string;
  JobOrderNo: string; StepCount: number; StartDt: string;
}

export interface ApiResponse {
  reelCd: string;
  lotNo: string;
  receipt: ReceiptInfo[];
  issues: IssueInfo[];
  reelMaster: ReelMasterInfo[];
  reelChanges: ReelChangeInfo[];
  boards: BoardSummary[];
}

export type NodeType = 'root' | 'category' | 'entity';
export type CategoryId = 'cat-receipt' | 'cat-issue' | 'cat-reel' | 'cat-change' | 'cat-pcb';

export interface GraphNode {
  id: string;
  type: NodeType;
  label: string;
  val: number;
  color: string;
  icon?: string;
  parentCat?: CategoryId;
  originalId?: string;
  sourceData?: unknown;
}

export interface GraphLink {
  source: string;
  target: string;
  particles: number;
}

export interface GraphData {
  nodes: GraphNode[];
  links: GraphLink[];
}

const CAT_META: Record<CategoryId, { color: string; icon: string; label: string }> = {
  'cat-receipt': { color: '#10b981', icon: '📦', label: '입고' },
  'cat-issue':   { color: '#f59e0b', icon: '🚚', label: '출고' },
  'cat-reel':    { color: '#06b6d4', icon: '🔧', label: '릴투입' },
  'cat-change':  { color: '#a855f7', icon: '🔄', label: '릴교환' },
  'cat-pcb':     { color: '#3b82f6', icon: '🔩', label: 'PCB' },
};

export function buildGraphData(
  api: ApiResponse | null,
  expandedCats: Set<string>,
): GraphData {
  if (!api) return { nodes: [], links: [] };

  const nodes: GraphNode[] = [];
  const links: GraphLink[] = [];

  /* root 노드 */
  nodes.push({
    id: 'root',
    type: 'root',
    label: api.reelCd,
    val: 20,
    color: '#8b5cf6',
    icon: '📦',
  });

  /* 카테고리 노드 + root → category 엣지 */
  const counts: Record<CategoryId, number> = {
    'cat-receipt': api.receipt.length,
    'cat-issue':   api.issues.length,
    'cat-reel':    api.reelMaster.length,
    'cat-change':  api.reelChanges.length,
    'cat-pcb':     api.boards.length,
  };

  (Object.keys(CAT_META) as CategoryId[]).forEach((catId) => {
    const meta = CAT_META[catId];
    const count = counts[catId];
    if (count === 0) return;
    nodes.push({
      id: catId,
      type: 'category',
      label: `${meta.label} ${count}`,
      val: 10,
      color: meta.color,
      icon: meta.icon,
    });
    links.push({ source: 'root', target: catId, particles: 3 });
  });

  /* 펼침 상태의 카테고리만 entity 노드 추가 */
  if (expandedCats.has('cat-receipt')) {
    api.receipt.forEach((r) => {
      nodes.push({
        id: `receipt-${r.ITEM_BARCODE}`,
        type: 'entity',
        parentCat: 'cat-receipt',
        originalId: r.ITEM_BARCODE,
        label: r.LOT_NO,
        val: 5,
        color: CAT_META['cat-receipt'].color,
        sourceData: r,
      });
      links.push({ source: 'cat-receipt', target: `receipt-${r.ITEM_BARCODE}`, particles: 1 });
    });
  }
  if (expandedCats.has('cat-issue')) {
    api.issues.forEach((iss, i) => {
      const eid = `issue-${i}`;
      nodes.push({
        id: eid,
        type: 'entity',
        parentCat: 'cat-issue',
        originalId: String(i),
        label: iss.MODEL_NAME ?? iss.ITEM_CODE,
        val: 5,
        color: CAT_META['cat-issue'].color,
        sourceData: iss,
      });
      links.push({ source: 'cat-issue', target: eid, particles: 1 });
    });
  }
  if (expandedCats.has('cat-reel')) {
    api.reelMaster.forEach((r) => {
      nodes.push({
        id: `reel-${r.ReelCd}`,
        type: 'entity',
        parentCat: 'cat-reel',
        originalId: r.ReelCd,
        label: r.PartNo,
        val: 5,
        color: CAT_META['cat-reel'].color,
        sourceData: r,
      });
      links.push({ source: 'cat-reel', target: `reel-${r.ReelCd}`, particles: 1 });
    });
  }
  if (expandedCats.has('cat-change')) {
    api.reelChanges.forEach((rc) => {
      const eid = `change-${rc.ReelChangeID}`;
      nodes.push({
        id: eid,
        type: 'entity',
        parentCat: 'cat-change',
        originalId: String(rc.ReelChangeID),
        label: rc.FeederSlot.trim(),
        val: 5,
        color: CAT_META['cat-change'].color,
        sourceData: rc,
      });
      links.push({ source: 'cat-change', target: eid, particles: 1 });
    });
  }
  if (expandedCats.has('cat-pcb')) {
    api.boards.forEach((b) => {
      const eid = `pcb-${b.BoardSN}`;
      nodes.push({
        id: eid,
        type: 'entity',
        parentCat: 'cat-pcb',
        originalId: b.BoardSN,
        label: b.BoardSN.slice(-8),
        val: 5,
        color: CAT_META['cat-pcb'].color,
        sourceData: b,
      });
      links.push({ source: 'cat-pcb', target: eid, particles: 1 });
    });
  }

  return { nodes, links };
}
```

- [ ] **Step 2: 타입 체크**

Run: `npx tsc --noEmit -p tsconfig.json 2>&1 | grep reverseTraceGraphBuilder`
Expected: 에러 없음 (출력 없음)

- [ ] **Step 3: Commit**

```bash
git add src/components/mxvc/reverseTraceGraphBuilder.ts
git commit -m "feat: 역추적 3D 그래프 데이터 변환 함수 추가"
```

---

## Task 3: Bloom 후처리 유틸 작성

**Files:**
- Create: `src/lib/three/bloomPass.ts`

- [ ] **Step 1: Bloom 팩토리 함수 작성**

```typescript
/**
 * @file src/lib/three/bloomPass.ts
 * @description UnrealBloomPass 생성 팩토리.
 *
 * 초보자 가이드:
 * - ForceGraph3D 인스턴스의 postProcessingComposer에 추가하여 발광 효과 적용
 * - strength/radius/threshold로 발광 강도 조정
 * - 노드 100개 초과 시 비활성화하여 성능 보호
 */
import * as THREE from 'three';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';

export function createBloomPass(width: number, height: number): UnrealBloomPass {
  const pass = new UnrealBloomPass(
    new THREE.Vector2(width, height),
    1.2,  // strength
    0.6,  // radius
    0.1,  // threshold
  );
  return pass;
}
```

- [ ] **Step 2: 타입 체크**

Run: `npx tsc --noEmit -p tsconfig.json 2>&1 | grep bloomPass`
Expected: 에러 없음

- [ ] **Step 3: Commit**

```bash
git add src/lib/three/bloomPass.ts
git commit -m "feat: Three.js UnrealBloomPass 팩토리 유틸 추가"
```

---

## Task 4: 3D 그래프 Inner 컴포넌트 (기본 렌더)

**Files:**
- Create: `src/components/mxvc/ReverseTrace3DGraphInner.tsx`

- [ ] **Step 1: 기본 ForceGraph3D 컴포넌트 구현 (카테고리 노드까지)**

```typescript
/**
 * @file src/components/mxvc/ReverseTrace3DGraphInner.tsx
 * @description 3D Force-Graph 실제 렌더러 (Three.js 기반).
 *
 * 초보자 가이드:
 * 1. ForceGraph3D 인스턴스로 노드-엣지 렌더링
 * 2. Bloom 후처리로 시네마틱 발광 효과 (노드 100개 이하만)
 * 3. 카테고리 노드 클릭 → onCategoryToggle 콜백
 * 4. 엔티티 노드 클릭 → onEntityClick 콜백 (좌측 테이블 하이라이트용)
 * 5. 호버 툴팁, 파티클 애니메이션 내장
 */
'use client';

import { useRef, useEffect, useMemo, useCallback } from 'react';
import ForceGraph3D, { ForceGraphMethods } from 'react-force-graph-3d';
import * as THREE from 'three';
import SpriteText from 'three-spritetext';
import { createBloomPass } from '@/lib/three/bloomPass';
import type { GraphData, GraphNode, CategoryId } from './reverseTraceGraphBuilder';

interface Props {
  data: GraphData;
  onCategoryToggle: (catId: CategoryId) => void;
  onEntityClick: (node: GraphNode) => void;
  onReset?: () => void;
  width: number;
  height: number;
}

export default function ReverseTrace3DGraphInner({
  data, onCategoryToggle, onEntityClick, onReset, width, height,
}: Props) {
  const fgRef = useRef<ForceGraphMethods>(undefined as unknown as ForceGraphMethods);

  /* Bloom 후처리 (노드 100개 이하일 때만) */
  useEffect(() => {
    if (!fgRef.current) return;
    if (data.nodes.length > 100) return;
    const composer = fgRef.current.postProcessingComposer();
    const pass = createBloomPass(width, height);
    composer.addPass(pass);
    return () => {
      composer.removePass(pass);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data.nodes.length, width, height]);

  /* 노드 스프라이트 생성: 아이콘 + 텍스트 라벨 */
  const nodeThreeObject = useCallback((node: GraphNode) => {
    const group = new THREE.Group();

    /* 구체 노드 */
    const geom = new THREE.SphereGeometry(Math.sqrt(node.val) * 2, 16, 16);
    const mat = new THREE.MeshBasicMaterial({ color: node.color });
    const sphere = new THREE.Mesh(geom, mat);
    group.add(sphere);

    /* 텍스트 라벨 (스프라이트) */
    const labelText = node.icon ? `${node.icon} ${node.label}` : node.label;
    const sprite = new SpriteText(labelText);
    sprite.color = '#ffffff';
    sprite.textHeight = node.type === 'root' ? 4 : node.type === 'category' ? 3 : 2;
    sprite.backgroundColor = 'rgba(0,0,0,0.6)';
    sprite.padding = 2;
    sprite.position.set(0, Math.sqrt(node.val) * 2 + 3, 0);
    group.add(sprite);

    return group;
  }, []);

  const handleNodeClick = useCallback((node: GraphNode) => {
    if (node.type === 'category') {
      onCategoryToggle(node.id as CategoryId);
    } else if (node.type === 'entity') {
      onEntityClick(node);
    }
  }, [onCategoryToggle, onEntityClick]);

  /* 노드 라벨 (호버 툴팁) */
  const nodeLabel = useCallback((node: GraphNode) => {
    const src = node.sourceData as Record<string, unknown> | undefined;
    if (node.type === 'root') {
      return `<div style="padding:6px"><b>${node.label}</b></div>`;
    }
    if (node.type === 'category') {
      return `<div style="padding:6px"><b>${node.label}</b><br/>클릭하여 펼침/접힘</div>`;
    }
    const details = src ? Object.entries(src)
      .slice(0, 4)
      .map(([k, v]) => `${k}: ${String(v).slice(0, 30)}`)
      .join('<br/>') : '';
    return `<div style="padding:6px"><b>${node.label}</b><br/>${details}</div>`;
  }, []);

  return (
    <div className="relative w-full h-full bg-[#0a0a1e]">
      {/* 툴바 */}
      <div className="absolute top-2 right-2 z-10 flex gap-1">
        <button onClick={() => fgRef.current?.cameraPosition({ x: 0, y: 0, z: 200 }, { x: 0, y: 0, z: 0 }, 1000)}
          className="px-2 py-1 text-xs rounded bg-gray-800/80 text-white hover:bg-gray-700"
          title="중심으로">🎯</button>
        <button onClick={onReset}
          className="px-2 py-1 text-xs rounded bg-gray-800/80 text-white hover:bg-gray-700"
          title="리셋">🔄</button>
      </div>

      {/* 범례 */}
      <div className="absolute bottom-2 left-2 z-10 flex gap-3 text-[10px] text-white bg-black/50 px-2 py-1 rounded">
        <span>📦 입고</span>
        <span>🚚 출고</span>
        <span>🔧 릴투입</span>
        <span>🔄 교환</span>
        <span>🔩 PCB</span>
      </div>

      <ForceGraph3D
        ref={fgRef}
        graphData={data}
        width={width}
        height={height}
        backgroundColor="#0a0a1e"
        nodeThreeObject={nodeThreeObject}
        nodeLabel={nodeLabel}
        linkDirectionalParticles={(l) => (l as { particles?: number }).particles ?? 1}
        linkDirectionalParticleSpeed={0.005}
        linkDirectionalParticleWidth={1.5}
        linkOpacity={0.3}
        linkColor={() => '#ffffff'}
        onNodeClick={handleNodeClick}
        controlType="trackball"
      />
    </div>
  );
}
```

- [ ] **Step 2: 타입 체크**

Run: `npx tsc --noEmit -p tsconfig.json 2>&1 | grep ReverseTrace3DGraphInner`
Expected: 에러 없음

- [ ] **Step 3: Commit**

```bash
git add src/components/mxvc/ReverseTrace3DGraphInner.tsx
git commit -m "feat: 3D Force-Graph 렌더러 컴포넌트 추가 (Bloom + 파티클)"
```

---

## Task 5: Dynamic Import 래퍼 작성

**Files:**
- Create: `src/components/mxvc/ReverseTrace3DGraph.tsx`

- [ ] **Step 1: SSR 방지 래퍼 구현**

```typescript
/**
 * @file src/components/mxvc/ReverseTrace3DGraph.tsx
 * @description ReverseTrace3DGraphInner를 dynamic import로 감싸 SSR 회피.
 *
 * 초보자 가이드:
 * - Three.js는 window 객체 의존 → SSR 불가
 * - next/dynamic의 ssr: false로 클라이언트 전용 로드
 * - 로딩 중에는 스피너 표시
 */
'use client';

import dynamic from 'next/dynamic';
import type { GraphData, GraphNode, CategoryId } from './reverseTraceGraphBuilder';

const Inner = dynamic(() => import('./ReverseTrace3DGraphInner'), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full flex items-center justify-center bg-[#0a0a1e] text-white text-sm">
      <span className="w-6 h-6 border-2 border-gray-600 border-t-blue-400 rounded-full animate-spin mr-2" />
      3D 그래프 로딩 중...
    </div>
  ),
});

interface Props {
  data: GraphData;
  onCategoryToggle: (catId: CategoryId) => void;
  onEntityClick: (node: GraphNode) => void;
  onReset?: () => void;
  width: number;
  height: number;
}

export default function ReverseTrace3DGraph(props: Props) {
  return <Inner {...props} />;
}
```

- [ ] **Step 2: 타입 체크 + 빌드 확인**

Run: `npx next build 2>&1 | grep -E "(error|Error|✓ Compiled)" | head -5`
Expected: `✓ Compiled successfully` 출력, 에러 없음

- [ ] **Step 3: Commit**

```bash
git add src/components/mxvc/ReverseTrace3DGraph.tsx
git commit -m "feat: 3D 그래프 dynamic import 래퍼 (SSR 회피)"
```

---

## Task 6: 좌우 분할 리사이저 컴포넌트

**Files:**
- Create: `src/components/mxvc/ReverseTracePanelSplitter.tsx`

- [ ] **Step 1: 리사이저 구현**

```typescript
/**
 * @file src/components/mxvc/ReverseTracePanelSplitter.tsx
 * @description 좌우 분할 드래그 리사이저.
 *
 * 초보자 가이드:
 * - 세로 바 드래그로 좌우 너비 비율 조정 (20~80% 범위 제한)
 * - onChange 콜백으로 부모에게 새로운 우측 너비(%) 전달
 * - 드래그 중 user-select:none으로 텍스트 선택 방지
 */
'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

interface Props {
  onChange: (rightWidthPercent: number) => void;
  minPercent?: number;
  maxPercent?: number;
}

export default function ReverseTracePanelSplitter({
  onChange, minPercent = 20, maxPercent = 80,
}: Props) {
  const [dragging, setDragging] = useState(false);
  const parentWidthRef = useRef(0);
  const barRef = useRef<HTMLDivElement>(null);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    parentWidthRef.current = barRef.current?.parentElement?.offsetWidth ?? 0;
    setDragging(true);
    e.preventDefault();
  }, []);

  useEffect(() => {
    if (!dragging) return;

    const onMove = (e: MouseEvent) => {
      const parent = barRef.current?.parentElement;
      if (!parent || parentWidthRef.current === 0) return;
      const rect = parent.getBoundingClientRect();
      const rightWidth = rect.right - e.clientX;
      const percent = (rightWidth / parentWidthRef.current) * 100;
      const clamped = Math.min(maxPercent, Math.max(minPercent, percent));
      onChange(clamped);
    };
    const onUp = () => setDragging(false);

    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
    document.body.style.userSelect = 'none';
    document.body.style.cursor = 'col-resize';

    return () => {
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onUp);
      document.body.style.userSelect = '';
      document.body.style.cursor = '';
    };
  }, [dragging, onChange, minPercent, maxPercent]);

  return (
    <div
      ref={barRef}
      onMouseDown={handleMouseDown}
      className={`w-1 shrink-0 cursor-col-resize transition-colors ${
        dragging ? 'bg-blue-500' : 'bg-gray-200 dark:bg-gray-700 hover:bg-blue-400'
      }`}
      title="드래그하여 크기 조정"
    />
  );
}
```

- [ ] **Step 2: 타입 체크**

Run: `npx tsc --noEmit -p tsconfig.json 2>&1 | grep ReverseTracePanelSplitter`
Expected: 에러 없음

- [ ] **Step 3: Commit**

```bash
git add src/components/mxvc/ReverseTracePanelSplitter.tsx
git commit -m "feat: 역추적 페이지 좌우 분할 드래그 리사이저 컴포넌트"
```

---

## Task 7: 역추적 페이지 통합 (좌우 분할 + 3D 그래프)

**Files:**
- Modify: `src/app/(mxvc)/mxvc/reverse-trace/page.tsx`

- [ ] **Step 1: page.tsx 상단 import + 상태 추가**

페이지 파일의 상단 import 부분을 찾아 다음으로 교체:

```typescript
import React, { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import DisplayHeader from '@/components/display/DisplayHeader';
import DisplayFooter from '@/components/display/DisplayFooter';
import ReverseTrace3DGraph from '@/components/mxvc/ReverseTrace3DGraph';
import ReverseTracePanelSplitter from '@/components/mxvc/ReverseTracePanelSplitter';
import {
  buildGraphData,
  type CategoryId,
  type GraphNode,
  type ApiResponse,
} from '@/components/mxvc/reverseTraceGraphBuilder';
```

상태 선언부에 추가 (기존 `const [reelCd, setReelCd] = useState('');` 아래):

```typescript
  /* 3D 그래프 관련 상태 */
  const [expandedCats, setExpandedCats] = useState<Set<string>>(new Set());
  const [maximized, setMaximized] = useState(false);
  const [rightWidth, setRightWidth] = useState(30); // %
  const [highlightedRow, setHighlightedRow] = useState<{ section: string; id: string } | null>(null);
  const rightPanelRef = useRef<HTMLDivElement>(null);
  const [panelDims, setPanelDims] = useState({ width: 0, height: 0 });
```

- [ ] **Step 2: useEffect/핸들러 추가**

상태 선언 아래에 추가:

```typescript
  /* 우측 패널 크기 추적 */
  useEffect(() => {
    const el = rightPanelRef.current;
    if (!el) return;
    const ro = new ResizeObserver((entries) => {
      const { width, height } = entries[0].contentRect;
      setPanelDims({ width, height });
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, [maximized, rightWidth]);

  /* 하이라이트 자동 제거 (2초) */
  useEffect(() => {
    if (!highlightedRow) return;
    const t = setTimeout(() => setHighlightedRow(null), 2000);
    return () => clearTimeout(t);
  }, [highlightedRow]);

  /* ESC 키로 최대화 해제 */
  useEffect(() => {
    if (!maximized) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setMaximized(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [maximized]);

  /* 카테고리 펼침/접힘 토글 */
  const handleCategoryToggle = useCallback((catId: CategoryId) => {
    setExpandedCats((prev) => {
      const next = new Set(prev);
      if (next.has(catId)) next.delete(catId);
      else next.add(catId);
      return next;
    });
  }, []);

  /* 엔티티 클릭 → 좌측 테이블 하이라이트 + 스크롤 */
  const handleEntityClick = useCallback((node: GraphNode) => {
    if (!node.originalId || !node.parentCat) return;
    setHighlightedRow({ section: node.parentCat, id: node.originalId });
    const el = document.getElementById(`row-${node.originalId}`);
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }, []);

  /* 그래프 리셋: 펼침 해제 + 하이라이트 초기화 */
  const handleGraphReset = useCallback(() => {
    setExpandedCats(new Set());
    setHighlightedRow(null);
  }, []);

  /* 그래프 데이터 */
  const apiData: ApiResponse | null = useMemo(() => {
    if (!receipt.length && !issues.length && !reelMaster.length && !reelChanges.length && !boards.length) {
      return null;
    }
    return {
      reelCd: reelCd.trim() || 'Unknown',
      lotNo: '',
      receipt, issues, reelMaster, reelChanges, boards,
    };
  }, [reelCd, receipt, issues, reelMaster, reelChanges, boards]);

  const graphData = useMemo(() => buildGraphData(apiData, expandedCats), [apiData, expandedCats]);
```

- [ ] **Step 3: 렌더링 구조 수정 — 좌우 분할 적용**

기존 `<div className="flex-1 overflow-auto p-4 space-y-4">` 로 시작하는 메인 콘텐츠 영역을 찾아서 다음과 같이 감싸기:

기존:
```tsx
      {/* 메인 콘텐츠 */}
      <div className="flex-1 overflow-auto p-4 space-y-4">
        {loading && (...)}
        ...
      </div>

      <DisplayFooter />
```

변경:
```tsx
      {/* 메인: 좌우 분할 */}
      <div className="flex-1 flex min-h-0 overflow-hidden">
        {/* 좌측: 기존 그리드들 (최대화 시 숨김) */}
        <div className={`overflow-auto p-4 space-y-4 ${maximized ? 'hidden' : ''}`}
          style={{ width: maximized ? '0%' : `${100 - rightWidth}%` }}>
          {loading && (
            <div className="flex items-center justify-center py-16">
              <span className="w-8 h-8 border-3 border-gray-300 dark:border-gray-600 border-t-blue-500 rounded-full animate-spin" />
            </div>
          )}

          {!loading && !hasData && (
            <div className="flex items-center justify-center py-16 text-sm text-gray-400 dark:text-gray-500">
              자재릴번호(ReelCd)를 입력하고 조회하세요
            </div>
          )}

          {/* 여기에 기존 입고/출고/릴투입/릴교환/PCB 섹션들이 그대로 위치. 
              기존 섹션의 table tr 요소들에 id="row-${originalId}" + 하이라이트 class 조건 추가 필요.
              (Step 4에서 적용) */}
        </div>

        {/* 분할 바 (최대화 시 숨김) */}
        {!maximized && hasData && (
          <ReverseTracePanelSplitter onChange={setRightWidth} />
        )}

        {/* 우측: 3D 그래프 */}
        {hasData && (
          <div
            ref={rightPanelRef}
            className="relative overflow-hidden border-l border-gray-200 dark:border-gray-700"
            style={{ width: maximized ? '100%' : `${rightWidth}%` }}
          >
            <button
              onClick={() => setMaximized((v) => !v)}
              className="absolute top-2 left-2 z-20 px-2 py-1 text-xs rounded bg-gray-800/80 text-white hover:bg-gray-700"
              title={maximized ? '원래 크기 (ESC)' : '최대화'}
            >
              {maximized ? '🗗' : '🗖'}
            </button>
            <ReverseTrace3DGraph
              data={graphData}
              onCategoryToggle={handleCategoryToggle}
              onEntityClick={handleEntityClick}
              onReset={handleGraphReset}
              width={panelDims.width}
              height={panelDims.height}
            />
          </div>
        )}
      </div>

      <DisplayFooter />
```

**중요**: Step 3에서는 좌측의 기존 섹션들(입고/출고/릴투입/릴교환/PCB 그리드)을 복사해서 새 위치로 옮겨야 합니다. 기존 섹션 JSX 전체를 그대로 유지하되 위치만 새 div 안으로 이동.

- [ ] **Step 4: 테이블 행에 id + 하이라이트 클래스 적용**

좌측 영역의 각 테이블 `<tr>`에 `id={...}`와 조건부 하이라이트 클래스 추가:

**입고이력 tr:**
```tsx
{receipt.map((r, i) => (
  <tr
    key={i}
    id={`row-${r.ITEM_BARCODE}`}
    className={`border-t border-gray-100 dark:border-gray-800 transition-colors ${
      highlightedRow?.id === r.ITEM_BARCODE ? 'bg-yellow-100 dark:bg-yellow-900/40' : ''
    }`}
  >
```

**출고이력 tr** (originalId는 인덱스):
```tsx
{issues.map((iss, i) => (
  <tr
    key={i}
    id={`row-${i}`}
    className={`border-t border-gray-100 dark:border-gray-800 transition-colors ${
      highlightedRow?.section === 'cat-issue' && highlightedRow?.id === String(i)
        ? 'bg-yellow-100 dark:bg-yellow-900/40' : ''
    }`}
  >
```

**릴 투입이력 tr** (originalId는 ReelCd):
```tsx
{reelMaster.map((r, i) => (
  <tr
    key={i}
    id={`row-${r.ReelCd}`}
    className={`border-t border-gray-100 dark:border-gray-800 transition-colors ${
      highlightedRow?.section === 'cat-reel' && highlightedRow?.id === r.ReelCd
        ? 'bg-yellow-100 dark:bg-yellow-900/40' : ''
    }`}
  >
```

**릴교환이력 tr** (originalId는 ReelChangeID):
```tsx
{reelChanges.map((rc) => (
  <tr
    key={rc.ReelChangeID}
    id={`row-${rc.ReelChangeID}`}
    className={`border-t border-gray-100 dark:border-gray-800 transition-colors ${
      highlightedRow?.section === 'cat-change' && highlightedRow?.id === String(rc.ReelChangeID)
        ? 'bg-yellow-100 dark:bg-yellow-900/40' : ''
    }`}
  >
```

**PCB 메인 tr** (originalId는 BoardSN, 이미 `<tr>` 있음):
```tsx
<tr
  id={`row-${b.BoardSN}`}
  onClick={() => handleBoardClick(b.BoardSN)}
  className={`border-t border-gray-100 dark:border-gray-800 cursor-pointer transition-colors ${
    highlightedRow?.section === 'cat-pcb' && highlightedRow?.id === b.BoardSN
      ? 'bg-yellow-100 dark:bg-yellow-900/40'
      : expandedBoard === b.BoardSN
        ? 'bg-blue-50 dark:bg-blue-900/20'
        : 'hover:bg-gray-50 dark:hover:bg-gray-800/40'
  }`}
>
```

- [ ] **Step 5: 빌드 확인**

Run: `npx next build 2>&1 | grep -E "(error|Error|✓ Compiled)" | head -10`
Expected: `✓ Compiled successfully` 출력, TypeScript 에러 없음

- [ ] **Step 6: Commit**

```bash
git add src/app/\(mxvc\)/mxvc/reverse-trace/page.tsx
git commit -m "feat: 역추적 페이지 좌우 분할 + 3D 그래프 통합 (하이라이트 연동)"
```

---

## Task 8: 로컬 실행 & UX 검증

**Files:**
- None (manual testing)

- [ ] **Step 1: 개발 서버 실행**

Run: `npm run dev`
Expected: `Ready on http://localhost:3000` 출력

- [ ] **Step 2: 브라우저 테스트 체크리스트**

`http://localhost:3000/mxvc/reverse-trace` 접속 후:

1. 자재릴번호 입력 (예: `2007H0100045-8RY26565-5000`) → 조회 버튼 클릭
2. 좌측: 입고/출고/릴투입/릴교환/PCB 그리드가 나오는지 확인
3. 우측 30% 영역: 3D 그래프 로딩 → 릴 중심 + 5개 카테고리 노드 표시
4. 카테고리 노드 클릭 → 해당 카테고리의 엔티티 노드들이 펼쳐지는지 확인
5. 엔티티 노드 클릭 → 좌측 해당 테이블 행이 노란색으로 2초간 하이라이트되는지 확인
6. 분할 바 드래그 → 좌우 너비 조정 확인
7. 🗖 최대화 버튼 → 우측 100%로 확장, 🗗로 복원
8. ESC 키 → 최대화 해제
9. 🔄 리셋 → 모든 펼침 해제
10. 🎯 중심으로 → 카메라 복귀
11. 파티클 애니메이션(입자 흐름) 동작 확인
12. Bloom 발광 효과 시각적 확인

- [ ] **Step 3: 콘솔 에러 확인**

브라우저 DevTools Console 열어 에러 없는지 확인.
특히 `Three.js`, `react-force-graph-3d` 관련 warning/error 없어야 함.

- [ ] **Step 4: 빌드 재검증**

Run: `npx next build 2>&1 | tail -5`
Expected: 빌드 성공, 타입 에러 없음

- [ ] **Step 5: Commit (기록용)**

검증 완료 후 빈 커밋으로 마일스톤 기록:
```bash
git commit --allow-empty -m "test: 역추적 3D 그래프 UX 검증 완료"
```

---

## Self-Review Checklist

### Spec 커버리지

- [x] 1. 전체 아키텍처 & 레이아웃 → Task 7 (좌우 분할 + 최대화)
- [x] 2. 노드 구조 (하이브리드) → Task 2 (buildGraphData), Task 4 (nodeThreeObject)
- [x] 3. 데이터 변환 & 상태 관리 → Task 2, Task 7 Step 2
- [x] 4. Bloom 후처리 & 시각 효과 → Task 3 (bloomPass.ts), Task 4 (useEffect)
- [x] 5. UX 인터랙션 → Task 4 (툴바/범례), Task 7 (ESC/하이라이트)
- [x] 6. 파일 구조 & 개발 순서 → Task 1~7 순차 진행

### Placeholder 스캔
- ✅ "TBD"/"TODO" 없음
- ✅ 모든 step이 실행 가능한 코드/명령 포함
- ✅ 타입/함수명 일관성: `CategoryId`, `GraphNode`, `buildGraphData`, `handleCategoryToggle`, `handleEntityClick` 모든 Task에서 동일

### 타입 일관성
- `buildGraphData(api, expandedCats)` 시그니처: Task 2 선언 = Task 7 사용 ✅
- `GraphNode.parentCat: CategoryId` 타입: Task 2 정의 = Task 4/7 참조 ✅
- `onCategoryToggle(catId: CategoryId)`: Task 4 선언 = Task 7 핸들러 ✅

### 스코프
- 단일 피처(3D 시각화 추가)로 제한, 기존 API/섹션 변경 없음 ✅

---

## 실행 방식 선택

계획 완성했고 `docs/superpowers/plans/2026-04-11-reverse-trace-3d-graph.md` 에 저장했어요.

**2가지 실행 옵션:**

**1. Subagent-Driven (추천)** — 각 Task마다 새 subagent 디스패치, Task 사이에 리뷰, 빠른 반복
**2. Inline Execution** — 현재 세션에서 executing-plans 스킬로 체크포인트 단위 배치 실행
