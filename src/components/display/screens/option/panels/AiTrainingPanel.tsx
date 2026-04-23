/**
 * @file src/components/display/screens/option/panels/AiTrainingPanel.tsx
 * @description AI 학습 자료 편집 패널.
 *
 * 초보자 가이드:
 * - 좌측: DB 객체(테이블/함수/프로시저) 목록. 등록·미등록·활성 상태 표시.
 * - 우측: 선택된 객체의 wiki MD 편집.
 *   - "자동 초안 ⚡": schema-cache + db-objects-cache 기반 템플릿 불러오기
 *   - "저장 💾": wiki/ai-chat/{kind}/{slug}.md 쓰기 + AI 컨텍스트 즉시 반영
 *   - "삭제": MD 파일 제거
 * - 상단 라디오: 종류 전환. 검색·필터(전체/등록/미등록)로 좁혀보기.
 *
 * 연결 API:
 *   GET  /api/ai-context/objects                         (목록)
 *   GET  /api/ai-context/wiki/{kind}/{slug}              (기존 MD)
 *   GET  /api/ai-context/wiki/{kind}/{slug}/draft        (자동 초안)
 *   PUT  /api/ai-context/wiki/{kind}/{slug}              (저장)
 *   DELETE /api/ai-context/wiki/{kind}/{slug}            (삭제)
 */
'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Save, Wand2, Trash2, RefreshCw, Check } from 'lucide-react';

type Kind = 'tables' | 'functions' | 'procedures';
type Filter = 'all' | 'enabled' | 'disabled';

interface TableItem {
  name: string;
  category?: string;
  pk: string[];
  summary?: string;
  registered: boolean;
  enabled: boolean;
}
interface FunctionItem {
  name: string;
  returns: string | null;
  argCount: number;
  registered: boolean;
  enabled: boolean;
}
interface ProcedureItem {
  name: string;
  argCount: number;
  registered: boolean;
  enabled: boolean;
}
interface ObjectsResponse {
  tables: TableItem[];
  functions: FunctionItem[];
  procedures: ProcedureItem[];
}

export default function AiTrainingPanel() {
  const [kind, setKind] = useState<Kind>('tables');
  const [filter, setFilter] = useState<Filter>('all');
  const [search, setSearch] = useState('');
  const [objects, setObjects] = useState<ObjectsResponse | null>(null);
  const [selected, setSelected] = useState<string | null>(null);
  const [content, setContent] = useState('');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [savedFlash, setSavedFlash] = useState(false);
  const [syncing, setSyncing] = useState(false);

  const loadObjects = useCallback(async () => {
    const res = await fetch('/api/ai-context/objects');
    if (res.ok) setObjects(await res.json());
  }, []);

  const syncWithDb = useCallback(async () => {
    setSyncing(true);
    try {
      // 테이블 스키마 + 함수·프로시저를 병렬 재추출
      const [tablesRes, objectsRes] = await Promise.all([
        fetch('/api/ai-tables/sync', { method: 'POST' }).catch(() => null),
        fetch('/api/ai-context/sync-objects', { method: 'POST' }),
      ]);
      if (!objectsRes.ok) {
        const body = await objectsRes.json().catch(() => ({}));
        alert(`DB 동기화 실패 (함수/프로시저): ${body.error ?? '알 수 없음'}`);
      }
      // tablesRes 가 404 면 경로 없음 (현재는 존재 확인됨) — 조용히 무시
      void tablesRes;
      await loadObjects();
    } finally {
      setSyncing(false);
    }
  }, [loadObjects]);

  useEffect(() => {
    loadObjects();
  }, [loadObjects]);

  // 종류 전환 시 선택 초기화
  useEffect(() => {
    setSelected(null);
    setContent('');
  }, [kind]);

  // 선택된 객체 MD 불러오기
  useEffect(() => {
    if (!selected) {
      setContent('');
      return;
    }
    const slug = slugify(selected);
    setLoading(true);
    fetch(`/api/ai-context/wiki/${kind}/${slug}`)
      .then(async (r) => {
        if (r.ok) {
          const j = await r.json();
          setContent(j.content);
        } else {
          setContent('');
        }
      })
      .finally(() => setLoading(false));
  }, [kind, selected]);

  const list: ListItem[] = useMemo(() => {
    if (!objects) return [];
    const src: ListItem[] =
      kind === 'tables'
        ? objects.tables.map((t) => ({
            name: t.name,
            registered: t.registered,
            enabled: t.enabled,
            hint: t.category ?? '',
          }))
        : kind === 'functions'
        ? objects.functions.map((f) => ({
            name: f.name,
            registered: f.registered,
            enabled: f.enabled,
            hint: `(${f.argCount} args) → ${f.returns ?? '?'}`,
          }))
        : objects.procedures.map((p) => ({
            name: p.name,
            registered: p.registered,
            enabled: p.enabled,
            hint: `(${p.argCount} args)`,
          }));

    const q = search.trim().toUpperCase();
    return src.filter((o) => {
      if (filter === 'enabled' && !o.enabled) return false;
      if (filter === 'disabled' && o.enabled) return false;
      if (q && !o.name.includes(q)) return false;
      return true;
    });
  }, [objects, kind, filter, search]);

  const toggleEnabled = useCallback(
    async (objectName: string, nextEnabled: boolean) => {
      const slug = slugify(objectName);
      const res = await fetch(
        `/api/ai-context/wiki/${kind}/${slug}/toggle`,
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ enabled: nextEnabled }),
        },
      );
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        alert(`토글 실패: ${body.error ?? res.status}`);
        return;
      }
      await loadObjects();
    },
    [kind, loadObjects],
  );

  const onAutoDraft = async () => {
    if (!selected) return;
    const slug = slugify(selected);
    const res = await fetch(`/api/ai-context/wiki/${kind}/${slug}/draft`);
    if (res.ok) {
      const j = await res.json();
      setContent(j.content);
    } else {
      alert('자동 초안 생성 실패 — DB 캐시에 객체 없음');
    }
  };

  const onSave = async () => {
    if (!selected) return;
    const slug = slugify(selected);
    setSaving(true);
    const res = await fetch(`/api/ai-context/wiki/${kind}/${slug}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content }),
    });
    setSaving(false);
    if (res.ok) {
      setSavedFlash(true);
      setTimeout(() => setSavedFlash(false), 1500);
      loadObjects();
    } else {
      alert('저장 실패');
    }
  };

  const onDelete = async () => {
    if (!selected) return;
    if (!confirm(`${selected} MD 파일을 삭제할까요?`)) return;
    const slug = slugify(selected);
    const res = await fetch(`/api/ai-context/wiki/${kind}/${slug}`, {
      method: 'DELETE',
    });
    if (res.ok) {
      setContent('');
      loadObjects();
    }
  };

  const counts = useMemo(() => {
    if (!objects) return { tables: 0, functions: 0, procedures: 0 };
    return {
      tables: objects.tables.length,
      functions: objects.functions.length,
      procedures: objects.procedures.length,
    };
  }, [objects]);

  return (
    <div className="flex h-full min-h-0 flex-col">
      {/* 상단 컨트롤 */}
      <div className="flex flex-wrap items-center gap-3 border-b border-zinc-200 bg-zinc-50 p-3 dark:border-zinc-700 dark:bg-zinc-900">
        <div className="flex gap-1 rounded-md border border-zinc-300 bg-white p-0.5 dark:border-zinc-700 dark:bg-zinc-800">
          {(['tables', 'functions', 'procedures'] as Kind[]).map((k) => (
            <button
              key={k}
              onClick={() => setKind(k)}
              className={`rounded px-3 py-1 text-xs font-medium transition-colors ${
                kind === k
                  ? 'bg-cyan-600 text-white'
                  : 'text-zinc-700 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-700'
              }`}
            >
              {k === 'tables' ? '테이블' : k === 'functions' ? '함수' : '프로시저'}{' '}
              <span className="ml-1 text-[10px] opacity-70">
                {counts[k]}
              </span>
            </button>
          ))}
        </div>

        <select
          value={filter}
          onChange={(e) => setFilter(e.target.value as Filter)}
          className="rounded border border-zinc-300 bg-white px-2 py-1 text-xs dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
        >
          <option value="all">전체</option>
          <option value="enabled">사용함</option>
          <option value="disabled">사용안함</option>
        </select>

        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="이름 검색..."
          className="flex-1 min-w-[200px] rounded border border-zinc-300 bg-white px-2 py-1 text-xs dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
        />

        <button
          onClick={loadObjects}
          className="flex items-center gap-1 rounded bg-zinc-200 px-2 py-1 text-xs hover:bg-zinc-300 dark:bg-zinc-700 dark:text-zinc-100 dark:hover:bg-zinc-600"
          title="목록 새로고침 (캐시 파일 기준)"
        >
          <RefreshCw className="size-3" /> 새로고침
        </button>
        <button
          onClick={syncWithDb}
          disabled={syncing}
          className="flex items-center gap-1 rounded bg-emerald-600 px-2 py-1 text-xs text-white hover:bg-emerald-500 disabled:bg-zinc-400"
          title="Oracle DB 에서 테이블/함수/프로시저 메타를 재추출"
        >
          <RefreshCw className={`size-3 ${syncing ? 'animate-spin' : ''}`} />
          {syncing ? '동기화 중...' : 'DB 동기화'}
        </button>
      </div>

      {/* 본문: 좌측 목록 + 우측 에디터 */}
      <div className="flex min-h-0 flex-1">
        {/* 좌측 목록 */}
        <div className="w-80 overflow-y-auto border-r border-zinc-200 bg-white dark:border-zinc-700 dark:bg-zinc-950">
          {list.length === 0 && (
            <div className="p-4 text-center text-xs text-zinc-500">
              {objects ? '항목 없음' : '로딩...'}
            </div>
          )}
          {list.map((o) => (
            <div
              key={o.name}
              className={`flex items-center gap-2 border-b border-zinc-100 px-3 py-2 text-xs transition-colors dark:border-zinc-800 ${
                selected === o.name
                  ? 'bg-cyan-50 dark:bg-cyan-900/30'
                  : 'hover:bg-zinc-100 dark:hover:bg-zinc-800'
              }`}
            >
              <input
                type="checkbox"
                checked={o.enabled}
                onChange={(e) => {
                  e.stopPropagation();
                  toggleEnabled(o.name, e.target.checked);
                }}
                onClick={(e) => e.stopPropagation()}
                className="size-4 cursor-pointer accent-emerald-600"
                title={o.enabled ? '사용함 (AI 에 노출)' : '사용안함'}
              />
              <button
                onClick={() => setSelected(o.name)}
                className="flex-1 text-left"
              >
                <div className="font-mono font-medium text-zinc-800 dark:text-zinc-100">
                  {o.name}
                </div>
                {o.hint && (
                  <div className="mt-0.5 text-[10px] text-zinc-500">
                    {o.hint}
                  </div>
                )}
              </button>
            </div>
          ))}
        </div>

        {/* 우측 에디터 */}
        <div className="flex min-h-0 flex-1 flex-col bg-zinc-50 dark:bg-zinc-900">
          {!selected ? (
            <div className="flex h-full items-center justify-center text-sm text-zinc-500">
              좌측에서 객체를 선택하세요.
            </div>
          ) : (
            <>
              <div className="flex items-center gap-2 border-b border-zinc-200 p-3 dark:border-zinc-700">
                <h3 className="flex-1 font-mono text-sm font-semibold text-zinc-800 dark:text-zinc-100">
                  {selected}
                </h3>
                <button
                  onClick={onAutoDraft}
                  className="flex items-center gap-1 rounded bg-purple-600 px-3 py-1 text-xs text-white hover:bg-purple-500"
                  title="schema/DB 캐시로부터 MD 초안 생성"
                >
                  <Wand2 className="size-3" /> 자동 초안
                </button>
                <button
                  onClick={onSave}
                  disabled={saving || !content}
                  className="flex items-center gap-1 rounded bg-cyan-600 px-3 py-1 text-xs text-white hover:bg-cyan-500 disabled:bg-zinc-400"
                >
                  {savedFlash ? (
                    <Check className="size-3" />
                  ) : (
                    <Save className="size-3" />
                  )}
                  {saving ? '저장 중...' : savedFlash ? '저장됨' : '저장'}
                </button>
                <button
                  onClick={onDelete}
                  className="flex items-center gap-1 rounded bg-red-600 px-3 py-1 text-xs text-white hover:bg-red-500"
                >
                  <Trash2 className="size-3" /> 삭제
                </button>
              </div>
              <textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                disabled={loading}
                placeholder="비어있음 — [자동 초안 ⚡] 버튼으로 템플릿 불러오기"
                className="flex-1 resize-none bg-zinc-950 p-4 font-mono text-xs leading-relaxed text-zinc-100 focus:outline-none"
                spellCheck={false}
              />
              <div className="border-t border-zinc-200 p-2 text-[10px] text-zinc-500 dark:border-zinc-700">
                {content.length.toLocaleString()} 글자 · 좌측 체크박스 = AI 에 노출되는 "사용함" 테이블
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

interface ListItem {
  name: string;
  registered: boolean;
  enabled: boolean;
  hint: string;
}

function slugify(objectName: string): string {
  return objectName.toLowerCase().replace(/_/g, '-');
}
