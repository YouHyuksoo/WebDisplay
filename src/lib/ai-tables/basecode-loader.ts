/**
 * @file src/lib/ai-tables/basecode-loader.ts
 * @description basecode-cache.json 읽기 전용 로더.
 *
 * 초보자 가이드:
 * - ISYS_BASECODE 테이블의 code_type 목록을 JSON 스냅샷으로 보관.
 * - AI가 decode: basecode(code_type) 힌트를 낼 때 유효한 코드 타입인지 검증에 쓰인다.
 */

import fs from 'fs/promises';
import { PATHS } from './paths';
import type { BasecodeCacheFile } from './types';

let _cache: BasecodeCacheFile | null = null;

/** basecode-cache.json 로드 (메모리 캐시). */
export async function loadBasecodes(): Promise<BasecodeCacheFile> {
  if (_cache) return _cache;
  const raw = await fs.readFile(PATHS.basecodeCache, 'utf-8');
  _cache = JSON.parse(raw) as BasecodeCacheFile;
  return _cache;
}

/** 모든 CODE_TYPE 문자열 목록. */
export async function getCodeTypes(): Promise<string[]> {
  const cache = await loadBasecodes();
  return cache.codeTypes.map((c) => c.codeType);
}

/** basecode-cache.json 메모리 캐시 무효화. */
export function invalidateBasecodeCache(): void {
  _cache = null;
}
