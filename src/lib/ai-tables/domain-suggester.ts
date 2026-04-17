/**
 * @file src/lib/ai-tables/domain-suggester.ts
 * @description 스키마 캐시 + basecode 캐시 + 기존 도메인을 바탕으로 새 도메인 후보를 제안.
 *
 * 초보자 가이드:
 * - `*_BY` 컬럼이 3개 이상 → `audit-who` 도메인 제안 (excludeFromPrompt)
 * - `*_DATE|*_AT` 컬럼이 3개 이상 → `audit-when` 도메인 제안 (excludeFromPrompt)
 * - `^(ORG|ORGANIZATION)_?ID$` 컬럼이 있으면 → `system-org` 도메인 제안 (excludeFromPrompt)
 * - `*_CODE` 컬럼명에서 `_`를 공백으로 바꾼 값이 basecode.codeTypes 에 존재하면 → 해당 도메인 제안
 * - 이미 존재하는 도메인 id 는 스킵.
 */

import type {
  SchemaCacheFile,
  BasecodeCacheFile,
  ColumnDomain,
} from './types';

export interface DomainSuggestion {
  domainId: string;
  name: string;
  reason: string;
  proposedMembers: string[];
  proposedSettings: Partial<ColumnDomain>;
}

/** 자동 도메인 후보 계산. 순수 함수. */
export function suggestDomains(
  schemaCache: SchemaCacheFile,
  basecodes: BasecodeCacheFile,
  existing: ColumnDomain[],
): DomainSuggestion[] {
  const existingIds = new Set(existing.map((d) => d.id));
  const allCols = new Set<string>();
  for (const site of Object.values(schemaCache.sites)) {
    if (!site) continue;
    for (const t of Object.values(site.tables ?? {})) {
      for (const c of t.columns ?? []) allCols.add(c.name);
    }
  }
  const suggestions: DomainSuggestion[] = [];

  // 1) audit-who: *_BY
  const byCols = [...allCols].filter((c) => /_BY$/.test(c));
  if (byCols.length >= 3 && !existingIds.has('audit-who')) {
    suggestions.push({
      domainId: 'audit-who',
      name: '입력·수정자',
      reason: `접미 '_BY' 패턴 ${byCols.length}개 매칭`,
      proposedMembers: byCols,
      proposedSettings: { excludeFromPrompt: true },
    });
  }

  // 2) audit-when: *_DATE | *_AT
  const whenCols = [...allCols].filter((c) => /(_DATE|_AT)$/.test(c));
  if (whenCols.length >= 3 && !existingIds.has('audit-when')) {
    suggestions.push({
      domainId: 'audit-when',
      name: '입력·수정 일시',
      reason: `접미 '_DATE|_AT' 패턴 ${whenCols.length}개 매칭`,
      proposedMembers: whenCols,
      proposedSettings: { excludeFromPrompt: true },
    });
  }

  // 3) system-org: ^(ORG|ORGANIZATION)_?ID$
  const orgCols = [...allCols].filter((c) =>
    /^(ORG|ORGANIZATION)_?ID$/.test(c),
  );
  if (orgCols.length >= 1 && !existingIds.has('system-org')) {
    suggestions.push({
      domainId: 'system-org',
      name: '조직 식별자',
      reason: `패턴 'ORG_ID|ORGANIZATION_ID' ${orgCols.length}개 매칭`,
      proposedMembers: orgCols,
      proposedSettings: { excludeFromPrompt: true },
    });
  }

  // 4) *_CODE ↔ basecode.CODE_TYPE 매칭
  const knownTypes = new Set(basecodes.codeTypes.map((b) => b.codeType));
  for (const col of [...allCols].filter((c) => /_CODE$/.test(c))) {
    const candidate = col.replace(/_/g, ' ');
    if (!knownTypes.has(candidate)) continue;
    const id = candidate.toLowerCase().replace(/\s/g, '-');
    if (existingIds.has(id)) continue;
    if (suggestions.find((s) => s.domainId === id)) continue;
    suggestions.push({
      domainId: id,
      name: candidate,
      reason: `CODE_TYPE '${candidate}' 매칭`,
      proposedMembers: [col],
      proposedSettings: {
        priority: 'common' as const,
        decode: { kind: 'basecode' as const, codeType: candidate },
      },
    });
  }

  return suggestions;
}
