/**
 * @file src/components/ctq/IndicatorDetailModal.tsx
 * @description 지표 불량 상세 모달 -- IQ_DAILY_NOTIFY 이력 조회 + 대책서 수정/삭제
 *
 * 초보자 가이드:
 * 1. OK 클릭 시 해당 모델+월+공정의 IQ_DAILY_NOTIFY 이력 표시
 * 2. 폼 스타일 카드 레이아웃 (레거시 시스템과 유사)
 * 3. 대책서번호 수정/삭제 기능 포함
 * 4. 첨부 이미지 (검사/문서/NG) 썸네일 + 확대 뷰어
 */

"use client";

import { useState, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";
import { useTranslations } from "next-intl";
import type { NotifyRecord } from "@/types/ctq/indicator";

interface Props {
  open: boolean;
  month: string;
  itemCode: string;
  processCode: string;
  processLabel: string;
  countermeasureNo: string;
  onClose: () => void;
  onUpdate: (countermeasureNo: string) => Promise<void>;
  onDelete: () => Promise<void>;
}

/** 라벨+값 한 쌍 */
function Field({ label, value, highlight }: { label: string; value: string | number; highlight?: boolean }) {
  return (
    <div className="flex items-baseline gap-2">
      <span className="text-gray-500 text-xs whitespace-nowrap min-w-[90px] text-right">{label}</span>
      <span className={`text-sm font-medium ${highlight ? "text-cyan-300" : "text-gray-200"} break-all`}>
        {value === "-" || value === "" || value === "*" ? <span className="text-gray-600">-</span> : value}
      </span>
    </div>
  );
}

export default function IndicatorDetailModal({
  open, month, itemCode, processCode, processLabel, countermeasureNo, onClose, onUpdate, onDelete,
}: Props) {
  const t = useTranslations("ctq");
  const tc = useTranslations("common");
  const [records, setRecords] = useState<NotifyRecord[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  const [editVal, setEditVal] = useState(countermeasureNo);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!open || !countermeasureNo) return;
    setLoading(true);
    setError(null);
    fetch(`/api/ctq/indicator/details?countermeasure=${encodeURIComponent(countermeasureNo)}`)
      .then((res) => res.json())
      .then((data) => { setRecords(data.records ?? []); setTotal(data.total ?? 0); })
      .catch((err) => setError(String(err)))
      .finally(() => setLoading(false));
  }, [open, countermeasureNo]);

  const handleBackdrop = useCallback(
    (e: React.MouseEvent) => { if (e.target === e.currentTarget) onClose(); },
    [onClose]
  );

  if (!open) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
      onClick={handleBackdrop}
    >
      <div className="w-full max-w-5xl max-h-[85vh] bg-gray-900 border border-gray-700 rounded-xl shadow-2xl flex flex-col">
        {/* 헤더 */}
        <div className="px-6 py-4 border-b border-gray-700 shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <h2 className="text-xl font-bold text-white">{t('table.ngDetail')}</h2>
              <span className="text-white font-bold text-lg">{itemCode}</span>
              <span className="text-gray-600">|</span>
              <span className="text-cyan-400 font-semibold text-lg">{processLabel}</span>
              <span className="text-gray-600">|</span>
              <span className="text-gray-300">{month}</span>
              <span className="text-gray-600">|</span>
              <span className="text-sm text-gray-400">{loading ? t('pages.indicator.searching') : t('pages.indicator.totalCount', { count: total })}</span>
            </div>
            <button onClick={onClose} className="p-1 rounded hover:bg-gray-800 text-gray-400 hover:text-white">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          <div className="flex items-center gap-3 mt-2">
            {!editing ? (
              <>
                <span className="text-sm text-green-400 font-medium">{t('pages.indicator.countermeasure')}: {countermeasureNo}</span>
                <button
                  onClick={() => { setEditing(true); setEditVal(countermeasureNo); }}
                  className="px-2.5 py-1 text-xs rounded bg-gray-700 hover:bg-gray-600 text-gray-300"
                >{tc('edit')}</button>
                <button
                  onClick={async () => {
                    if (!confirm(t('pages.indicator.deleteConfirm'))) return;
                    setSubmitting(true);
                    try { await onDelete(); } finally { setSubmitting(false); }
                  }}
                  disabled={submitting}
                  className="px-2.5 py-1 text-xs rounded bg-red-800 hover:bg-red-700 text-red-200 disabled:opacity-50"
                >{tc('delete')}</button>
              </>
            ) : (
              <>
                <input
                  autoFocus
                  value={editVal}
                  onChange={(e) => setEditVal(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && editVal.trim()) {
                      setSubmitting(true);
                      onUpdate(editVal.trim()).finally(() => { setSubmitting(false); setEditing(false); });
                    }
                    if (e.key === "Escape") setEditing(false);
                  }}
                  disabled={submitting}
                  className="px-3 py-1 text-sm rounded bg-gray-800 border border-gray-600 text-gray-200 focus:outline-none focus:border-blue-500 w-48"
                />
                <button
                  onClick={async () => {
                    if (!editVal.trim()) return;
                    setSubmitting(true);
                    try { await onUpdate(editVal.trim()); } finally { setSubmitting(false); setEditing(false); }
                  }}
                  disabled={submitting || !editVal.trim()}
                  className="px-3 py-1 text-xs rounded bg-blue-600 hover:bg-blue-500 text-white disabled:opacity-50"
                >{tc('save')}</button>
                <button onClick={() => setEditing(false)} className="px-3 py-1 text-xs rounded bg-gray-700 hover:bg-gray-600 text-gray-300">{t('pages.indicator.cancel')}</button>
              </>
            )}
          </div>
        </div>

        {/* 본문 -- 카드 리스트 */}
        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
          {loading ? (
            <div className="flex items-center justify-center h-32 text-gray-500">{t('pages.indicator.searching')}</div>
          ) : error ? (
            <div className="flex items-center justify-center h-32 text-red-400 text-sm">{t('common.dataError')}: {error}</div>
          ) : records.length === 0 ? (
            <div className="flex items-center justify-center h-32 text-gray-500 text-sm">{t('pages.indicator.noData')}</div>
          ) : (
            records.map((r, i) => (
              <div key={i} className="border border-gray-700 rounded-lg bg-gray-800/50 p-4">
                <div className="flex items-center gap-2 mb-3 pb-2 border-b border-gray-700">
                  <span className="text-xs bg-gray-700 text-gray-300 px-2 py-0.5 rounded">#{i + 1}</span>
                  <span className="text-sm font-bold text-yellow-300 font-mono">{r.serialNo}</span>
                  <span className={`ml-auto text-xs px-2 py-0.5 rounded font-medium ${
                    r.completeYn === "Y" ? "bg-green-800 text-green-200" : "bg-orange-800 text-orange-200"
                  }`}>
                    {r.completeYn === "Y" ? t('pages.indicator.complete') : t('pages.indicator.inProgress')}
                  </span>
                </div>
                {/* 3단 레이아웃 */}
                <div className="grid grid-cols-[2fr_1fr_1.5fr] gap-4">
                  {/* 좌측 -- 기본 정보 */}
                  <div>
                    <div className="grid grid-cols-2 gap-x-4 gap-y-1.5">
                      <Field label={t('pages.indicator.occurDate')} value={r.actionDate} />
                      <Field label={t('pages.indicator.startTime')} value={r.startTime} />
                      <Field label={t('pages.indicator.lineName')} value={r.lineName} />
                      <Field label={t('pages.indicator.endTime')} value={r.endTime} />
                      <Field label={t('pages.indicator.processName')} value={r.workstageName} highlight />
                      <Field label={t('pages.indicator.itemCode')} value={r.itemCode} />
                      <Field label={t('pages.indicator.machineCode')} value={r.machineCode} />
                      <Field label={t('pages.indicator.runNo')} value={r.runNo} />
                      <Field label={t('pages.indicator.modelName')} value={r.modelName} />
                      <Field label={t('pages.indicator.detectLocation')} value={r.detectLocation} />
                    </div>
                    <div className="mt-1.5"><Field label={t('pages.indicator.locationCode')} value={r.locationInfo} /></div>
                    <div className="mt-1.5"><Field label={t('pages.indicator.serialNo')} value={r.serialNo} highlight /></div>
                    <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 mt-2">
                      <Field label={t('pages.indicator.grade')} value={r.grade} />
                      <Field label={t('pages.indicator.badReason')} value={r.badReasonName} />
                      <Field label={t('pages.indicator.badQty')} value={r.inspectBadQty} />
                      <Field label={t('pages.indicator.badDesc')} value={r.badDescription} />
                      <Field label={t('pages.indicator.inspQty')} value={r.inspectQty} />
                      <Field label={t('pages.indicator.materialMaker')} value={r.materialMaker} />
                    </div>
                    <div className="mt-3">
                      <span className="text-gray-500 text-xs">{t('pages.indicator.anomalyDetail')}</span>
                      <div className="mt-1 p-2 rounded bg-gray-900 border border-gray-700 min-h-[50px] text-sm text-gray-200 whitespace-pre-wrap">
                        {r.lineStatusNotify === "-" ? "" : r.lineStatusNotify}
                      </div>
                    </div>
                  </div>
                  {/* 중간 -- 상태 */}
                  <div className="space-y-1.5">
                    <Field label={t('pages.indicator.notifyStatus')} value={r.notifyStatusName} />
                    <Field label={t('pages.indicator.processComplete')} value={r.completeYn === "Y" ? t('pages.indicator.complete') : t('pages.indicator.incomplete')} />
                    <Field label={t('pages.indicator.completeDate')} value={r.completeDate} />
                    <Field label={t('pages.indicator.inspCharger')} value={r.inspectCharger} />
                    <Field label={t('pages.indicator.qualityManager')} value={r.inspectManager} />
                    <Field label={t('pages.indicator.department')} value={r.departmentName} />
                  </div>
                  {/* 우측 -- 조치내역 + 품질의견 */}
                  <div className="space-y-3">
                    <div>
                      <span className="text-gray-500 text-xs">{t('pages.indicator.actionDetail')}</span>
                      <div className="mt-1 p-2 rounded bg-gray-900 border border-gray-700 min-h-[60px] text-sm text-gray-200 whitespace-pre-wrap">
                        {r.comments === "-" ? "" : r.comments}
                      </div>
                    </div>
                    <div>
                      <span className="text-gray-500 text-xs">{t('pages.indicator.qcComments')}</span>
                      <div className="mt-1 p-2 rounded bg-gray-900 border border-gray-700 min-h-[60px] text-sm text-gray-200 whitespace-pre-wrap">
                        {r.qcComments === "-" ? "" : r.qcComments}
                      </div>
                    </div>
                    <ImageSection record={r} />
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* 푸터 */}
        <div className="flex items-center justify-end px-6 py-3 border-t border-gray-700 shrink-0">
          <button onClick={onClose} className="px-4 py-2 text-sm rounded-lg bg-gray-800 text-gray-300 hover:bg-gray-700">{tc('close')}</button>
        </div>
      </div>
    </div>,
    document.body
  );
}

/** 이미지 URL 빌더 */
function buildImageUrl(r: NotifyRecord, type: string): string {
  return `/api/ctq/indicator/image?actionDate=${encodeURIComponent(r.actionDateRaw)}&seq=${r.notifySequence}&orgId=${r.organizationId}&type=${type}`;
}

/** 첨부 이미지 섹션 */
function ImageSection({ record: r }: { record: NotifyRecord }) {
  const t = useTranslations("ctq");
  const [viewImg, setViewImg] = useState<string | null>(null);

  const images = [
    { type: "inspect", label: t('pages.indicator.inspImage'), fileName: r.inspectImageFileName },
    { type: "document", label: t('pages.indicator.docImage'), fileName: r.documentImageFileName },
    { type: "ng", label: t('pages.indicator.ngImage'), fileName: r.ngImageFileName },
  ].filter((img) => img.fileName !== "-" && img.fileName !== "*" && img.fileName !== "");

  if (images.length === 0) return null;

  return (
    <>
      <div className="mt-3 pt-3 border-t border-gray-700">
        <span className="text-gray-500 text-xs">{t('pages.indicator.attachedImages')}</span>
        <div className="flex gap-3 mt-2">
          {images.map((img) => {
            const url = buildImageUrl(r, img.type);
            const isImage = /\.(jpg|jpeg|png|gif|bmp)$/i.test(img.fileName);
            return (
              <div key={img.type} className="text-center">
                {isImage ? (
                  <button
                    onClick={() => setViewImg(url)}
                    className="block w-24 h-24 rounded border border-gray-600 overflow-hidden bg-gray-900 hover:border-blue-500 transition-colors"
                  >
                    <img src={url} alt={img.label} className="w-full h-full object-cover" />
                  </button>
                ) : (
                  <a
                    href={url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-center w-24 h-24 rounded border border-gray-600 bg-gray-900 hover:border-blue-500 text-gray-400 hover:text-blue-400 transition-colors"
                  >
                    <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" />
                    </svg>
                  </a>
                )}
                <span className="text-[10px] text-gray-500 mt-1 block truncate w-24" title={img.fileName}>
                  {img.label}
                </span>
              </div>
            );
          })}
        </div>
      </div>
      {viewImg && createPortal(
        <div
          className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/80 cursor-pointer"
          onClick={() => setViewImg(null)}
        >
          <img src={viewImg} alt="zoom" className="max-w-[90vw] max-h-[90vh] object-contain rounded-lg shadow-2xl" />
        </div>,
        document.body
      )}
    </>
  );
}
