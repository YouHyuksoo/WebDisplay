/**
 * @file src/components/ctq/IndicatorTable.tsx
 * @description 지표 테이블 -- 모델 x 공정 매트릭스, 월간 전전월/전월 PPM 비교 + 대책서 등록
 *
 * 초보자 가이드:
 * 1. 2단 헤더: 1행=공정명(colspan=2), 2행=전전월 displayLabel / 전월 displayLabel
 * 2. 비율 색상: 200%+ 빨강, curr=0 초록, 둘 다 0 회색
 * 3. 200% 초과 + 대책서 미등록 -> 빨간 [등록] 버튼, 등록 완료 -> 초록 OK 뱃지
 * 4. [등록] 클릭 -> 모달 입력, Enter/OK -> onRegister, Escape -> 취소
 * 5. 공정 사이 굵은 왼쪽 보더로 시각적 구분
 */

"use client";

import { useState } from "react";
import { createPortal } from "react-dom";
import { useTranslations } from "next-intl";
import type {
  IndicatorModelData,
  IndicatorProcessKey,
  MonthlyProcessData,
  MonthRange,
  ProcessPpmThresholds,
} from "@/types/ctq/indicator";
import { DEFAULT_PPM_THRESHOLDS } from "@/types/ctq/indicator";
import IndicatorDetailModal from "./IndicatorDetailModal";

/** 대상 공정 목록 */
const PROCESS_KEYS: IndicatorProcessKey[] = ["ICT", "HIPOT", "FT", "BURNIN", "ATE"];

/** 공정 표시명 */
const PROCESS_LABELS: Record<IndicatorProcessKey, string> = {
  ICT: "ICT",
  HIPOT: "Hi-Pot",
  FT: "FT",
  BURNIN: "Burn-In",
  ATE: "ATE",
};

/** 공정 그룹 첫 번째 셀에 왼쪽 굵은 보더 */
const GROUP_BORDER = "border-l-2 border-l-gray-500";

/** PPM 숫자 포맷 (천 단위 콤마) */
function formatPpm(ppm: number): string {
  return ppm.toLocaleString();
}

/** 비율에 따른 색상 클래스 반환 */
function getRatioColor(prev: number, curr: number): string {
  if (prev === 0 && curr === 0) return "text-gray-600";
  if (curr === 0) return "text-green-400";
  if (prev === 0) return "text-gray-600";
  const ratio = (curr / prev) * 100;
  if (ratio >= 200) return "text-red-400 font-bold";
  return "text-green-400";
}

/** 200% 이상인지 판단 */
function isOver200(prev: number, curr: number): boolean {
  if (prev <= 0 || curr <= 0) return false;
  return (curr / prev) * 100 >= 200;
}

/** 비율 텍스트 생성 (PPM + 전기 대비 비율) */
function getRatioText(prev: number, curr: number): string {
  if (prev === 0 && curr === 0) return "0";
  if (prev === 0) return "0";
  if (curr === 0) return "0 (0%)";
  const ratio = Math.round((curr / prev) * 100);
  return `${formatPpm(curr)} (${ratio}%)`;
}

interface Props {
  models: IndicatorModelData[];
  monthBefore: MonthRange;
  lastMonth: MonthRange;
  ppmThresholds?: ProcessPpmThresholds;
  onRegister: (
    targetMonth: string,
    itemCode: string,
    processCode: string,
    countermeasureNo: string
  ) => Promise<void>;
}

export default function IndicatorTable({ models, monthBefore, lastMonth, ppmThresholds = DEFAULT_PPM_THRESHOLDS, onRegister }: Props) {
  const t = useTranslations("ctq");
  const [modal, setModal] = useState<{
    targetMonth: string;
    itemCode: string;
    processCode: string;
    processLabel: string;
  } | null>(null);
  const [detailModal, setDetailModal] = useState<{
    month: string;
    itemCode: string;
    processCode: string;
    processLabel: string;
    countermeasureNo: string;
  } | null>(null);

  return (
    <div className="overflow-auto h-full">
      <IndicatorDetailModal
        open={detailModal !== null}
        month={detailModal?.month ?? ""}
        itemCode={detailModal?.itemCode ?? ""}
        processCode={detailModal?.processCode ?? ""}
        processLabel={detailModal?.processLabel ?? ""}
        countermeasureNo={detailModal?.countermeasureNo ?? ""}
        onClose={() => setDetailModal(null)}
        onUpdate={async (newNo) => {
          if (!detailModal) return;
          await onRegister(detailModal.month, detailModal.itemCode, detailModal.processCode, newNo);
          setDetailModal(null);
        }}
        onDelete={async () => {
          if (!detailModal) return;
          await onRegister(detailModal.month, detailModal.itemCode, detailModal.processCode, "");
          setDetailModal(null);
        }}
      />
      <CountermeasureModal
        open={modal !== null}
        itemCode={modal?.itemCode ?? ""}
        processLabel={modal?.processLabel ?? ""}
        onSubmit={async (countermeasureNo) => {
          if (!modal) return;
          await onRegister(modal.targetMonth, modal.itemCode, modal.processCode, countermeasureNo);
          setModal(null);
        }}
        onClose={() => setModal(null)}
      />
      <table className="w-full text-sm border-separate border-spacing-0">
        {/* 2단 헤더 */}
        <thead className="sticky top-0 z-20" style={{ boxShadow: "0 2px 0 0 #1f2937" }}>
          {/* 1행: 공정명 (colspan=2) */}
          <tr className="bg-gray-800">
            <th
              className="text-left px-3 py-2 border border-gray-700 bg-gray-800 sticky left-0 z-30"
              rowSpan={2}
            >
              {t("pages.indicator.model")}
            </th>
            {PROCESS_KEYS.map((key) => (
              <th
                key={key}
                className={`text-center px-1 py-1.5 border border-gray-700 bg-gray-800 font-bold ${GROUP_BORDER}`}
                colSpan={2}
              >
                {PROCESS_LABELS[key]}{" "}
                <span className="text-gray-400 font-normal text-xs">PPM</span>
              </th>
            ))}
          </tr>
          {/* 2행: 전전월/전월 라벨 */}
          <tr className="text-xs bg-gray-800">
            {PROCESS_KEYS.map((key) => (
              <SubHeaders
                key={key}
                monthBeforeLabel={monthBefore.displayLabel}
                lastMonthLabel={lastMonth.displayLabel}
              />
            ))}
          </tr>
        </thead>
        <tbody>
          {models.map((model) => (
            <ModelRow
              key={model.itemCode}
              model={model}
              lastMonthKey={lastMonth.month}
              ppmThresholds={ppmThresholds}
              onOpenModal={(processKey) =>
                setModal({
                  targetMonth: lastMonth.month,
                  itemCode: model.itemCode,
                  processCode: processKey,
                  processLabel: PROCESS_LABELS[processKey],
                })
              }
              onOpenDetail={(processKey, countermeasureNo) =>
                setDetailModal({
                  month: lastMonth.month,
                  itemCode: model.itemCode,
                  processCode: processKey,
                  processLabel: PROCESS_LABELS[processKey],
                  countermeasureNo,
                })
              }
            />
          ))}
        </tbody>
      </table>
    </div>
  );
}

/** 공정별 서브헤더 (전전월/전월) */
function SubHeaders({
  monthBeforeLabel,
  lastMonthLabel,
}: {
  monthBeforeLabel: string;
  lastMonthLabel: string;
}) {
  return (
    <>
      <th
        className={`px-1 py-1 border border-gray-700 whitespace-nowrap bg-gray-800 text-gray-400 ${GROUP_BORDER}`}
      >
        {monthBeforeLabel}
      </th>
      <th className="px-1 py-1 border border-gray-700 whitespace-nowrap bg-indigo-900 text-indigo-200">
        {lastMonthLabel}
      </th>
    </>
  );
}

/** 모델 1행 */
function ModelRow({
  model,
  lastMonthKey,
  ppmThresholds,
  onOpenModal,
  onOpenDetail,
}: {
  model: IndicatorModelData;
  lastMonthKey: string;
  ppmThresholds: ProcessPpmThresholds;
  onOpenModal: (processKey: IndicatorProcessKey) => void;
  onOpenDetail: (processKey: IndicatorProcessKey, countermeasureNo: string) => void;
}) {
  return (
    <tr className="border-t border-gray-800 hover:bg-gray-800/30">
      <td className="px-3 py-1.5 font-medium text-gray-200 whitespace-nowrap border border-gray-800 sticky left-0 bg-gray-950 z-10">
        {model.itemCode}
      </td>
      {PROCESS_KEYS.map((key) => (
        <ProcessCells
          key={key}
          processKey={key}
          prev={model.monthBefore[key]}
          curr={model.lastMonth[key]}
          ppmThreshold={ppmThresholds[key]}
          onOpenModal={() => onOpenModal(key)}
          onOpenDetail={() => {
            const cm = model.lastMonth[key]?.countermeasureNo;
            if (cm) onOpenDetail(key, cm);
          }}
        />
      ))}
    </tr>
  );
}

/** 공정별 2셀 (전전월/전월) + 대책서 등록 버튼 */
function ProcessCells({
  processKey,
  prev,
  curr,
  ppmThreshold,
  onOpenModal,
  onOpenDetail,
}: {
  processKey: IndicatorProcessKey;
  prev?: MonthlyProcessData;
  curr?: MonthlyProcessData;
  /** 이 PPM 이상일 때만 지표 Logic(빨강/대책서 버튼) 적용 */
  ppmThreshold: number;
  onOpenModal: () => void;
  onOpenDetail: () => void;
}) {
  const t = useTranslations("ctq");
  const prevPpm = prev?.ppm ?? 0;
  const currPpm = curr?.ppm ?? 0;
  // PPM 한도 미만이면 지표 Logic 비적용 (색상 계산에서 제외)
  const aboveThreshold = prevPpm >= ppmThreshold || currPpm >= ppmThreshold;
  const color = aboveThreshold ? getRatioColor(prevPpm, currPpm) : "text-gray-500";
  const needsAction = aboveThreshold && isOver200(prevPpm, currPpm);
  const hasCountermeasure = !!curr?.countermeasureNo;
  const baseCellClass = "px-2 py-1.5 text-center border border-gray-800";

  return (
    <>
      <td className={`${baseCellClass} ${GROUP_BORDER} ${prevPpm > 0 ? "text-gray-300" : "text-gray-600"}`}>
        {formatPpm(prevPpm)}
      </td>
      <td className={`${baseCellClass} whitespace-nowrap bg-indigo-950/60 ${color}`}>
        <div className="flex items-center justify-center gap-1">
          <span>{getRatioText(prevPpm, currPpm)}</span>
          {needsAction && !hasCountermeasure && (
            <button
              onClick={onOpenModal}
              className="ml-1 px-1.5 py-0.5 text-[10px] rounded bg-red-600 hover:bg-red-500 text-white font-medium"
            >
              {t('pages.indicator.gradeC')}
            </button>
          )}
          {needsAction && hasCountermeasure && (
            <button
              onClick={onOpenDetail}
              className="ml-1 px-1.5 py-0.5 text-[10px] rounded bg-green-700 hover:bg-green-600 text-green-100 font-medium cursor-pointer"
              title={`${t('pages.indicator.countermeasure')}: ${curr!.countermeasureNo!}`}
            >
              OK
            </button>
          )}
        </div>
      </td>
    </>
  );
}

/** 대책서번호 등록 모달 */
function CountermeasureModal({
  open, itemCode, processLabel, onSubmit, onClose,
}: {
  open: boolean;
  itemCode: string;
  processLabel: string;
  onSubmit: (countermeasureNo: string) => Promise<void>;
  onClose: () => void;
}) {
  const t = useTranslations("ctq");
  const [inputVal, setInputVal] = useState("");
  const [submitting, setSubmitting] = useState(false);

  if (!open) return null;

  const handleSubmit = async () => {
    const val = inputVal.trim();
    if (!val) return;
    setSubmitting(true);
    try {
      await onSubmit(val);
      setInputVal("");
    } finally {
      setSubmitting(false);
    }
  };

  return createPortal(
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-sm"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="w-full max-w-md bg-gray-900 border border-gray-700 rounded-xl shadow-2xl p-6">
        <h3 className="text-lg font-bold text-white mb-1">{t('pages.indicator.countermeasure')} {t('pages.indicator.register')}</h3>
        <p className="text-sm text-gray-400 mb-4">
          <span className="text-gray-200 font-medium">{itemCode}</span>
          <span className="mx-2 text-gray-600">|</span>
          <span className="text-cyan-400">{processLabel}</span>
          <span className="mx-2 text-gray-600">|</span>
          <span className="text-red-400">{t('pages.indicator.exceeded200')}</span>
        </p>
        <label className="block text-xs text-gray-400 mb-1.5">{t('pages.indicator.countermeasureNo')}</label>
        <input
          autoFocus
          value={inputVal}
          onChange={(e) => setInputVal(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") handleSubmit();
            if (e.key === "Escape") onClose();
          }}
          placeholder={t('pages.indicator.enterCountermeasure')}
          disabled={submitting}
          className="w-full px-3 py-2 rounded-lg bg-gray-800 border border-gray-600 text-sm text-gray-200 focus:outline-none focus:border-blue-500 disabled:opacity-50"
        />
        <div className="flex justify-end gap-2 mt-4">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm rounded-lg bg-gray-800 text-gray-300 hover:bg-gray-700"
          >
            {t('pages.indicator.cancel')}
          </button>
          <button
            onClick={handleSubmit}
            disabled={submitting || !inputVal.trim()}
            className="px-4 py-2 text-sm rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-medium disabled:opacity-50"
          >
            {submitting ? t('pages.indicator.registering') : t('pages.indicator.register')}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
