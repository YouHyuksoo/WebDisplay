/**
 * @file src/lib/ai-tables/mutex.ts
 * @description 단일 개발자 환경용 in-memory mutex.
 *
 * 초보자 가이드:
 * - 동일 key에 대한 동시 호출을 직렬화 (FIFO)
 * - 다른 key는 독립적으로 병렬 실행
 * - 프로세스 단위 락 — 여러 Node 프로세스가 같은 파일을 건드리는 경우는 보호하지 않음
 *   (본 프로젝트는 단일 개발자 + 단일 Next.js 프로세스 전제)
 *
 * 사용 예:
 * ```ts
 * await withLock('/data/file.json', async () => {
 *   // 파일 읽기 → 수정 → 쓰기 (원자적)
 * });
 * ```
 */

const locks = new Map<string, Promise<void>>();

export async function withLock<T>(key: string, fn: () => Promise<T>): Promise<T> {
  const prev = locks.get(key) ?? Promise.resolve();
  let release!: () => void;
  const next = new Promise<void>((resolve) => { release = resolve; });
  locks.set(key, prev.then(() => next));
  try {
    await prev;
    return await fn();
  } finally {
    release();
    if (locks.get(key) === next) locks.delete(key);
  }
}
