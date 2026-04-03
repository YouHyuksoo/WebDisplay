/**
 * @file TraceabilityMaster.tsx
 * @description 제품 마스터 정보를 카드 형식으로 표시하는 React 클라이언트 컴포넌트
 *
 * 초보자 가이드:
 * - 제품의 기본 정보(바코드, 모델, 런번호 등)를 4열 그리드로 표시
 * - master, runCard, modelMaster 객체에서 필요한 필드를 추출하여 표시
 * - val() 헬퍼 함수로 안전하게 값을 가져옴 (null → '-')
 * - 모바일에서는 2열로 반응형 대응
 */

'use client'

/**
 * 객체에서 안전하게 문자열 값을 추출하는 헬퍼 함수
 * @param obj - 대상 객체
 * @param key - 키
 * @returns 값 또는 '-'
 */
const val = (obj: Record<string, unknown> | null | undefined, key: string): string => {
  if (!obj || !obj[key]) return '-'
  return String(obj[key])
}

interface TraceabilityMasterProps {
  master: Record<string, unknown> | null
  runCard: Record<string, unknown> | null
  modelMaster: Record<string, unknown> | null
}

/**
 * 필드 정보를 렌더링하는 내부 컴포넌트
 */
const Field = ({ label, value }: { label: string; value: string }) => (
  <div className="flex items-center gap-2 px-3 py-1 border-r border-gray-200 dark:border-gray-700 last:border-r-0">
    <span className="text-[11px] text-gray-400 dark:text-gray-500 shrink-0">{label}</span>
    <span className="text-xs font-semibold text-gray-900 dark:text-white truncate" title={value}>{value}</span>
  </div>
)

/**
 * TraceabilityMaster 컴포넌트
 */
export default function TraceabilityMaster({
  master,
  runCard,
  modelMaster,
}: TraceabilityMasterProps) {
  if (!master) return null

  return (
    <div className="mx-6 mt-3 rounded-lg border border-gray-200 bg-white dark:border-gray-700 dark:bg-slate-900 overflow-hidden">
      {/* 1행 */}
      <div className="grid grid-cols-4 divide-x divide-gray-200 dark:divide-gray-700
                      border-b border-gray-200 dark:border-gray-700">
        <Field label="BARCODE" value={val(master, 'SERIAL_NO') || val(master, 'BARCODE') || val(master, 'LABEL_TEXT')} />
        <Field label="MODEL" value={val(modelMaster, 'MODEL_NAME') || val(master, 'MODEL_NAME')} />
        <Field label="LINE" value={val(master, 'LINE_CODE') || val(runCard, 'LINE_CODE')} />
        <Field label="LOT QTY" value={val(runCard, 'LOT_QTY') || val(master, 'LOT_QTY')} />
      </div>
      {/* 2행 */}
      <div className="grid grid-cols-4 divide-x divide-gray-200 dark:divide-gray-700
                      border-b border-gray-200 dark:border-gray-700">
        <Field label="모델설명" value={val(modelMaster, 'MODEL_DESC') || val(modelMaster, 'DESCRIPTION')} />
        <Field label="RUN NO" value={val(master, 'RUN_NO')} />
        <Field label="RUN DATE" value={(val(master, 'RUN_DATE') || val(runCard, 'RUN_DATE')).replace(/T.*$/, '')} />
        <Field label="LOT NO" value={val(master, 'LOT_NO') || val(runCard, 'LOT_NO')} />
      </div>
      {/* 3행 */}
      <div className="grid grid-cols-4 divide-x divide-gray-200 dark:divide-gray-700">
        <Field label="마스터모델" value={val(runCard, 'MASTER_MODEL_NAME')} />
        <Field label="제조그룹" value={val(runCard, 'MFS_GROUP_NO')} />
        <Field label="모델코드" value={val(modelMaster, 'MODEL_CODE')} />
        <Field label="고객코드" value={val(modelMaster, 'CUSTOMER_CODE')} />
      </div>
    </div>
  )
}
