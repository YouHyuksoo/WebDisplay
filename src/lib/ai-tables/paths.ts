/**
 * @file src/lib/ai-tables/paths.ts
 * @description AI Tables 관련 파일 경로 상수.
 *
 * 초보자 가이드:
 * - `process.cwd()` 기준 절대 경로로 계산 (Next.js 서버 런타임에서 프로젝트 루트)
 * - OS 중립: `path.join`으로 조립하여 Windows/Unix 모두 안전
 */

import path from 'path';

const root = process.cwd();
const contextDir = path.join(root, 'data', 'ai-context');

export const PATHS = {
  contextDir,
  tablesJson:     path.join(contextDir, 'tables.json'),
  columnDomains:  path.join(contextDir, 'column-domains.json'),
  schemaCache:    path.join(contextDir, 'schema-cache.json'),
  basecodeCache:  path.join(contextDir, 'basecode-cache.json'),
  historyDir:     path.join(root, 'scripts', 'sql', 'comment-history'),
} as const;
