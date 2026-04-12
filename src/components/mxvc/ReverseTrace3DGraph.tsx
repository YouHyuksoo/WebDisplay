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
    <div className="w-full h-full flex items-center justify-center bg-[#1a1a2e] text-white text-sm">
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
  onExpandAll?: () => void;
  onCollapseAll?: () => void;
  width: number;
  height: number;
}

export default function ReverseTrace3DGraph(props: Props) {
  return <Inner {...props} />;
}
