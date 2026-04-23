/**
 * @file src/app/settings/ai-models/_components/SystemPromptPanel.tsx
 * @description AI 채팅 시스템 프롬프트 에디터 (SQL 생성 / 분석 단계).
 *   - 모든 프로바이더에 동일한 프롬프트를 저장하여 공통 설정으로 운영.
 *   - 빈 문자열 저장 시 서버에서 CORE 기본값으로 자동 폴백 (prompt-builder.ts 로직).
 * 초보자 가이드: textarea 2개 (SQL·분석) + "기본값으로 복원" + "저장" 버튼.
 */
'use client';

import { useEffect, useMemo, useState } from 'react';
import { RotateCcw, Save, Check } from 'lucide-react';
import type { ProviderSettingPublic } from '@/lib/ai/provider-store';

interface Props {
  providers: ProviderSettingPublic[];
  onUpdated: () => void;
}

type Field = 'sqlSystemPrompt' | 'analysisPrompt';

export default function SystemPromptPanel({ providers, onUpdated }: Props) {
  const firstProvider = providers[0];
  const initialSql = firstProvider?.sqlSystemPrompt ?? '';
  const initialAnalysis = firstProvider?.analysisPrompt ?? '';

  const [sql, setSql] = useState(initialSql);
  const [analysis, setAnalysis] = useState(initialAnalysis);
  const [saving, setSaving] = useState<Field | null>(null);
  const [savedAt, setSavedAt] = useState<Field | null>(null);
  const [defaults, setDefaults] = useState<{ sqlGeneration: string; analysis: string }>({
    sqlGeneration: '',
    analysis: '',
  });

  useEffect(() => {
    setSql(firstProvider?.sqlSystemPrompt ?? '');
    setAnalysis(firstProvider?.analysisPrompt ?? '');
  }, [firstProvider?.sqlSystemPrompt, firstProvider?.analysisPrompt]);

  useEffect(() => {
    fetch('/api/ai-chat/default-prompts')
      .then((r) => r.json())
      .then((d) => setDefaults(d))
      .catch(() => { /* 무시 — 기본값 복원 버튼만 영향받음 */ });
  }, []);

  const sqlDirty = useMemo(() => (sql ?? '') !== (firstProvider?.sqlSystemPrompt ?? ''), [sql, firstProvider]);
  const analysisDirty = useMemo(
    () => (analysis ?? '') !== (firstProvider?.analysisPrompt ?? ''),
    [analysis, firstProvider],
  );

  const saveField = async (field: Field, value: string) => {
    if (providers.length === 0) return;
    setSaving(field);
    setSavedAt(null);
    try {
      const payloadValue = value.trim().length === 0 ? null : value;
      await Promise.all(
        providers.map((p) =>
          fetch('/api/ai-chat/providers', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ providerId: p.providerId, [field]: payloadValue }),
          }),
        ),
      );
      onUpdated();
      setSavedAt(field);
      setTimeout(() => setSavedAt(null), 1500);
    } finally {
      setSaving(null);
    }
  };

  const resetToDefault = (field: Field) => {
    if (field === 'sqlSystemPrompt') setSql(defaults.sqlGeneration);
    else setAnalysis(defaults.analysis);
  };

  return (
    <section className="mt-8">
      <header className="mb-3">
        <h2 className="text-xl font-bold text-zinc-100">AI 채팅 시스템 프롬프트</h2>
        <p className="mt-1 text-xs text-zinc-400">
          모든 프로바이더(Claude/Gemini/Mistral/Kimi)에 동일하게 적용됩니다. 빈 값으로 저장하면 내장 기본 프롬프트가 사용됩니다.
        </p>
      </header>

      <PromptEditor
        label="① SQL 생성 프롬프트"
        hint="자연어 질문 → Oracle SELECT 쿼리 변환 단계"
        value={sql}
        onChange={setSql}
        dirty={sqlDirty}
        saving={saving === 'sqlSystemPrompt'}
        savedFlash={savedAt === 'sqlSystemPrompt'}
        onSave={() => saveField('sqlSystemPrompt', sql)}
        onReset={() => resetToDefault('sqlSystemPrompt')}
      />

      <div className="mt-6">
        <PromptEditor
          label="② 결과 분석 프롬프트"
          hint="쿼리 결과 → 마크다운/표/차트 분석 응답 단계"
          value={analysis}
          onChange={setAnalysis}
          dirty={analysisDirty}
          saving={saving === 'analysisPrompt'}
          savedFlash={savedAt === 'analysisPrompt'}
          onSave={() => saveField('analysisPrompt', analysis)}
          onReset={() => resetToDefault('analysisPrompt')}
        />
      </div>
    </section>
  );
}

interface EditorProps {
  label: string;
  hint: string;
  value: string;
  onChange: (v: string) => void;
  dirty: boolean;
  saving: boolean;
  savedFlash: boolean;
  onSave: () => void;
  onReset: () => void;
}

function PromptEditor({ label, hint, value, onChange, dirty, saving, savedFlash, onSave, onReset }: EditorProps) {
  return (
    <div className="rounded-lg border border-zinc-800 bg-zinc-900 p-4">
      <div className="mb-2 flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold text-zinc-100">{label}</h3>
          <p className="text-xs text-zinc-500">{hint}</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={onReset}
            className="flex items-center gap-1 rounded bg-zinc-800 px-2 py-1 text-xs text-zinc-300 hover:bg-zinc-700"
            title="기본 프롬프트로 textarea 채우기 (저장 전)"
          >
            <RotateCcw className="size-3" /> 기본값 불러오기
          </button>
          <button
            onClick={onSave}
            disabled={!dirty || saving}
            className="flex items-center gap-1 rounded bg-cyan-600 px-3 py-1 text-xs font-medium text-white hover:bg-cyan-500 disabled:cursor-not-allowed disabled:bg-zinc-700 disabled:text-zinc-400"
          >
            {savedFlash ? <Check className="size-3" /> : <Save className="size-3" />}
            {saving ? '저장 중...' : savedFlash ? '저장됨' : '저장'}
          </button>
        </div>
      </div>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        rows={14}
        placeholder="비워두면 내장 기본 프롬프트가 사용됩니다."
        className="w-full resize-y rounded border border-zinc-700 bg-zinc-950 px-3 py-2 font-mono text-xs leading-relaxed text-zinc-100 focus:border-cyan-500 focus:outline-none"
        spellCheck={false}
      />
      <p className="mt-1 text-[10px] text-zinc-500">
        {value.length.toLocaleString()} 글자 · 변경 사항 {dirty ? '있음' : '없음'}
      </p>
    </div>
  );
}
