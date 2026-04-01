/**
 * @file DatabasePanel.tsx
 * @description Oracle DB 프로필 관리 패널. 사이드 리스트에서 프로필 선택/추가/삭제하고
 * 오른쪽 폼에서 설정을 편집, 테스트, 적용한다.
 * 초보자 가이드: /api/settings/database API를 호출하여 프로필 CRUD/테스트/저장.
 */
'use client';

import { useState, useEffect, useCallback } from 'react';
import { useTranslations } from 'next-intl';
import type { DatabaseConfig, DatabaseProfile } from '@/types/option';

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
  const t = useTranslations('option');

  const [profiles, setProfiles] = useState<DatabaseProfile[]>([]);
  const [activeProfile, setActiveProfile] = useState('');
  const [selectedName, setSelectedName] = useState('');
  const [config, setConfig] = useState<DatabaseConfig>(EMPTY_CONFIG);
  const [isNew, setIsNew] = useState(false);
  const [newName, setNewName] = useState('');

  const [status, setStatus] = useState<Status>('idle');
  const [message, setMessage] = useState('');
  const [source, setSource] = useState<'env' | 'file' | 'unknown'>('unknown');
  /** 비밀번호가 저장되어 있는지 여부 (API에서 ****로 반환된 경우) */
  const [hasStoredPassword, setHasStoredPassword] = useState(false);
  /** 사용자가 비밀번호 필드를 직접 수정했는지 여부 */
  const [passwordTouched, setPasswordTouched] = useState(false);

  /** API에서 프로필 목록 로드 */
  const loadProfiles = useCallback(async () => {
    try {
      const res = await fetch('/api/settings/database');
      const data = await res.json();
      setSource(data.source ?? 'unknown');
      const list: DatabaseProfile[] = data.profiles ?? [];
      setProfiles(list);
      setActiveProfile(data.activeProfile ?? '');

      // 첫 로드: 활성 프로필 선택
      if (list.length > 0) {
        const activeName = data.activeProfile || list[0].name;
        selectProfile(activeName, list);
      }
    } catch { /* 기본값 유지 */ }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => { loadProfiles(); }, [loadProfiles]);

  /** 프로필 선택 → 폼에 로드 */
  const selectProfile = (name: string, list?: DatabaseProfile[]) => {
    const arr = list ?? profiles;
    const found = arr.find((p) => p.name === name);
    if (!found) return;
    setSelectedName(name);
    setIsNew(false);
    setNewName(name);
    const hasPw = !!found.password && found.password !== '';
    setHasStoredPassword(hasPw);
    setPasswordTouched(false);
    setConfig({
      host: found.host,
      port: found.port,
      connectionType: found.connectionType,
      sidOrService: found.sidOrService,
      username: found.username,
      password: hasPw ? '●●●●●●●●' : '',
    });
    setStatus('idle');
    setMessage('');
  };

  /** 새 프로필 추가 모드 */
  const handleAdd = () => {
    setIsNew(true);
    setSelectedName('');
    setNewName('');
    setConfig(EMPTY_CONFIG);
    setHasStoredPassword(false);
    setPasswordTouched(false);
    setStatus('idle');
    setMessage('');
  };

  /** 프로필 삭제 */
  const handleDelete = (name: string) => {
    const updated = profiles.filter((p) => p.name !== name);
    setProfiles(updated);
    const newActive = name === activeProfile
      ? (updated[0]?.name ?? '')
      : activeProfile;
    setActiveProfile(newActive);
    if (updated.length > 0) {
      selectProfile(newActive, updated);
    } else {
      setConfig(EMPTY_CONFIG);
      setSelectedName('');
    }
  };

  const connectString =
    config.connectionType === 'SERVICE_NAME'
      ? `${config.host}:${config.port}/${config.sidOrService}`
      : `${config.host}:${config.port}:${config.sidOrService}`;

  /** 연결 테스트 */
  const handleTest = async () => {
    setStatus('testing');
    setMessage('');
    try {
      const res = await fetch('/api/settings/database', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'test',
          config: {
            ...config,
            password: passwordTouched ? config.password : '',
          },
          profileName: selectedName || newName.trim(),
        }),
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

  /** 저장 & 재연결: 현재 폼 → 프로필 배열에 반영 후 API 저장 */
  const handleSave = async () => {
    const profileName = newName.trim();
    if (!profileName) {
      setStatus('error');
      setMessage(t('profileNameRequired'));
      return;
    }

    // 중복 이름 검사 (새 프로필이거나 이름이 변경된 경우)
    const nameChanged = !isNew && profileName !== selectedName;
    if ((isNew || nameChanged) && profiles.some((p) => p.name === profileName)) {
      setStatus('error');
      setMessage(t('profileNameDuplicate'));
      return;
    }

    setStatus('saving');
    setMessage('');

    const newProfile: DatabaseProfile = {
      ...config,
      name: profileName,
      password: passwordTouched ? config.password : '',
    };
    let updated: DatabaseProfile[];

    if (isNew) {
      updated = [...profiles, newProfile];
    } else {
      updated = profiles.map((p) =>
        p.name === selectedName ? newProfile : p,
      );
    }

    try {
      const res = await fetch('/api/settings/database', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'save',
          profiles: updated,
          activeProfile: profileName,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setStatus('success');
        setMessage(t('dbSaveSuccess'));
        setProfiles(updated);
        setActiveProfile(profileName);
        setSelectedName(profileName);
        setIsNew(false);
        setNewName(profileName);
        setHasStoredPassword(true);
        setPasswordTouched(false);
        setConfig((prev) => ({ ...prev, password: '●●●●●●●●' }));
      } else {
        setStatus('error');
        setMessage(data.error);
      }
    } catch (e) {
      setStatus('error');
      setMessage(String(e));
    }
  };

  /** 재연결: 현재 활성 프로필로 DB 풀 재시작 */
  const handleReconnect = async () => {
    setStatus('saving');
    setMessage('');
    try {
      const res = await fetch('/api/settings/database', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'reconnect', activeProfile }),
      });
      const data = await res.json();
      if (data.success) {
        setStatus('success');
        setMessage(t('dbReconnectSuccess') ?? 'DB 재연결 완료');
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
    <div className="p-6">
      {/* 헤더 */}
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-base font-semibold text-zinc-800 dark:text-zinc-100">
          {t('dbTitle')}
        </h3>
        {source !== 'unknown' && (
          <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${
            source === 'env'
              ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
              : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'
          }`}>
            {source === 'env' ? t('envBased') : t('configBased')}
          </span>
        )}
      </div>

      {/* 사이드 리스트 + 폼 */}
      <div className="flex gap-4">
        {/* 왼쪽: 프로필 리스트 */}
        <div className="w-44 shrink-0">
          <div className="rounded-lg border border-zinc-200 bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-800/50">
            <div className="border-b border-zinc-200 px-3 py-2 dark:border-zinc-700">
              <span className="text-xs font-medium text-zinc-500 dark:text-zinc-400">
                {t('profileList')}
              </span>
            </div>
            <ul className="max-h-64 overflow-y-auto">
              {profiles.map((p) => (
                <li
                  key={p.name}
                  onClick={() => selectProfile(p.name)}
                  className={`group flex cursor-pointer items-center justify-between px-3 py-2 text-sm transition-colors ${
                    p.name === selectedName && !isNew
                      ? 'bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300'
                      : 'text-zinc-700 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-700/50'
                  }`}
                >
                  <div className="flex items-center gap-1.5 truncate">
                    {p.name === activeProfile && (
                      <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-500" title={t('activeProfile')} />
                    )}
                    <span className="truncate">{p.name}</span>
                  </div>
                  {profiles.length > 1 && (
                    <button
                      onClick={(e) => { e.stopPropagation(); handleDelete(p.name); }}
                      className="hidden shrink-0 text-zinc-400 hover:text-red-500 group-hover:block dark:text-zinc-500 dark:hover:text-red-400"
                      title={t('deleteProfile')}
                    >
                      &times;
                    </button>
                  )}
                </li>
              ))}
            </ul>
            <div className="border-t border-zinc-200 dark:border-zinc-700">
              <button
                onClick={handleAdd}
                className="w-full px-3 py-2 text-left text-sm text-blue-600 hover:bg-blue-50 dark:text-blue-400 dark:hover:bg-blue-900/20"
              >
                + {t('addProfile')}
              </button>
            </div>
          </div>
        </div>

        {/* 오른쪽: 설정 폼 */}
        <div className="min-w-0 flex-1 space-y-4">
          {/* 프로필 이름 */}
          <div>
            <label className={labelClass}>{t('profileName')}</label>
            <input
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder={t('profileNamePlaceholder')}
              className={inputClass}
              autoFocus={isNew}
            />
          </div>

          {/* 호스트 + 포트 */}
          <div className="grid grid-cols-3 gap-4">
            <div className="col-span-2">
              <label className={labelClass}>{t('host')}</label>
              <input
                value={config.host}
                onChange={(e) => update({ host: e.target.value })}
                placeholder="192.168.1.100"
                className={inputClass}
              />
            </div>
            <div>
              <label className={labelClass}>{t('port')}</label>
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
            <label className={labelClass}>{t('connectType')}</label>
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
              <label className={labelClass}>{t('username')}</label>
              <input
                value={config.username}
                onChange={(e) => update({ username: e.target.value })}
                placeholder="ADMIN"
                className={inputClass}
              />
            </div>
            <div>
              <label className={labelClass}>{t('password')}</label>
              <input
                type="password"
                value={config.password}
                onFocus={() => {
                  if (!passwordTouched && hasStoredPassword) {
                    setConfig((prev) => ({ ...prev, password: '' }));
                  }
                }}
                onChange={(e) => {
                  setPasswordTouched(true);
                  update({ password: e.target.value });
                }}
                placeholder={hasStoredPassword && !passwordTouched ? t('passwordUnchanged') : ''}
                className={inputClass}
              />
            </div>
          </div>

          {/* 미리보기 */}
          <div className="rounded bg-zinc-100 px-3 py-2 text-xs text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400">
            {t('preview')}: {connectString || t('inputRequired')}
          </div>

          {/* 버튼 */}
          <div className="flex gap-3">
            <button
              onClick={handleTest}
              disabled={status === 'testing' || status === 'saving'}
              className="rounded bg-blue-600 px-5 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-40 dark:bg-blue-500 dark:hover:bg-blue-600"
            >
              {status === 'testing' ? t('testing') : t('connTest')}
            </button>
            <button
              onClick={handleSave}
              disabled={status === 'testing' || status === 'saving'}
              className="rounded bg-emerald-600 px-5 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-40 dark:bg-emerald-500 dark:hover:bg-emerald-600"
            >
              {status === 'saving' ? t('saving') : t('save')}
            </button>
            <button
              onClick={handleReconnect}
              disabled={status === 'testing' || status === 'saving'}
              className="rounded bg-amber-600 px-5 py-2 text-sm font-medium text-white hover:bg-amber-700 disabled:opacity-40 dark:bg-amber-500 dark:hover:bg-amber-600"
            >
              {t('reconnect')}
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
              {message}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
