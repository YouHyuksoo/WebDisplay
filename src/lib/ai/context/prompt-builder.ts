/**
 * @file src/lib/ai/context/prompt-builder.ts
 * @description Stage 별 시스템 프롬프트 빌더.
 *   - WIKI MD 파일들이 시스템 프롬프트의 유일한 도메인 지식 원천.
 *   - identity/rules/skeletons/formulas/joins: 일반 가이드라인
 *   - tables/functions/procedures: 선택된 객체의 학습자료
 */

import { loadAiChatContext } from './md-loader';

export interface BuildPromptOpts {
  stage: 'sql_generation' | 'analysis';
  personaPrompt?: string;
  selectedTables?: string[];
  currentContext: { today: string; serverShift: 'A' | 'B'; userTz: string };
  customSqlPrompt?: string;
  customAnalysisPrompt?: string;
  selectedSite?: string;
}

export async function buildSystemPrompt(opts: BuildPromptOpts): Promise<string> {
  const sections: string[] = [];
  const ctx = await loadAiChatContext();

  // 1) Identity prompt
  if (opts.stage === 'sql_generation') {
    sections.push(opts.customSqlPrompt || ctx.identity.sqlGeneration);
  } else {
    sections.push(opts.customAnalysisPrompt || ctx.identity.analysis);
  }

  // 2) SQL generation 단계 고정 가이드라인 + 학습자료
  if (opts.stage === 'sql_generation') {
    sections.push('# SQL 규칙\n' + ctx.rules);
    sections.push('# 테이블 성격별 SQL 골격\n\n' + ctx.skeletons);
    sections.push('# 제조업 관용 계산식\n\n' + ctx.formulas);
    sections.push('# 도메인 공용 JOIN 레시피\n\n' + ctx.joins);

    // 선택된 테이블의 WIKI MD 본문을 그대로 주입 (enabled=true 만).
    const selected = opts.selectedTables ?? [];
    const tableBodies: string[] = [];
    for (const name of selected) {
      const md = ctx.tables[name.toUpperCase()];
      if (md) tableBodies.push(md.body);
    }
    if (tableBodies.length > 0) {
      sections.push(
        '# 테이블 학습자료\n\n' + tableBodies.join('\n\n---\n\n'),
      );
    } else {
      sections.push(
        '# 테이블 학습자료\n\n_(선택된 테이블 중 학습자료가 등록된 것이 없습니다. display/18 의 AI 학습 탭에서 사용함 체크 후 내용을 등록하세요.)_',
      );
    }

    // 등록된 함수·프로시저는 모두 주입 (enabled=true 만).
    const functionBodies = Object.values(ctx.functions).map((f) => f.body);
    if (functionBodies.length > 0) {
      sections.push(
        '# 함수 학습자료\n\n' + functionBodies.join('\n\n---\n\n'),
      );
    }
    const procedureBodies = Object.values(ctx.procedures).map((p) => p.body);
    if (procedureBodies.length > 0) {
      sections.push(
        '# 프로시저 학습자료\n\n' + procedureBodies.join('\n\n---\n\n'),
      );
    }
  }

  // 3) 사이트 정보
  if (opts.stage === 'sql_generation' && opts.selectedSite && opts.selectedSite !== 'default') {
    sections.push(`# DB 사이트\n현재 쿼리 대상 사이트: ${opts.selectedSite}`);
  }

  // 4) 현재 시점
  sections.push(
    `# 현재 시점\n- 작업일: ${opts.currentContext.today}\n` +
      `- 현재 시프트: ${opts.currentContext.serverShift}\n- 시간대: ${opts.currentContext.userTz}`,
  );

  // 5) Persona prompt (analysis stage 전용, 맨 앞에 prepend)
  if (opts.stage === 'analysis' && opts.personaPrompt) {
    sections.unshift(opts.personaPrompt);
  }

  return sections.join('\n\n');
}
