/**
 * @file src/components/mxvc/InterlockLogTable.tsx
 * @description 인터락호출이력 좌측 로그 테이블
 * 초보자 가이드:
 * 1. InterlockLog[] 배열을 테이블 행으로 렌더링
 * 2. NG 행은 빨간 배경/텍스트로 강조
 * 3. 고정 높이 + overflow-y 스크롤
 * 4. 컬럼: 시각 | ADDR | LINE | WORKSTAGE | REQ 요약 | 결과
 */
"use client";

import type { InterlockLog } from "@/types/mxvc/interlock";

interface InterlockLogTableProps {
  logs: InterlockLog[];
}

export default function InterlockLogTable({ logs }: InterlockLogTableProps) {
  return (
    <div className="flex flex-col h-full">
      {/* 헤더 */}
      <div className="shrink-0 px-3 py-2 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/80">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-gray-800 dark:text-gray-100">
            실시간 로그
          </h3>
          <span className="text-xs font-medium text-gray-500 dark:text-gray-400">
            {logs.length}건
          </span>
        </div>
      </div>

      {/* 테이블 */}
      <div className="flex-1 overflow-auto">
        <table className="w-full text-xs">
          <thead className="sticky top-0 bg-gray-100 dark:bg-gray-800 z-10">
            <tr className="text-left text-gray-600 dark:text-gray-300">
              <th className="px-2 py-1.5 font-semibold">일시</th>
              <th className="px-2 py-1.5 font-semibold">ADDR</th>
              <th className="px-2 py-1.5 font-semibold">LINE</th>
              <th className="px-2 py-1.5 font-semibold">공정</th>
              <th className="px-2 py-1.5 font-semibold">REQ</th>
              <th className="px-2 py-1.5 font-semibold text-center">결과</th>
            </tr>
          </thead>
          <tbody>
            {logs.map((log, i) => {
              const isNg = log.result === "NG";
              const rowCls = isNg
                ? "bg-red-900/20 text-red-300"
                : "text-gray-700 dark:text-gray-300";
              return (
                <tr key={`${log.callDate}-${i}`} className={`border-b border-gray-200 dark:border-gray-700 ${rowCls}`}>
                  <td colSpan={6} className="px-2 pt-1.5 pb-0.5">
                    {/* 1행: 기본 정보 */}
                    <div className="flex items-center gap-3">
                      <span className="font-mono whitespace-nowrap">{log.callDate}</span>
                      <span className="font-medium">{log.addr}</span>
                      <span>{log.lineCode}</span>
                      <span>{log.workstageCode}</span>
                      <span className="truncate flex-1" title={log.req}>{log.req}</span>
                      <span
                        className={`shrink-0 inline-block px-1.5 py-0.5 rounded text-[10px] font-bold ${
                          isNg ? "bg-red-600 text-white" : "bg-green-700 text-white"
                        }`}
                      >
                        {log.result}
                      </span>
                    </div>
                    {/* 2행: RETURN 메시지 */}
                    <div className="mt-0.5 pb-1 text-[11px] text-gray-500 dark:text-gray-400 truncate" title={log.returnMsg}>
                      ↳ {log.returnMsg}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {logs.length === 0 && (
          <div className="flex items-center justify-center h-32 text-gray-500 dark:text-gray-400 text-sm">
            데이터 없음
          </div>
        )}
      </div>
    </div>
  );
}
