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

import { useRef, useEffect, useCallback, useMemo } from 'react';
import ForceGraph3D, { ForceGraphMethods } from 'react-force-graph-3d';
import * as THREE from 'three';
import SpriteText from 'three-spritetext';
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
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const fgRef = useRef<any>(null);

  /* 생성된 Three.js 객체 추적 — unmount 시 WebGL 메모리 해제용 */
  const createdObjectsRef = useRef<{ geometries: THREE.BufferGeometry[]; materials: THREE.Material[] }>({
    geometries: [],
    materials: [],
  });

  /**
   * 노드 위치 캐시 — 펼침/접힘 시 기존 노드 위치를 고정하여 급격한 레이아웃 변화 방지.
   * 키: node.id, 값: {x, y, z}
   */
  const positionsRef = useRef<Map<string, { x: number; y: number; z: number }>>(new Map());

  /**
   * graphData를 가공: 이미 위치가 캐시된 노드는 fx/fy/fz로 고정.
   * 새 노드(ex: 처음 펼친 entity)는 고정 없이 자유롭게 배치됨.
   */
  const pinnedData = useMemo(() => {
    const positions = positionsRef.current;
    return {
      nodes: data.nodes.map((n) => {
        const saved = positions.get(n.id);
        if (saved) {
          return { ...n, fx: saved.x, fy: saved.y, fz: saved.z };
        }
        return { ...n };
      }),
      links: data.links,
    };
  }, [data]);

  /**
   * 노드 스프라이트 생성: 아이콘 + 텍스트 라벨
   * deps가 비어있는 이유: 이 콜백은 "팩토리 함수" — node 인수는 매 호출마다 달라지지만
   * 콜백 자체의 구현은 불변이므로 재생성할 필요 없음.
   */
  const nodeThreeObject = useCallback((node: GraphNode) => {
    const group = new THREE.Group();

    /* 구체 노드 */
    const geom = new THREE.SphereGeometry(Math.sqrt(node.val) * 2, 16, 16);
    const mat = new THREE.MeshBasicMaterial({ color: node.color });
    const sphere = new THREE.Mesh(geom, mat);
    group.add(sphere);

    /* dispose 추적 */
    createdObjectsRef.current.geometries.push(geom);
    createdObjectsRef.current.materials.push(mat);

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

  /* unmount 시 WebGL 메모리 해제 */
  useEffect(() => {
    const ref = createdObjectsRef.current;
    return () => {
      ref.geometries.forEach((g) => g.dispose());
      ref.materials.forEach((m) => m.dispose());
      ref.geometries.length = 0;
      ref.materials.length = 0;
    };
  }, []);

  const handleNodeClick = useCallback((node: GraphNode) => {
    if (node.type === 'category') {
      onCategoryToggle(node.id as CategoryId);
    } else if (node.type === 'entity') {
      onEntityClick(node);
    }
  }, [onCategoryToggle, onEntityClick]);

  /* 노드 라벨 (호버 툴팁, HTML 지원) */
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
    <div className="relative w-full h-full bg-[#1a1a2e]">
      {/* 툴바 */}
      <div className="absolute top-2 right-2 z-10 flex gap-1">
        <button onClick={() => fgRef.current?.cameraPosition({ x: 0, y: 0, z: 200 }, { x: 0, y: 0, z: 0 }, 1000)}
          className="px-2 py-1 text-xs rounded bg-gray-800/80 text-white hover:bg-gray-700"
          title="중심으로">중심</button>
        <button onClick={() => {
            /* 위치 캐시 초기화 → 자유 재배치 허용 */
            positionsRef.current.clear();
            onReset?.();
          }}
          className="px-2 py-1 text-xs rounded bg-gray-800/80 text-white hover:bg-gray-700"
          title="리셋 (위치 재배치)">리셋</button>
        <button onClick={() => positionsRef.current.clear()}
          className="px-2 py-1 text-xs rounded bg-gray-800/80 text-white hover:bg-gray-700"
          title="노드 위치 자유 재배치 (펼침 상태 유지)">재배치</button>
      </div>

      {/* 범례 */}
      <div className="absolute bottom-2 left-2 z-10 flex gap-3 text-[10px] text-white bg-black/50 px-2 py-1 rounded">
        <span className="text-emerald-400">▼ 입고</span>
        <span className="text-amber-400">▲ 출고</span>
        <span className="text-cyan-400">● 릴투입</span>
        <span className="text-purple-400">⟲ 교환</span>
        <span className="text-blue-400">■ PCB</span>
      </div>

      <ForceGraph3D
        ref={fgRef}
        graphData={pinnedData}
        width={width}
        height={height}
        backgroundColor="#1a1a2e"
        nodeThreeObject={nodeThreeObject}
        nodeLabel={nodeLabel}
        onEngineTick={() => {
          /* 시뮬레이션 중 노드 좌표를 캐시 — 다음 렌더에서 fx/fy/fz로 고정 */
          pinnedData.nodes.forEach((n) => {
            const nn = n as { id: string; x?: number; y?: number; z?: number };
            if (nn.x !== undefined && nn.y !== undefined && nn.z !== undefined) {
              positionsRef.current.set(nn.id, { x: nn.x, y: nn.y, z: nn.z });
            }
          });
        }}
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
