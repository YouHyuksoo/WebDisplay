/**
 * @file src/lib/ai/schema-context.ts
 * @description LLM에 주입할 화이트리스트 테이블의 컬럼 명세.
 *
 * 초보자 가이드:
 * - 이 파일은 scripts/extract-schema-context.mjs로 자동 생성됨.
 * - 화이트리스트 테이블이 확정되면 npm run extract-schema 실행 → SCHEMA 자동 채움.
 * - 수동 보강 가능: sampleQueries, enums, joins 필드.
 */

export interface ColumnSpec {
  type:     string;
  nullable: boolean;
  comment:  string | null;
}

export interface TableSpec {
  description: string;
  columns:     Record<string, ColumnSpec>;
  /** 사용 예시 SQL — 사람이 보강 (선택) */
  sampleQueries?: string[];
  /** 코드 → 의미 매핑 (예: SHIFT_CODE: A=주간, B=야간) */
  enums?: Record<string, Record<string, string>>;
  /** 자주 쓰이는 조인 패턴 설명 */
  joins?: string[];
}

export const SCHEMA: Record<string, TableSpec> = {
  // TODO: 오빠가 화이트리스트 테이블 목록 제공 후
  //       npm run extract-schema 실행으로 자동 채워짐
};

export function buildSchemaSection(selectedTables?: string[]): string {
  const tables = selectedTables && selectedTables.length > 0
    ? selectedTables.filter((t) => SCHEMA[t])
    : Object.keys(SCHEMA);

  if (tables.length === 0) {
    return '_(화이트리스트 테이블이 아직 등록되지 않았습니다. 관리자에게 문의하세요.)_';
  }

  const sections = tables.map((tableName) => {
    const spec = SCHEMA[tableName];
    const cols = Object.entries(spec.columns)
      .map(([name, c]) => `| ${name} | ${c.type} | ${c.nullable ? 'Y' : 'N'} | ${c.comment ?? ''} |`)
      .join('\n');
    const samples = spec.sampleQueries?.length
      ? `\n\n예시 SQL:\n${spec.sampleQueries.map((s) => `- \`${s}\``).join('\n')}`
      : '';
    const enums = spec.enums
      ? `\n\n코드값:\n${Object.entries(spec.enums).map(([col, vals]) =>
          `- ${col}: ${Object.entries(vals).map(([k, v]) => `${k}=${v}`).join(', ')}`).join('\n')}`
      : '';
    return `## ${tableName}\n${spec.description}\n\n| 컬럼 | 타입 | NULL | 코멘트 |\n|---|---|---|---|\n${cols}${enums}${samples}`;
  });

  return sections.join('\n\n');
}
