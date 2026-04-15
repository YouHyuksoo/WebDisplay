/**
 * @file src/components/mxvc/PostProcessSampleCard.tsx
 * @description 당일 샘플 마스터 등록 이력 카드 (양품/불량 구분)
 * 초보자 가이드:
 * - imcn_sample_bcr_input_hist 테이블 기반
 * - INSPECT_RESULT: OK=양품, NG=불량
 * - SAMPLE_TYPE: C=ICT Sample, E=EOL FCT Sample, T=COATING Sample 등
 * - 양품+불량 모두 등록된 모델 → 초록, 하나만 → 주황, 미등록 → 회색
 */
import { useTranslations } from 'next-intl';
import type { PostProcessSampleHistRow } from '@/types/mxvc/post-process';

interface Props {
  sampleHist: PostProcessSampleHistRow[];
}

/** 등록 상태 배지 */
function StatusBadge({ good, defect, t }: { good: number; defect: number; t: any }) {
  if (good > 0 && defect > 0) {
    return (
      <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-600 dark:text-emerald-400">
        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
        {t('statusDone')}
      </span>
    );
  }
  if (good > 0 || defect > 0) {
    return (
      <span className="inline-flex items-center gap-1 text-xs font-medium text-orange-500 dark:text-orange-400">
        <span className="w-1.5 h-1.5 rounded-full bg-orange-400 shrink-0" />
        {t('statusPartial')}
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 text-xs font-medium text-gray-400 dark:text-gray-500">
      <span className="w-1.5 h-1.5 rounded-full bg-gray-300 dark:bg-gray-600 shrink-0" />
      {t('statusNotRegistered')}
    </span>
  );
}

export default function PostProcessSampleCard({ sampleHist }: Props) {
  const t = useTranslations('mxvc.postProcess');

  return (
    <div className="hidden lg:flex flex-col rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 shadow-sm overflow-hidden shrink-0 w-[45%] min-w-[320px] max-w-[600px] h-full">
      {/* 헤더 */}
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-gray-100 dark:border-gray-800">
        <span className="text-xs font-semibold text-gray-600 dark:text-gray-300">
          {t('sampleTitle')}
        </span>
        <span className="text-xs text-gray-400 dark:text-gray-500">
          {t('sampleSubTitle')}
        </span>
      </div>

      {sampleHist.length === 0 ? (
        <div className="flex-1 flex items-center justify-center text-xs text-gray-400 dark:text-gray-500">
          {t('noSampleHist')}
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto overflow-x-hidden">
          <table className="w-full text-xs">
            <thead>
              <tr className="bg-gray-50 dark:bg-gray-800/60 text-gray-500 dark:text-gray-400">
                <th className="text-left px-4 py-1 font-medium">{t('modelName')}</th>
                <th className="text-left px-3 py-1 font-medium">{t('sampleType')}</th>
                <th className="text-center px-3 py-1 font-medium text-emerald-600 dark:text-emerald-400">{t('goodOk')}</th>
                <th className="text-center px-3 py-1 font-medium text-red-500 dark:text-red-400">{t('defectNg')}</th>
                <th className="text-center px-3 py-1 font-medium">{t('total')}</th>
                <th className="text-center px-3 py-1 font-medium">{t('status')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
              {sampleHist.map((row, i) => (
                <tr
                  key={`${row.modelName}-${row.sampleType}-${i}`}
                  className="hover:bg-gray-50 dark:hover:bg-gray-800/40 transition-colors"
                >
                  <td className="px-4 py-1 font-mono text-gray-700 dark:text-gray-300">
                    {row.modelName}
                  </td>
                  <td className="px-3 py-1 text-gray-500 dark:text-gray-400">
                    <span className="inline-flex items-center gap-1">
                      <span className="font-bold text-blue-500 dark:text-blue-400 w-4">{row.sampleType}</span>
                      <span>{row.sampleLabel}</span>
                    </span>
                  </td>
                  <td className="px-3 py-1 text-center tabular-nums">
                    <span className={row.goodCnt > 0
                      ? 'font-bold text-emerald-600 dark:text-emerald-400'
                      : 'text-gray-300 dark:text-gray-600'}>
                      {row.goodCnt}
                    </span>
                  </td>
                  <td className="px-3 py-1 text-center tabular-nums">
                    <span className={row.defectCnt > 0
                      ? 'font-bold text-red-500 dark:text-red-400'
                      : 'text-gray-300 dark:text-gray-600'}>
                      {row.defectCnt}
                    </span>
                  </td>
                  <td className="px-3 py-1 text-center tabular-nums text-gray-500 dark:text-gray-400">
                    {row.totalCnt}
                  </td>
                  <td className="px-3 py-2 text-center">
                    <StatusBadge good={row.goodCnt} defect={row.defectCnt} t={t} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
