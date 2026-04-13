/**
 * @file src/components/mxvc/PostProcessMagazinePanel.tsx
 * @description 매거진 재공 재고 우측 사이드패널 — 카드형 (IP_PRODUCT_MAGAZINE_INVENTORY)
 * 초보자 가이드:
 * - MODEL_NAME 기준으로 그룹화, 각 매거진을 카드로 표시
 * - 각 카드: 모델명 + 매거진번호 + CURRENT_QTY
 * - 그룹 소계 + 전체 합계 표시
 */
import type { PostProcessMagazineRow } from '@/types/mxvc/post-process';

interface Props {
  magazine: PostProcessMagazineRow[];
}

/** 입고 후 경과시간 문자열 반환 */
function elapsedLabel(isoStr: string): string {
  if (!isoStr) return '';
  const diffMs  = Date.now() - new Date(isoStr).getTime();
  if (diffMs < 0) return '';
  const totalMin = Math.floor(diffMs / 60000);
  if (totalMin < 1)   return '방금';
  if (totalMin < 60)  return `${totalMin}분 경과`;
  const h = Math.floor(totalMin / 60);
  const m = totalMin % 60;
  return m > 0 ? `${h}h ${m}m 경과` : `${h}h 경과`;
}

function groupByModel(rows: PostProcessMagazineRow[]) {
  const map = new Map<string, PostProcessMagazineRow[]>();
  for (const r of rows) {
    if (!map.has(r.modelName)) map.set(r.modelName, []);
    map.get(r.modelName)!.push(r);
  }
  return map;
}

export default function PostProcessMagazinePanel({ magazine }: Props) {
  const groups  = groupByModel(magazine);
  const total   = magazine.reduce((s, r) => s + r.currentQty, 0);
  const isEmpty = magazine.length === 0;

  return (
    <div className="flex flex-col h-full border-l border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900">
      {/* 헤더 */}
      <div className="shrink-0 px-4 py-3 border-b border-gray-200 dark:border-gray-700">
        <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-200">
          매거진 대기재공
        </h3>
        {!isEmpty && (
          <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
            전체 <span className="font-bold text-blue-600 dark:text-blue-400">{total.toLocaleString()}</span>개
            &nbsp;·&nbsp; {magazine.length}개 매거진
          </p>
        )}
      </div>

      {/* 본문 — 스크롤 */}
      <div className="flex-1 overflow-y-auto px-3 py-3 space-y-4">
        {isEmpty ? (
          <div className="flex items-center justify-center h-24 text-sm text-gray-400 dark:text-gray-500">
            현재 재공 없음
          </div>
        ) : (
          [...groups.entries()].map(([model, rows]) => {
            const groupTotal = rows.reduce((s, r) => s + r.currentQty, 0);
            return (
              <div key={model}>
                {/* 모델 헤더 */}
                <div className="flex items-center justify-between mb-2 px-1">
                  <span
                    className="text-xs font-bold text-blue-600 dark:text-blue-400 truncate"
                    title={model}
                  >
                    {model}
                  </span>
                  <span className="text-xs font-semibold text-gray-500 dark:text-gray-400 ml-2 whitespace-nowrap">
                    소계 {groupTotal.toLocaleString()}
                  </span>
                </div>

                {/* 매거진 카드 목록 */}
                <div className="space-y-1.5">
                  {rows.map((r, i) => (
                    <div
                      key={i}
                      className="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-2 shadow-sm"
                    >
                      {/* 매거진번호 */}
                      <div className="text-xs font-medium text-gray-700 dark:text-gray-300 truncate mb-1.5" title={r.magazineNo}>
                        {r.magazineNo}
                      </div>
                      {/* 공정·입고시간·경과시간 + 수량 */}
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-gray-400 dark:text-gray-500 tabular-nums">
                          {r.workstageCode}
                          <span className="mx-1 opacity-40">·</span>
                          {r.lastModifyTime}
                          {elapsedLabel(r.lastModifyDate) && (
                            <span className="ml-1 text-orange-500 dark:text-orange-400 font-medium">
                              ({elapsedLabel(r.lastModifyDate)})
                            </span>
                          )}
                        </span>
                        <span className="text-sm font-bold tabular-nums text-gray-800 dark:text-gray-100 ml-1 shrink-0">
                          {r.currentQty.toLocaleString()}
                          <span className="text-xs font-normal text-gray-400 ml-0.5">개</span>
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* 전체 합계 푸터 */}
      {!isEmpty && (
        <div className="shrink-0 px-4 py-3 border-t border-gray-200 dark:border-gray-700 bg-gray-100 dark:bg-gray-800">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-gray-500 dark:text-gray-400">전체 합계</span>
            <span className="text-base font-bold text-gray-800 dark:text-gray-100 tabular-nums">
              {total.toLocaleString()}
              <span className="text-xs font-normal text-gray-400 ml-1">개</span>
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
