/**
 * @file DbStatusBadge.tsx
 * @description 현재 접속 중인 DB 프로필명과 연결 상태를 표시하는 배지.
 * 초보자 가이드:
 *   - 메뉴 화면의 시계 옆에 렌더링된다
 *   - 마운트 시 /api/settings/database/status 호출하여 상태 확인
 *   - 연결 성공: 초록 점 + 프로필명, 실패: 빨간 점 + 프로필명
 */
'use client';

import { useEffect, useState } from 'react';
import { Database } from 'lucide-react';

interface DbStatus {
  profile: string;
  connectInfo: string;
  connected: boolean;
}

export default function DbStatusBadge() {
  const [status, setStatus] = useState<DbStatus | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/settings/database/status')
      .then((r) => r.json())
      .then((data: DbStatus) => setStatus(data))
      .catch(() => setStatus(null))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div id="db-status-badge" className="db-badge loading">
        <Database size={14} />
        <span className="db-badge-text">connecting...</span>
      </div>
    );
  }

  if (!status) {
    return (
      <div id="db-status-badge" className="db-badge error">
        <Database size={14} />
        <span className="db-badge-text">unknown</span>
      </div>
    );
  }

  return (
    <div
      id="db-status-badge"
      className={`db-badge ${status.connected ? 'connected' : 'disconnected'}`}
      title={status.connectInfo}
    >
      <span className="db-status-dot" />
      <Database size={14} />
      <span className="db-badge-text">{status.profile}</span>
    </div>
  );
}
