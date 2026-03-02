/**
 * @file TempHumidityStatus.tsx
 * @description 온습도 모니터링 메인 화면 (메뉴 37). SWR polling + 자동 페이징 + 다크 UI.
 * 초보자 가이드: API에서 데이터를 가져와 상단(NgBanner) + 하단(4칼럼 카드 그리드)에 전달.
 * 카드가 한 화면에 다 안 들어가면 PB 원본처럼 일정 간격으로 페이지를 순환한다.
 * DisplayLayout이 100vh 프레임(헤더+메시지바)을 제공하고, 콘텐츠는 스크롤 없이 꽉 찬다.
 * 설정 모달은 라인 선택 대신 센서(온습도기) 선택 모달을 사용한다.
 * PB 원본: w_display_temparture_status_ye.srw
 */
'use client';

import { useState, useEffect, useCallback } from 'react';
import useSWR from 'swr';
import DisplayLayout from '../../DisplayLayout';
import NgAlertBanner from '../../NgAlertBanner';
import TempHumidityCard, { type SensorRow } from './TempHumidityCard';
import SensorSelectModal from '@/components/common/SensorSelectModal';
import useDisplayTiming from '@/hooks/useDisplayTiming';
import { fetcher } from '@/lib/fetcher';
import { getSelectedSensors, buildDisplayApiUrl, DEFAULT_ORG_ID } from '@/lib/display-helpers';

/** 4칼럼 × 3행 = 12카드/페이지 고정 */
const CARDS_PER_PAGE = 12;

interface TempHumidityStatusProps {
  screenId: string;
}

export default function TempHumidityStatus({
  screenId,
}: TempHumidityStatusProps) {
  const timing = useDisplayTiming();
  const [selectedMachines, setSelectedMachines] = useState(() => getSelectedSensors(screenId));

  const { data, error, isLoading } = useSWR(
    buildDisplayApiUrl(screenId, { orgId: DEFAULT_ORG_ID, machines: encodeURIComponent(selectedMachines) }),
    fetcher,
    { refreshInterval: timing.refreshSeconds * 1000 },
  );

  const [page, setPage] = useState(0);
  const sensorData: SensorRow[] = data?.sensorData ?? [];
  const totalPages = Math.max(1, Math.ceil(sensorData.length / CARDS_PER_PAGE));

  /* 센서 선택 모달에서 저장 시 즉시 리페치 */
  const handleSensorChange = useCallback(() => {
    setSelectedMachines(getSelectedSensors(screenId));
    setPage(0);
  }, [screenId]);

  useEffect(() => {
    const eventName = `sensor-config-changed-${screenId}`;
    window.addEventListener(eventName, handleSensorChange);
    return () => window.removeEventListener(eventName, handleSensorChange);
  }, [screenId, handleSensorChange]);

  /** 자동 페이지 순환 — 2페이지 이상일 때만 */
  useEffect(() => {
    if (totalPages <= 1) {
      setPage(0);
      return;
    }
    const timer = setInterval(() => {
      setPage((prev) => (prev + 1) % totalPages);
    }, timing.scrollSeconds * 1000);
    return () => clearInterval(timer);
  }, [totalPages, timing.scrollSeconds]);

  /** 데이터 갱신 시 페이지 범위 초과 보정 */
  useEffect(() => {
    if (page >= totalPages) setPage(0);
  }, [page, totalPages]);

  /** 센서 선택 모달 렌더 함수 (DisplayLayout → DisplayHeader로 전달) */
  const renderSettingsModal = useCallback(
    (props: { isOpen: boolean; onClose: () => void; screenId: string }) => (
      <SensorSelectModal isOpen={props.isOpen} onClose={props.onClose} screenId={props.screenId} />
    ),
    [],
  );

  if (isLoading) {
    return (
      <DisplayLayout screenId={screenId} renderSettingsModal={renderSettingsModal}>
        <div className="flex h-full items-center justify-center text-zinc-400 dark:text-zinc-500">
          데이터 로딩 중...
        </div>
      </DisplayLayout>
    );
  }

  if (error) {
    return (
      <DisplayLayout screenId={screenId} renderSettingsModal={renderSettingsModal}>
        <div className="flex h-full items-center justify-center text-red-400 dark:text-red-500">
          데이터 로드 실패
        </div>
      </DisplayLayout>
    );
  }

  const ngCount: number = data?.ngCount ?? 0;
  const pageCards = sensorData.slice(
    page * CARDS_PER_PAGE,
    (page + 1) * CARDS_PER_PAGE,
  );

  return (
    <DisplayLayout
      title="Temperature & Humidity Status"
      screenId={screenId}
      renderSettingsModal={renderSettingsModal}
    >
      <div className="flex h-full flex-col overflow-hidden">
        {ngCount > 0 && <NgAlertBanner message={`Temperature / Humidity NG: ${ngCount}건 발생`} />}

        <div className="min-h-0 flex-1 overflow-hidden p-2">
          <div className="grid h-full grid-cols-4 grid-rows-3 gap-2">
            {pageCards.map((sensor) => (
              <TempHumidityCard key={sensor.MACHINE_CODE} sensor={sensor} />
            ))}
          </div>
        </div>

        {/* 페이지 인디케이터 — 2페이지 이상일 때만 표시 */}
        {totalPages > 1 && (
          <div className="flex shrink-0 items-center justify-center gap-1.5 bg-zinc-100 py-1 dark:bg-zinc-900">
            {Array.from({ length: totalPages }, (_, i) => (
              <div
                key={i}
                className={`h-2 rounded-full transition-all ${
                  i === page
                    ? 'w-6 bg-blue-500'
                    : 'w-2 bg-zinc-400 dark:bg-zinc-600'
                }`}
              />
            ))}
            <span className="ml-2 text-xs text-zinc-500 dark:text-zinc-400">
              {page + 1} / {totalPages}
            </span>
          </div>
        )}
      </div>
    </DisplayLayout>
  );
}
