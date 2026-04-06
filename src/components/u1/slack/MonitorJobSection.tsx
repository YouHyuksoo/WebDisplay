/**
 * @file src/components/u1/slack/MonitorJobSection.tsx
 * @description
 * CTQ 이상점 백그라운드 모니터 제어 UI 컴포넌트.
 *
 * 초보자 가이드:
 * 1. 잡 상태(실행중/정지) 표시 + 시작/정지 버튼
 * 2. 검사 주기(분) 설정 입력
 * 3. 3개 카테고리 개별 ON/OFF 토글
 * 4. 즉시 실행 버튼 (테스트용)
 * 5. 최근 감지 로그 목록 (A등급 감지 이력)
 * 6. envEnabled=false 서버에서는 경고 배너 표시
 */

'use client';

import { useState, useEffect, useCallback } from 'react';
import type { SlackSettings } from '@/app/(u1)/u1/slack-settings/page';
import type { MonitorLog } from '@/lib/monitor/monitor-state';

interface MonitorStatus {
  isRunning: boolean;
  lastRunAt: string | null;
  logs: MonitorLog[];
  envEnabled: boolean;
}

interface MonitorJobSectionProps {
  settings: SlackSettings;
  onSettingsChange: (field: keyof SlackSettings, value: unknown) => void;
}

const CATEGORY_ITEMS = [
  { field: 'monitorRepeatability' as keyof SlackSettings, label: '반복성', desc: '연속 동일위치 NG (FT/ATE)' },
  { field: 'monitorNonConsecutive' as keyof SlackSettings, label: '연속반복성', desc: '비연속 동일위치 NG (FT/ATE)' },
  { field: 'monitorAccident' as keyof SlackSettings, label: '사고성', desc: 'HIPOT/BURNIN/ATE 판정 NG' },
] as const;

export default function MonitorJobSection({ settings, onSettingsChange }: MonitorJobSectionProps) {
  const [status, setStatus] = useState<MonitorStatus | null>(null);
  const [isStarting, setIsStarting] = useState(false);
  const [isStopping, setIsStopping] = useState(false);
  const [isRunningNow, setIsRunningNow] = useState(false);
  const [statusMsg, setStatusMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const fetchStatus = useCallback(async () => {
    try {
      const res = await fetch('/api/monitor/status');
      if (res.ok) setStatus(await res.json());
    } catch { /* 무시 */ }
  }, []);

  useEffect(() => {
    fetchStatus();
    const id = setInterval(fetchStatus, 30_000);
    return () => clearInterval(id);
  }, [fetchStatus]);

  useEffect(() => {
    if (!statusMsg) return;
    const t = setTimeout(() => setStatusMsg(null), 4000);
    return () => clearTimeout(t);
  }, [statusMsg]);

  const handleStart = async () => {
    setIsStarting(true);
    try {
      const res = await fetch('/api/monitor/start', { method: 'POST' });
      if (res.ok) {
        setStatusMsg({ type: 'success', text: '백그라운드 모니터를 시작했습니다.' });
        await fetchStatus();
      } else {
        const err = await res.json();
        setStatusMsg({ type: 'error', text: err.error || '시작에 실패했습니다.' });
      }
    } catch {
      setStatusMsg({ type: 'error', text: '오류가 발생했습니다.' });
    } finally {
      setIsStarting(false);
    }
  };

  const handleStop = async () => {
    setIsStopping(true);
    try {
      const res = await fetch('/api/monitor/stop', { method: 'POST' });
      if (res.ok) {
        setStatusMsg({ type: 'success', text: '백그라운드 모니터를 정지했습니다.' });
        await fetchStatus();
      } else {
        setStatusMsg({ type: 'error', text: '정지에 실패했습니다.' });
      }
    } catch {
      setStatusMsg({ type: 'error', text: '오류가 발생했습니다.' });
    } finally {
      setIsStopping(false);
    }
  };

  const handleRunNow = async () => {
    setIsRunningNow(true);
    try {
      const res = await fetch('/api/monitor/run-now', { method: 'POST' });
      if (res.ok) {
        setStatusMsg({ type: 'success', text: '즉시 실행 완료. 로그를 확인하세요.' });
        await fetchStatus();
      } else {
        setStatusMsg({ type: 'error', text: '즉시 실행에 실패했습니다.' });
      }
    } catch {
      setStatusMsg({ type: 'error', text: '오류가 발생했습니다.' });
    } finally {
      setIsRunningNow(false);
    }
  };

  const isRunning = status?.isRunning ?? false;
  const envEnabled = status?.envEnabled ?? true;

  return (
    <div className="bg-gray-900 rounded-xl p-5 border border-gray-700 space-y-4">
      {/* 헤더 */}
      <div className="flex items-center justify-between">
        <h3 className="text-gray-200 font-semibold flex items-center gap-2">
          <span className="text-orange-400">⚙️</span>
          CTQ 이상점 백그라운드 모니터
        </h3>
        <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${
          isRunning ? 'bg-green-900 text-green-300' : 'bg-gray-700 text-gray-400'
        }`}>
          {isRunning ? '● 실행중' : '○ 정지'}
        </span>
      </div>

      <p className="text-gray-500 text-sm">
        A등급 이상점 감지 시 Teams 알림을 자동으로 발송합니다.
        OK→A 전환 시점에만 알림을 보내 중복 발송을 방지합니다.
      </p>

      {/* 환경변수 비활성 경고 배너 */}
      {status !== null && !envEnabled && (
        <div className="px-3 py-2 rounded-lg bg-yellow-900/40 text-yellow-300 border border-yellow-700 text-xs">
          ⚠️ 이 서버는 CTQ_MONITOR_ENABLED=false — 모니터링이 비활성화된 서버입니다.
        </div>
      )}

      {/* 상태 메시지 */}
      {statusMsg && (
        <div className={`px-3 py-2 rounded-lg text-sm ${
          statusMsg.type === 'success'
            ? 'bg-green-900/50 text-green-300 border border-green-700'
            : 'bg-red-900/50 text-red-300 border border-red-700'
        }`}>
          {statusMsg.type === 'success' ? '✅ ' : '❌ '}{statusMsg.text}
        </div>
      )}

      {/* 검사 주기 */}
      <div>
        <label className="block text-sm font-medium text-gray-300 mb-1.5">
          검사 주기 (분)
        </label>
        <input
          type="number"
          min={1}
          max={60}
          value={settings.monitorIntervalMinutes ?? 5}
          onChange={(e) => onSettingsChange('monitorIntervalMinutes', Number(e.target.value))}
          className="w-28 px-3 py-2 rounded-lg bg-gray-800 border border-gray-600 text-gray-200 outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500 text-sm"
        />
        <p className="mt-1 text-xs text-gray-500">설정 저장 후 재시작하면 반영됩니다</p>
      </div>

      {/* 카테고리 토글 */}
      <div className="space-y-1">
        <p className="text-sm font-medium text-gray-300 mb-1">모니터링 대상</p>
        {CATEGORY_ITEMS.map((item) => (
          <label
            key={item.field}
            className="flex items-center justify-between p-3 rounded-lg hover:bg-gray-800 cursor-pointer transition-colors"
          >
            <div>
              <p className="text-gray-200 text-sm font-medium">{item.label}</p>
              <p className="text-gray-500 text-xs mt-0.5">{item.desc}</p>
            </div>
            <button
              onClick={() => onSettingsChange(item.field, !settings[item.field])}
              className={`relative w-10 h-5 rounded-full overflow-hidden transition-colors focus:outline-none flex-shrink-0 ${
                settings[item.field] ? 'bg-orange-500' : 'bg-gray-600'
              }`}
              type="button"
            >
              <span className={`absolute top-0.5 left-0 w-4 h-4 bg-white rounded-full shadow transition-transform ${
                settings[item.field] ? 'translate-x-5' : 'translate-x-0.5'
              }`} />
            </button>
          </label>
        ))}
      </div>

      {/* 제어 버튼 */}
      <div className="flex items-center gap-2 flex-wrap">
        {!isRunning ? (
          <button
            onClick={handleStart}
            disabled={isStarting || !envEnabled}
            className="px-4 py-2 bg-green-700 hover:bg-green-600 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-medium rounded-lg transition-colors"
          >
            {isStarting ? '⏳ 시작 중...' : '▶ 모니터 시작'}
          </button>
        ) : (
          <button
            onClick={handleStop}
            disabled={isStopping}
            className="px-4 py-2 bg-red-700 hover:bg-red-600 disabled:opacity-50 text-white text-sm font-medium rounded-lg transition-colors"
          >
            {isStopping ? '⏳ 정지 중...' : '■ 모니터 정지'}
          </button>
        )}
        <button
          onClick={handleRunNow}
          disabled={isRunningNow}
          className="px-4 py-2 bg-gray-700 hover:bg-gray-600 disabled:opacity-50 text-gray-200 text-sm font-medium rounded-lg transition-colors border border-gray-600"
        >
          {isRunningNow ? '⏳ 실행 중...' : '⚡ 즉시 실행'}
        </button>
      </div>

      {/* 마지막 실행 시간 */}
      {status?.lastRunAt && (
        <p className="text-xs text-gray-500">
          마지막 실행: {new Date(status.lastRunAt).toLocaleString('ko-KR')}
        </p>
      )}

      {/* 최근 로그 */}
      {status?.logs && status.logs.length > 0 && (
        <div>
          <p className="text-sm font-medium text-gray-300 mb-2">최근 감지 로그</p>
          <div className="space-y-1 max-h-40 overflow-y-auto">
            {status.logs.map((log, i) => (
              <div
                key={i}
                className="flex items-center gap-2 px-3 py-1.5 rounded bg-gray-800 text-xs"
              >
                <span className="text-red-400 font-bold">A</span>
                <span className="text-gray-300">{log.lineName}</span>
                <span className="text-gray-500">[{log.process}]</span>
                <span className={`ml-auto ${log.notified ? 'text-green-400' : 'text-gray-600'}`}>
                  {log.notified ? '📨 전송' : '—'}
                </span>
                <span className="text-gray-600">
                  {new Date(log.at).toLocaleTimeString('ko-KR')}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
