/**
 * @file src/lib/ai-tables/domain-resolver.ts
 * @description 컬럼 설정 4계층 상속 머지.
 *
 * 초보자 가이드:
 * 우선순위 (위가 더 세다):
 *   1. tables.json[site].tables[T].columnOverrides[col] (테이블·컬럼별 오버라이드)
 *   2. column-domains.json 의 members 에 포함된 도메인 공통 설정
 *   3. schema-cache 의 DB 주석 (기본값, labels.ko 등)
 *   4. 없으면 { priority: 'common', decode: { kind: 'raw' } }
 */

import type {
  CachedColumn,
  TableMeta,
  ColumnDomain,
  ColumnOverride,
  ColumnDecode,
} from './types';

export interface ResolvedColumn {
  name: string;
  type: string;
  nullable: boolean;
  comment: string | null;
  hint?: string;
  priority: 'key' | 'common' | 'rare';
  excludeFromPrompt: boolean;
  decode: ColumnDecode;
  labels: { ko?: string; en?: string; es?: string };
  /** 일치한 도메인이 있으면 그 id. UI/디버깅용. */
  domainId?: string;
}

/**
 * 단일 컬럼에 대해 4계층을 머지해 최종 설정을 만든다.
 * @param col DB에서 긁어온 원본 컬럼 정보 (schema-cache.json)
 * @param meta 해당 테이블의 메타 (tables.json)
 * @param domains 전체 도메인 목록 (column-domains.json)
 */
export function resolveColumn(
  col: CachedColumn,
  meta: TableMeta,
  domains: ColumnDomain[],
): ResolvedColumn {
  const ovr: ColumnOverride | undefined = meta.columnOverrides?.[col.name];
  const domain = domains.find((d) => d.members.includes(col.name));

  return {
    name: col.name,
    type: col.type,
    nullable: col.nullable,
    comment: col.comment,
    labels: col.labels,
    priority: ovr?.priority ?? domain?.priority ?? 'common',
    excludeFromPrompt:
      ovr?.excludeFromPrompt ?? domain?.excludeFromPrompt ?? false,
    hint: ovr?.hint ?? domain?.hint,
    decode: ovr?.decode ?? domain?.decode ?? { kind: 'raw' },
    domainId: domain?.id,
  };
}
