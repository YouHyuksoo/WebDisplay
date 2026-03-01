/**
 * @file TempHumidityCard.tsx
 * @description 개별 설비 온습도 카드. PB 원본 4칼럼 카드 레이아웃의 단일 카드 단위.
 * 초보자 가이드: 각 설비의 온도/습도를 카드 형태로 표시한다.
 * 헤더: 다크 배경 고정. 데이터 수신 중단(10분 초과) 시 빨간 dot 표시.
 * 상태 인디케이터: OK → 녹색, WN → 주황 깜빡임, NG → 빨강 깜빡임.
 * humidity_yn='N'이면 습도 섹션을 숨긴다.
 */
'use client';

/** Oracle 조회 결과 행 타입 (컬럼명 대문자) */
export interface SensorRow {
  MACHINE_NAME: string;
  ROOM_TEMPERATURE: number | null;
  HUMIDITY: number | null;
  TEMP_STATUS: 'OK' | 'WN' | 'NG';
  HUMIDITY_STATUS: 'OK' | 'WN' | 'NG';
  LAST_TIME: number | null;
  MES_DISPLAY_SEQUENCE: number;
  TEMP_MINMAX: string;
  HUMIDITY_MINMAX: string;
  HUMIDITY_YN: string;
  MACHINE_CODE: string;
}

interface TempHumidityCardProps {
  sensor: SensorRow;
}

/** 상태 코드에 따른 색상 블록 CSS 클래스 */
function getStatusBlockClass(status: 'OK' | 'WN' | 'NG'): string {
  switch (status) {
    case 'OK':
      return 'bg-emerald-500';
    case 'WN':
      return 'bg-amber-500 animate-pulse';
    case 'NG':
      return 'bg-red-600 animate-pulse';
  }
}

/** 상태 코드에 따른 값 텍스트 색상 */
function getValueTextClass(status: 'OK' | 'WN' | 'NG'): string {
  switch (status) {
    case 'OK':
      return 'text-zinc-900 dark:text-zinc-100';
    case 'WN':
      return 'text-zinc-900 dark:text-zinc-100';
    case 'NG':
      return 'text-red-600 dark:text-red-400';
  }
}

/** 데이터 수신 중단 여부 — 10분 초과 + SP가 아닌 경우 */
function isStaleData(lastTime: number | null, machineCode: string): boolean {
  return lastTime !== null && lastTime >= 10 && !machineCode.startsWith('SP');
}

/** 온도 아이콘 (온도계) */
function TempIcon() {
  return (
    <svg className="h-6 w-6 shrink-0 text-rose-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 14.76V3.5a2.5 2.5 0 0 0-5 0v11.26a4.5 4.5 0 1 0 5 0z" />
    </svg>
  );
}

/** 습도 아이콘 (물방울) */
function HumiIcon() {
  return (
    <svg className="h-6 w-6 shrink-0 text-sky-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 2.69l5.66 5.66a8 8 0 1 1-11.31 0z" />
    </svg>
  );
}

export default function TempHumidityCard({ sensor }: TempHumidityCardProps) {
  const showHumidity = sensor.HUMIDITY_YN !== 'N';
  const stale = isStaleData(sensor.LAST_TIME, sensor.MACHINE_CODE);

  return (
    <div className="flex flex-col overflow-hidden rounded-xl border-2 border-zinc-300 bg-white shadow-lg dark:border-zinc-600 dark:bg-zinc-900 dark:shadow-black/40">
      {/* 설비명 헤더 — 다크 고정, stale 시 빨간 dot */}
      <div className="flex items-center justify-center gap-2 bg-zinc-700 px-4 py-2.5 dark:bg-zinc-800">
        {stale && (
          <span className="h-2.5 w-2.5 shrink-0 animate-pulse rounded-full bg-red-500" />
        )}
        <span className="text-lg font-bold tracking-wide text-white">
          {sensor.MACHINE_NAME}
        </span>
      </div>

      {/* 온도 섹션 */}
      <div className="px-4 py-3">
        <div className="mb-2 text-center text-xs font-semibold text-zinc-400 dark:text-zinc-500">
          {sensor.TEMP_MINMAX}
        </div>
        <div className="flex items-center gap-3">
          <TempIcon />
          <span className="text-sm font-bold text-zinc-400 dark:text-zinc-500">TEMP</span>
          <span className={`ml-auto text-2xl font-black tabular-nums ${getValueTextClass(sensor.TEMP_STATUS)}`}>
            {sensor.ROOM_TEMPERATURE != null ? `${sensor.ROOM_TEMPERATURE}°C` : '-'}
          </span>
          <div className={`h-8 w-8 shrink-0 rounded-md ${getStatusBlockClass(sensor.TEMP_STATUS)}`} />
        </div>
      </div>

      {/* 온도/습도 구분선 */}
      {showHumidity && (
        <div className="mx-4">
          <div className="border-t border-zinc-200 dark:border-zinc-700" />
        </div>
      )}

      {/* 습도 섹션 — humidity_yn='N'이면 숨김 */}
      {showHumidity && (
        <div className="px-4 py-3">
          <div className="mb-2 text-center text-xs font-semibold text-zinc-400 dark:text-zinc-500">
            {sensor.HUMIDITY_MINMAX}
          </div>
          <div className="flex items-center gap-3">
            <HumiIcon />
            <span className="text-sm font-bold text-zinc-400 dark:text-zinc-500">HUMI</span>
            <span className={`ml-auto text-2xl font-black tabular-nums ${getValueTextClass(sensor.HUMIDITY_STATUS)}`}>
              {sensor.HUMIDITY != null ? `${sensor.HUMIDITY}%` : '-'}
            </span>
            <div className={`h-8 w-8 shrink-0 rounded-md ${getStatusBlockClass(sensor.HUMIDITY_STATUS)}`} />
          </div>
        </div>
      )}
    </div>
  );
}
