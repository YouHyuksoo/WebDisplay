/**
 * @file src/app/(mxvc)/mxvc/traceability/page.tsx
 * @description 멕시코전장 추적성분석 — 바코드 기반 제품 생산 이력 추적
 *
 * 초보자 가이드:
 * 1. BARCODE 입력 → 조회 버튼 또는 Enter 키로 검색
 * 2. API `/api/mxvc/traceability` 호출하여 마스터 + 타임라인 데이터 조회
 * 3. TraceabilityMaster: 제품 기본 정보 (바코드, 모델, 라인 등) 표시
 * 4. TraceabilityTimeline: 시간순 이벤트 타임라인 표시
 * 5. 조회 결과 건수를 상단에 표시, 에러 시 에러 메시지 표시
 */
'use client'

import { useState, useCallback } from 'react'
import DisplayHeader from '@/components/display/DisplayHeader'
import DisplayFooter from '@/components/display/DisplayFooter'
import TraceabilityMaster from '@/components/mxvc/TraceabilityMaster'
import TraceabilityTimeline from '@/components/mxvc/TraceabilityTimeline'
import type { TraceabilityResponse } from '@/types/mxvc/traceability'

const SCREEN_ID = 'mxvc-traceability'

export default function TraceabilityPage() {
  const [barcode, setBarcode] = useState('')
  const [data, setData] = useState<TraceabilityResponse | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [includeMaterial, setIncludeMaterial] = useState(false);

  /** 바코드 조회 */
  const handleSearch = useCallback(async () => {
    const trimmed = barcode.trim()
    if (!trimmed) {
      setError('바코드를 입력해주세요')
      return
    }

    setLoading(true)
    setError('')

    try {
      const params = new URLSearchParams({ barcode: trimmed });
      if (includeMaterial) params.set('material', '1');
      const response = await fetch(`/api/mxvc/traceability?${params}`)
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`)
      }
      const result: TraceabilityResponse = await response.json()
      setData(result)
    } catch (err) {
      setError(`조회 실패: ${err instanceof Error ? err.message : '알 수 없는 오류'}`)
      setData(null)
    } finally {
      setLoading(false)
    }
  }, [barcode, includeMaterial])

  /** Enter 키 처리 */
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleSearch()
    }
  }

  const [viewMode, setViewMode] = useState<'process' | 'timeline'>('process');
  const resultCount = data?.timeline?.length ?? 0

  return (
    <div className="h-screen flex flex-col bg-white dark:bg-gray-950 text-gray-900 dark:text-white overflow-hidden">
      <DisplayHeader title="멕시코전장 추적성분석" screenId={SCREEN_ID} />

      {/* 검색 바 */}
      <div className="shrink-0 flex items-center gap-3 px-5 py-3 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/80">
        <label className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300">
          <span className="font-semibold min-w-fit">BARCODE</span>
          <input
            type="text"
            value={barcode}
            onChange={(e) => setBarcode(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="바코드 입력"
            className="px-3 py-1.5 rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-sm w-64 placeholder:text-gray-400"
          />
        </label>
        <label className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400 cursor-pointer select-none">
          <input
            type="checkbox"
            checked={includeMaterial}
            onChange={(e) => setIncludeMaterial(e.target.checked)}
            className="w-3.5 h-3.5 rounded border-gray-300 dark:border-gray-600"
          />
          자재포함
        </label>
        <button
          onClick={handleSearch}
          disabled={loading}
          className="px-4 py-1.5 rounded bg-blue-500 hover:bg-blue-600 text-white text-sm font-semibold disabled:opacity-50 transition-colors"
        >
          조회
        </button>
        {/* 뷰 모드 토글 */}
        {data && (
          <div className="flex items-center gap-1 ml-4 bg-gray-200 dark:bg-gray-700 rounded-lg p-0.5">
            <button
              onClick={() => setViewMode('process')}
              className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${
                viewMode === 'process'
                  ? 'bg-white dark:bg-gray-600 text-gray-900 dark:text-white shadow-sm'
                  : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
              }`}
            >
              공정별
            </button>
            <button
              onClick={() => setViewMode('timeline')}
              className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${
                viewMode === 'timeline'
                  ? 'bg-white dark:bg-gray-600 text-gray-900 dark:text-white shadow-sm'
                  : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
              }`}
            >
              타임라인
            </button>
          </div>
        )}
        <div className="ml-auto text-sm text-gray-500 dark:text-gray-400">
          {data && `${resultCount}개 이벤트`}
        </div>
      </div>

      {/* 에러 바 */}
      {error && (
        <div className="shrink-0 px-6 py-2 bg-red-50 dark:bg-red-900/30 border-b border-red-300 dark:border-red-700 text-red-600 dark:text-red-300 text-sm">
          {error}
        </div>
      )}

      {/* 메인 영역 */}
      <div className="flex-1 min-h-0 overflow-auto">
        {loading ? (
          <div className="flex flex-col items-center justify-center h-64 gap-3">
            <span className="w-8 h-8 border-3 border-gray-300 dark:border-gray-600 border-t-blue-500 rounded-full animate-spin" />
            <span className="text-sm text-gray-500 dark:text-gray-400">추적성 데이터 취합 중입니다. 잠시만 기다려주세요...</span>
          </div>
        ) : !data ? (
          <div className="flex items-center justify-center h-64 text-gray-500">
            바코드를 입력하고 조회 버튼을 눌러주세요
          </div>
        ) : (
          <div className="space-y-4 pb-4">
            <TraceabilityMaster
              master={data.master}
              runCard={data.runCard}
              modelMaster={data.modelMaster}
            />
            <TraceabilityTimeline events={data.timeline} queriedTables={data.queriedTables} viewMode={viewMode} />
          </div>
        )}
      </div>

      <DisplayFooter />
    </div>
  )
}
