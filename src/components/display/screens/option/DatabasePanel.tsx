/**
 * @file DatabasePanel.tsx
 * @description Oracle DB 연결 설정 패널. 호스트/포트/SID 등 설정, 테스트, 적용.
 * 초보자 가이드: /api/settings/database API를 호출하여 설정 조회/테스트/저장한다.
 */
'use client';

import { useState, useEffect, useCallback } from 'react';
import type { DatabaseConfig } from '@/types/option';

type Status = 'idle' | 'testing' | 'saving' | 'success' | 'error';

const EMPTY_CONFIG: DatabaseConfig = {
  host: '',
  port: 1521,
  connectionType: 'SERVICE_NAME',
  sidOrService: '',
  username: '',
  password: '',
};

export default function DatabasePanel() {
  const [config, setConfig] = useState<DatabaseConfig>(EMPTY_CONFIG);
  const [status, setStatus] = useState<Status>('idle');
  const [message, setMessage] = useState('');
  const [source, setSource] = useState<'env' | 'file' | 'unknown'>('unknown');

  const loadCurrent = useCallback(async () => {
    try {
      const res = await fetch('/api/settings/database');
      const data = await res.json();
      setSource(data.source ?? 'unknown');
      setConfig({
        host: data.host ?? '',
        port: data.port ?? 1521,
        connectionType: data.connectionType ?? 'SERVICE_NAME',
        sidOrService: data.sidOrService ?? '',
        username: data.username ?? '',
        password: '',
      });
    } catch { /* 기본값 유지 */ }
  }, []);

  useEffect(() => { loadCurrent(); }, [loadCurrent]);

  const connectString =
    config.connectionType === 'SERVICE_NAME'
      ? `${config.host}:${config.port}/${config.sidOrService}`
      : `${config.host}:${config.port}:${config.sidOrService}`;

  const handleTest = async () => {
    setStatus('testing');
    setMessage('');
    try {
      const res = await fetch('/api/settings/database', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'test', config }),
      });
      const data = await res.json();
      if (data.success) {
        setStatus('success');
        setMessage(data.banner);
      } else {
        setStatus('error');
        setMessage(data.error);
      }
    } catch (e) {
      setStatus('error');
      setMessage(String(e));
    }
  };

  const handleSave = async () => {
    setStatus('saving');
    setMessage('');
    try {
      const res = await fetch('/api/settings/database', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'save', config }),
      });
      const data = await res.json();
      if (data.success) {
        setStatus('success');
        setMessage('설정 저장 및 풀 재시작 완료');
      } else {
        setStatus('error');
        setMessage(data.error);
      }
    } catch (e) {
      setStatus('error');
      setMessage(String(e));
    }
  };

  const update = (partial: Partial<DatabaseConfig>) =>
    setConfig((prev) => ({ ...prev, ...partial }));

  const inputClass =
    'w-full rounded border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-100';
  const labelClass = 'mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300';

  return (
    <div className="space-y-5 p-6">
      <div className="flex items-center justify-between">
        <h3 className="text-base font-semibold text-zinc-800 dark:text-zinc-100">
          Oracle 데이터베이스 연결 설정
        </h3>
        {source !== 'unknown' && (
          <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${
            source === 'env' 
              ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' 
              : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'
          }`}>
            {source === 'env' ? '.env.local 기반' : '설정 파일 기반'}
          </span>
        )}
      </div>

      {/* 호스트 + 포트 */}
      <div className="grid grid-cols-3 gap-4">
        <div className="col-span-2">
          <label className={labelClass}>호스트 / IP</label>
          <input
            value={config.host}
            onChange={(e) => update({ host: e.target.value })}
            placeholder="192.168.1.100"
            className={inputClass}
          />
        </div>
        <div>
          <label className={labelClass}>포트</label>
          <input
            type="number"
            value={config.port}
            onChange={(e) => update({ port: Number(e.target.value) || 1521 })}
            className={inputClass}
          />
        </div>
      </div>

      {/* 연결 방식 */}
      <div>
        <label className={labelClass}>연결 방식</label>
        <div className="flex gap-6">
          {(['SID', 'SERVICE_NAME'] as const).map((type) => (
            <label key={type} className="flex items-center gap-2 text-sm text-zinc-700 dark:text-zinc-200">
              <input
                type="radio"
                name="connType"
                checked={config.connectionType === type}
                onChange={() => update({ connectionType: type })}
                className="accent-blue-600"
              />
              {type}
            </label>
          ))}
        </div>
      </div>

      {/* SID/Service 값 */}
      <div>
        <label className={labelClass}>
          {config.connectionType === 'SID' ? 'SID' : 'Service Name'}
        </label>
        <input
          value={config.sidOrService}
          onChange={(e) => update({ sidOrService: e.target.value })}
          placeholder="SOLUM"
          className={inputClass}
        />
      </div>

      {/* 사용자 */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className={labelClass}>사용자명</label>
          <input
            value={config.username}
            onChange={(e) => update({ username: e.target.value })}
            placeholder="ADMIN"
            className={inputClass}
          />
        </div>
        <div>
          <label className={labelClass}>비밀번호</label>
          <input
            type="password"
            value={config.password}
            onChange={(e) => update({ password: e.target.value })}
            className={inputClass}
          />
        </div>
      </div>

      {/* 미리보기 */}
      <div className="rounded bg-zinc-100 px-3 py-2 text-xs text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400">
        미리보기: {connectString || '(입력 필요)'}
      </div>

      {/* 버튼 */}
      <div className="flex gap-3">
        <button
          onClick={handleTest}
          disabled={status === 'testing' || status === 'saving'}
          className="rounded bg-blue-600 px-5 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-40 dark:bg-blue-500 dark:hover:bg-blue-600"
        >
          {status === 'testing' ? '테스트 중...' : '연결 테스트'}
        </button>
        <button
          onClick={handleSave}
          disabled={status === 'testing' || status === 'saving'}
          className="rounded bg-emerald-600 px-5 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-40 dark:bg-emerald-500 dark:hover:bg-emerald-600"
        >
          {status === 'saving' ? '저장 중...' : '적용 & 재연결'}
        </button>
      </div>

      {/* 상태 메시지 */}
      {message && (
        <div
          className={`rounded px-3 py-2 text-sm ${
            status === 'success'
              ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'
              : 'bg-red-50 text-red-700 dark:bg-red-900/30 dark:text-red-400'
          }`}
        >
          {status === 'success' ? '● ' : '● '}
          {message}
        </div>
      )}
    </div>
  );
}
