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
import { useTranslations } from 'next-intl';
import Spinner from '@/components/ui/Spinner';
import type { GraphData, GraphNode, CategoryId } from './reverseTraceGraphBuilder';

function LoadingFallback() {
  const t = useTranslations('common');
  return (
    <div className="w-full h-full flex items-center justify-center bg-[#1a1a2e] text-white text-sm">
      <Spinner size="md" label={t('loading3dGraph')} labelClassName="text-white" />
    </div>
  );
}

const Inner = dynamic(() => import('./ReverseTrace3DGraphInner'), {
  ssr: false,
  loading: LoadingFallback,
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
