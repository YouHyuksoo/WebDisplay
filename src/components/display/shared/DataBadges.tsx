/**
 * @file DataBadges.tsx
 * @description 디스플레이 테이블에서 재사용하는 상태 뱃지 및 포맷 헬퍼 컴포넌트.
 * 초보자 가이드: StatusBadge는 라인 상태(Running/Stop/Idle)를 색상으로 표시하고,
 * CheckBadge는 점검 항목의 OK/NG를 시각적으로 표시한다.
 */

/**
 * 라인 상태를 색상 뱃지로 표시한다.
 * @param {{ status: string }} props - 상태 텍스트 (Running, Stop, Idle 등)
 */
export function StatusBadge({ status }: { status: string }) {
  const colorMap: Record<string, string> = {
    Running:
      'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
    Stop: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
    Idle: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
    '정상': 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
    '정지': 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  };
  const colors =
    colorMap[status] ||
    'bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400';
  return (
    <span
      className={`inline-block rounded px-2 py-0.5 text-xs font-medium ${colors}`}
    >
      {status || '-'}
    </span>
  );
}

/**
 * 점검 항목의 합격/불합격을 아이콘으로 표시한다.
 * @param {{ value: string }} props - 점검 결과 값 (Y/OK/PASS = 합격)
 */
export function CheckBadge({ value }: { value: string }) {
  if (!value || value.trim() === '') {
    return <span className="text-zinc-300 dark:text-zinc-600">-</span>;
  }
  const isOk = value === 'Y' || value === 'OK' || value === 'PASS';
  return (
    <span className={isOk ? 'text-green-500' : 'text-red-500'}>
      {isOk ? '\u2713' : '\u2717'}
    </span>
  );
}

/**
 * 숫자를 천 단위 콤마 포맷으로 변환한다.
 * @param {unknown} val - 포맷할 값
 * @returns {string} 포맷된 문자열
 */
export function formatNumber(val: unknown): string {
  if (val == null) return '-';
  const num = Number(val);
  if (isNaN(num)) return String(val);
  return num.toLocaleString();
}
