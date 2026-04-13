/**
 * @file src/components/mxvc/PostProcessMagazineTable.tsx
 * @description 매거진 대기재공 현황 테이블
 * 초보자 가이드:
 * - IP_PRODUCT_MAGAZINE의 현재 재공 스냅샷을 라인/공정별로 표시한다.
 * - 이 테이블은 현재 시점 데이터만 보유 (이력 없음).
 * - 데이터가 없으면 "현재 재공 없음" 메시지를 표시한다.
 */
import type { PostProcessMagazineRow } from '@/types/mxvc/post-process';

interface Props {
  magazine: PostProcessMagazineRow[];
}

const thCls = 'px-3 py-2 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide whitespace-nowrap';
const tdCls = 'px-3 py-2 text-sm text-gray-700 dark:text-gray-300';

export default function PostProcessMagazineTable({ magazine }: Props) {
  const total = magazine.reduce((s, r) => s + r.inQty, 0);

  return (
    <div className="px-6 pb-6 flex-1 min-h-0 overflow-auto">
      <h3 className="text-sm font-semibold text-gray-600 dark:text-gray-300 mb-2">
        매거진 대기재공
        {magazine.length > 0 && (
          <span className="ml-2 font-normal text-gray-400 dark:text-gray-500">
            총 {total.toLocaleString()} 개
          </span>
        )}
      </h3>

      {magazine.length === 0 ? (
        <div className="flex items-center justify-center h-24 text-sm text-gray-400 dark:text-gray-500 border border-dashed border-gray-300 dark:border-gray-700 rounded-lg">
          현재 재공 없음
        </div>
      ) : (
        <div className="overflow-auto rounded-lg border border-gray-200 dark:border-gray-700">
          <table className="w-full border-collapse text-sm">
            <thead className="bg-gray-50 dark:bg-gray-800 sticky top-0">
              <tr>
                <th className={thCls}>라인</th>
                <th className={thCls}>공정</th>
                <th className={thCls}>매거진 번호</th>
                <th className={`${thCls} text-right`}>재공 수량</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
              {magazine.map((row, i) => (
                <tr key={i} className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                  <td className={tdCls}>{row.lineCode}</td>
                  <td className={tdCls}>{row.workstageCode}</td>
                  <td className={tdCls}>{row.magazineNo}</td>
                  <td className={`${tdCls} text-right font-mono font-semibold`}>
                    {row.inQty.toLocaleString()}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot className="bg-gray-50 dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700">
              <tr>
                <td colSpan={3} className="px-3 py-2 text-xs text-gray-500 dark:text-gray-400 font-semibold">
                  합계
                </td>
                <td className="px-3 py-2 text-right text-sm font-bold font-mono text-gray-800 dark:text-gray-100">
                  {total.toLocaleString()}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      )}
    </div>
  );
}
