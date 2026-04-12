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
  'cat-receipt': { color: '#10b981', icon: '▼', label: '입고' },
  'cat-issue':   { color: '#f59e0b', icon: '▲', label: '출고' },
  'cat-reel':    { color: '#06b6d4', icon: '●', label: '릴투입' },
  'cat-change':  { color: '#a855f7', icon: '⟲', label: '릴교환' },
  'cat-pcb':     { color: '#3b82f6', icon: '■', label: 'PCB' },
};

export function buildGraphData(
  api: ApiResponse | null,
  expandedCats: Set<string>,
): GraphData {
  if (!api) return { nodes: [], links: [] };

  const nodes: GraphNode[] = [];
  const links: GraphLink[] = [];

  /* root 노드 (중심 허브) */
  nodes.push({
    id: 'root',
    type: 'root',
    label: api.reelCd,
    val: 20,
    color: '#8b5cf6',
    icon: '◆',
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
