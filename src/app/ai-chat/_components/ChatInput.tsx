/**
 * @file src/app/ai-chat/_components/ChatInput.tsx
 * @description 채팅 입력 영역 — 텍스트 입력 + 음성 입력(STT) + 예시 질문 + 파일 첨부 + 전송.
 *   wbsmaster ChatInput 기능을 그대로 이식.
 *
 * 초보자 가이드:
 * - Web Speech API로 음성 인식 (한국어)
 * - 예시 질문 팝오버: MES 도메인 카테고리별 그룹
 * - 파일 첨부: .xlsx/.xls/.csv 선택 가능 (백엔드 미구현이면 시각적 표시만)
 * - 페르소나/모델 드롭다운은 상단에 배치
 */
'use client';

import { useState, useRef, useCallback, useEffect, useMemo, memo } from 'react';
import { useTranslations } from 'next-intl';
import { Send, Mic, MicOff, Lightbulb, Paperclip, X, BarChart3, Table2, FileText, Sparkles, Code2, Globe, Type, ChevronDown, Zap, Minus, BookOpen, List, ListOrdered, Wand2 } from 'lucide-react';
import { postSse } from '../_lib/sse-client';
import type { ProviderId } from '@/lib/ai/providers/types';

/* ------------------------------------------------------------------ */
/*  MES 예시 질문 그룹                                                  */
/* ------------------------------------------------------------------ */

const EXAMPLE_GROUP_KEYS = ['production', 'quality', 'equipment', 'traceability'] as const;
const EXAMPLE_ICONS: Record<typeof EXAMPLE_GROUP_KEYS[number], string> = {
  production: '📊',
  quality: '🔍',
  equipment: '⚙️',
  traceability: '🔗',
};

/* ------------------------------------------------------------------ */
/*  출력형식 옵션                                                       */
/* ------------------------------------------------------------------ */

const FORMAT_OPTIONS_META = [
  { key: 'auto',     icon: Sparkles },
  { key: 'table',    icon: Table2 },
  { key: 'chart',    icon: BarChart3 },
  { key: 'detail',   icon: FileText },
  { key: 'markdown', icon: Code2 },
  { key: 'html',     icon: Globe },
  { key: 'text',     icon: Type },
] as const;

type OutputFormat = typeof FORMAT_OPTIONS_META[number]['key'];

/* ------------------------------------------------------------------ */
/*  응답 스타일 옵션 — 답변 길이/깊이 프리셋                             */
/* ------------------------------------------------------------------ */

const RESPONSE_STYLE_OPTIONS_META = [
  { key: 'auto',     icon: Wand2 },
  { key: 'brief',    icon: Zap },
  { key: 'normal',   icon: Minus },
  { key: 'detailed', icon: BookOpen },
  { key: 'summary',  icon: List },
  { key: 'steps',    icon: ListOrdered },
] as const;

type ResponseStyle = typeof RESPONSE_STYLE_OPTIONS_META[number]['key'];

const LS_KEY_FORMAT = 'ai-chat-output-format';
const LS_KEY_STYLE = 'ai-chat-response-style';

/* ------------------------------------------------------------------ */
/*  Speech Recognition 타입                                             */
/* ------------------------------------------------------------------ */

interface SpeechRecognitionEvent extends Event {
  results: SpeechRecognitionResultList;
  resultIndex: number;
}

interface SpeechRecognitionResultList {
  length: number;
  [index: number]: SpeechRecognitionResult;
}

interface SpeechRecognitionResult {
  isFinal: boolean;
  [index: number]: { transcript: string; confidence: number };
}

interface SpeechRecognitionInstance extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onstart: (() => void) | null;
  onend: (() => void) | null;
  onresult: ((ev: SpeechRecognitionEvent) => void) | null;
  onerror: ((ev: Event & { error: string }) => void) | null;
  start(): void;
  stop(): void;
  abort(): void;
}

/* ------------------------------------------------------------------ */
/*  Props                                                               */
/* ------------------------------------------------------------------ */

interface Props {
  sessionId: string | null;
  providerId: ProviderId;
  modelId: string;
  personaId: string;
  onStreamStart: () => void;
  onStreamEnd: (sessionId?: string) => void;
  onSessionAutoCreate: (sessionId: string) => void;
  onStreamToken?: (delta: string, stage: string) => void;
  onConfirmRequired?: (payload: {
    sessionId: string;
    messageId: string;
    sql: string;
    estimatedCost?: number;
    estimatedRows?: number;
    reason?: string;
  }) => void;
  onContextSelected?: (payload: { tables: string[]; domains: string[]; site: string }) => void;
  suggestedInput?: string;
  onSuggestedInputHandled?: () => void;
}

/* ------------------------------------------------------------------ */
/*  컴포넌트                                                            */
/* ------------------------------------------------------------------ */

const ChatInput = memo(function ChatInput({
  sessionId, providerId, modelId, personaId,
  onStreamStart, onStreamEnd, onSessionAutoCreate,
  onStreamToken, onConfirmRequired, onContextSelected, suggestedInput, onSuggestedInputHandled,
}: Props) {
  const t = useTranslations('aiChat.input');
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const [showExamples, setShowExamples] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [outputFormat, setOutputFormat] = useState<OutputFormat>('auto');
  const [showFormatMenu, setShowFormatMenu] = useState(false);
  const [responseStyle, setResponseStyle] = useState<ResponseStyle>('auto');
  const [showStyleMenu, setShowStyleMenu] = useState(false);

  const exampleGroups = useMemo(
    () => EXAMPLE_GROUP_KEYS.map((k) => ({
      key: k,
      icon: EXAMPLE_ICONS[k],
      title: t(`examples.${k}.title`),
      questions: [0, 1, 2, 3].map((i) => t(`examples.${k}.q${i}`)),
    })),
    [t],
  );
  const formatOptions = useMemo(
    () => FORMAT_OPTIONS_META.map((m) => ({ ...m, label: t(`format.${m.key}`) })),
    [t],
  );
  const responseStyleOptions = useMemo(
    () => RESPONSE_STYLE_OPTIONS_META.map((m) => ({ ...m, label: t(`style.${m.key}`) })),
    [t],
  );

  // localStorage에서 사용자 선호 복원 (마운트 1회)
  useEffect(() => {
    try {
      const savedFormat = localStorage.getItem(LS_KEY_FORMAT);
      if (savedFormat && FORMAT_OPTIONS_META.some((o) => o.key === savedFormat)) {
        setOutputFormat(savedFormat as OutputFormat);
      }
      const savedStyle = localStorage.getItem(LS_KEY_STYLE);
      if (savedStyle && RESPONSE_STYLE_OPTIONS_META.some((o) => o.key === savedStyle)) {
        setResponseStyle(savedStyle as ResponseStyle);
      }
    } catch { /* SSR·차단 환경 무시 */ }
  }, []);

  // 변경 시 저장
  useEffect(() => {
    try { localStorage.setItem(LS_KEY_FORMAT, outputFormat); } catch { /* ignore */ }
  }, [outputFormat]);
  useEffect(() => {
    try { localStorage.setItem(LS_KEY_STYLE, responseStyle); } catch { /* ignore */ }
  }, [responseStyle]);

  // 음성 인식
  const [isListening, setIsListening] = useState(false);
  const [speechSupported, setSpeechSupported] = useState(false);
  const [interimTranscript, setInterimTranscript] = useState('');
  const recognitionRef = useRef<SpeechRecognitionInstance | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // 음성 인식 초기화
  useEffect(() => {
    const SpeechAPI = (window as unknown as Record<string, unknown>).SpeechRecognition
      || (window as unknown as Record<string, unknown>).webkitSpeechRecognition;
    if (!SpeechAPI) return;
    setSpeechSupported(true);

    const recognition = new (SpeechAPI as new () => SpeechRecognitionInstance)();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = 'ko-KR';

    recognition.onstart = () => setIsListening(true);
    recognition.onend = () => { setIsListening(false); setInterimTranscript(''); };
    recognition.onresult = (event: SpeechRecognitionEvent) => {
      let final = '';
      let interim = '';
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const t = event.results[i][0].transcript;
        if (event.results[i].isFinal) final += t;
        else interim += t;
      }
      if (final) setText((prev) => prev + final);
      setInterimTranscript(interim);
    };
    recognition.onerror = () => { setIsListening(false); setInterimTranscript(''); };
    recognitionRef.current = recognition;

    return () => { recognition.abort(); };
  }, []);

  // 외부 제안 입력 처리
  useEffect(() => {
    if (suggestedInput) {
      setText(suggestedInput);
      onSuggestedInputHandled?.();
      inputRef.current?.focus();
    }
  }, [suggestedInput, onSuggestedInputHandled]);

  const toggleListening = useCallback(async () => {
    if (!recognitionRef.current) return;
    if (isListening) {
      recognitionRef.current.stop();
    } else {
      try {
        await navigator.mediaDevices.getUserMedia({ audio: true });
        setInterimTranscript('');
        recognitionRef.current.start();
      } catch {
        console.error('마이크 권한 거부');
      }
    }
  }, [isListening]);

  // 전송
  const handleSend = useCallback(async () => {
    if (!text.trim() || busy) return;
    setBusy(true);
    onStreamStart();
    let sid = sessionId;

    try {
      if (!sid) {
        const res = await fetch('/api/ai-chat/sessions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ providerId, modelId, personaId, title: text.slice(0, 60) }),
        });
        const data = await res.json();
        sid = data.sessionId;
        if (sid) onSessionAutoCreate(sid);
      }

      // 출력 형식 / 응답 스타일은 prompt에 섞지 않고 별도 필드로 전달.
      // 서버에서 stage별로 적절히 주입 (SQL 생성 때는 제외, 분석 때만 systemPrompt에 주입)
      await postSse('/api/ai-chat/stream', {
        sessionId: sid,
        prompt: text,
        providerId,
        modelId,
        personaId,
        outputFormat,
        responseStyle,
      }, (ev) => {
        if (ev.event === 'stage') {
          const d = ev.data as { stage?: string };
          onStreamToken?.('', d.stage || '');
          return;
        }
        if (ev.event === 'token') {
          const d = ev.data as { delta?: string; stage?: string };
          if (!d?.stage) return;
          // Show only analysis tokens in the live bubble.
          if (d.stage === 'analysis' && d.delta) onStreamToken?.(d.delta, d.stage);
          else onStreamToken?.('', d.stage);
        } else if (ev.event === 'error') {
          const d = ev.data as { message?: string };
          console.error('[AI Chat]', d?.message);
        } else if (ev.event === 'confirm_required') {
          const d = ev.data as {
            sessionId?: string;
            messageId?: string;
            sql?: string;
            estimatedCost?: number;
            estimatedRows?: number;
            reason?: string;
          };
          if (d.sessionId && d.messageId && d.sql) {
            onConfirmRequired?.({
              sessionId: d.sessionId,
              messageId: d.messageId,
              sql: d.sql,
              estimatedCost: d.estimatedCost,
              estimatedRows: d.estimatedRows,
              reason: d.reason,
            });
          }
        } else if (ev.event === 'context_selected') {
          const d = ev.data as { tables?: string[]; domains?: string[]; site?: string };
          onContextSelected?.({
            tables: Array.isArray(d.tables) ? d.tables : [],
            domains: Array.isArray(d.domains) ? d.domains : [],
            site: typeof d.site === 'string' ? d.site : 'default',
          });
        }
      });

      setText('');
      setSelectedFile(null);
    } catch (e) {
      console.error(e);
    } finally {
      setBusy(false);
      onStreamEnd(sid || undefined);
    }
  }, [text, busy, sessionId, providerId, modelId, personaId, onStreamStart, onStreamEnd, onSessionAutoCreate, outputFormat, responseStyle, onStreamToken, onConfirmRequired, onContextSelected]);

  return (
    <div className="border-t border-zinc-200 bg-zinc-50 p-3 dark:border-zinc-700 dark:bg-zinc-900">
      {/* 첨부 파일 미리보기 */}
      {selectedFile && (
        <div className="mb-2 flex items-center gap-2 rounded-lg border border-zinc-300 bg-zinc-100 px-3 py-2 dark:border-zinc-700 dark:bg-zinc-800">
          <Paperclip className="size-4 text-emerald-500" />
          <span className="flex-1 truncate text-sm text-zinc-700 dark:text-zinc-300">{selectedFile.name}</span>
          <span className="text-xs text-zinc-500">{(selectedFile.size / 1024).toFixed(1)} KB</span>
          <button onClick={() => setSelectedFile(null)} className="rounded p-1 text-zinc-400 hover:bg-zinc-200 hover:text-red-500 dark:hover:bg-zinc-700">
            <X className="size-3" />
          </button>
        </div>
      )}

      {/* 입력 영역 — 모든 요소 h-9 통일, items-center 정렬 */}
      <div className="flex items-center gap-1.5">
        {/* 파일 첨부 */}
        <input ref={fileInputRef} type="file" accept=".xlsx,.xls,.csv" onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) setSelectedFile(f);
          e.target.value = '';
        }} className="hidden" />
        <button
          onClick={() => fileInputRef.current?.click()}
          disabled={busy}
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-zinc-400 hover:bg-zinc-200 hover:text-zinc-700 dark:hover:bg-zinc-800 dark:hover:text-zinc-200 disabled:opacity-50"
          title={t('attachFile')}
        >
          <Paperclip className="size-4" />
        </button>

        {/* 음성 입력 */}
        {speechSupported && (
          <div className="relative">
            <button
              onClick={toggleListening}
              disabled={busy}
              className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg disabled:opacity-50 ${
                isListening
                  ? 'bg-rose-500 text-white hover:bg-rose-600'
                  : 'text-zinc-400 hover:bg-zinc-200 hover:text-zinc-700 dark:hover:bg-zinc-800 dark:hover:text-zinc-200'
              }`}
              title={isListening ? t('speechStop') : t('speechStart')}
            >
              {isListening ? <Mic className="size-4" /> : <MicOff className="size-4" />}
            </button>
            {isListening && (
              <span className="absolute -right-0.5 -top-0.5 size-2.5 animate-pulse rounded-full bg-rose-500" />
            )}
          </div>
        )}

        {/* 예시 질문 */}
        <div className="relative">
          <button
            onClick={() => setShowExamples(!showExamples)}
            className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${
              showExamples
                ? 'bg-cyan-600/20 text-cyan-400'
                : 'text-zinc-400 hover:bg-zinc-200 hover:text-zinc-700 dark:hover:bg-zinc-800 dark:hover:text-zinc-200'
            }`}
            title={t('examplesTitle')}
          >
            <Lightbulb className="size-4" />
          </button>

          {showExamples && (
            <div className="absolute bottom-full left-0 mb-2 w-[700px] max-h-[350px] overflow-y-auto rounded-xl border border-zinc-300 bg-white p-4 shadow-xl dark:border-zinc-700 dark:bg-zinc-800 z-50">
              <div className="mb-3 flex items-center justify-between">
                <h3 className="text-sm font-semibold text-zinc-900 dark:text-white">{t('examplesTitle')}</h3>
                <button onClick={() => setShowExamples(false)} className="rounded p-1 text-zinc-400 hover:bg-zinc-200 dark:hover:bg-zinc-700">
                  <X className="size-4" />
                </button>
              </div>
              <div className="grid grid-cols-4 gap-3">
                {exampleGroups.map((group) => (
                  <div key={group.key}>
                    <div className="mb-2 flex items-center gap-1 border-b border-zinc-200 pb-1 dark:border-zinc-700">
                      <span>{group.icon}</span>
                      <span className="text-xs font-semibold text-zinc-900 dark:text-white">{group.title}</span>
                    </div>
                    <div className="space-y-1">
                      {group.questions.map((q, i) => (
                        <button key={i} onClick={() => { setText(q); setShowExamples(false); inputRef.current?.focus(); }}
                          className="w-full rounded px-2 py-1.5 text-left text-[11px] leading-tight text-zinc-500 hover:bg-cyan-600/10 hover:text-cyan-600 dark:text-zinc-400 dark:hover:text-cyan-400"
                        >
                          {q}
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* 출력형식 드롭다운 */}
        <div className="relative">
          {(() => {
            const current = formatOptions.find((o) => o.key === outputFormat) ?? formatOptions[0];
            const CurrentIcon = current.icon;
            return (
              <button
                type="button"
                onClick={() => setShowFormatMenu((v) => !v)}
                className={`flex h-9 shrink-0 items-center gap-1 rounded-lg border px-2 text-xs transition-colors ${
                  showFormatMenu
                    ? 'border-cyan-500 bg-cyan-600 text-white'
                    : 'border-zinc-300 bg-white text-zinc-700 hover:bg-zinc-100 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700'
                }`}
                title={t('formatLabel', { label: current.label })}
                aria-haspopup="listbox"
                aria-expanded={showFormatMenu}
              >
                <CurrentIcon className="size-3.5" />
                <span className="hidden sm:inline">{current.label}</span>
                <ChevronDown className={`size-3 transition-transform ${showFormatMenu ? 'rotate-180' : ''}`} />
              </button>
            );
          })()}

          {showFormatMenu && (
            <>
              {/* 외부 클릭 감지용 오버레이 */}
              <div
                className="fixed inset-0 z-40"
                onClick={() => setShowFormatMenu(false)}
                aria-hidden="true"
              />
              <ul
                role="listbox"
                className="absolute bottom-full left-0 z-50 mb-2 w-36 overflow-hidden rounded-lg border border-zinc-300 bg-white py-1 shadow-xl dark:border-zinc-700 dark:bg-zinc-800"
              >
                {formatOptions.map(({ key, icon: Icon, label }) => {
                  const selected = outputFormat === key;
                  return (
                    <li key={key} role="option" aria-selected={selected}>
                      <button
                        type="button"
                        onClick={() => {
                          setOutputFormat(key);
                          setShowFormatMenu(false);
                        }}
                        className={`flex w-full items-center gap-2 px-3 py-1.5 text-left text-xs transition-colors ${
                          selected
                            ? 'bg-cyan-600/10 text-cyan-600 dark:text-cyan-400'
                            : 'text-zinc-700 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-700'
                        }`}
                      >
                        <Icon className="size-3.5" />
                        <span className="flex-1">{label}</span>
                        {selected && <span className="text-cyan-600 dark:text-cyan-400">✓</span>}
                      </button>
                    </li>
                  );
                })}
              </ul>
            </>
          )}
        </div>

        {/* 응답스타일 드롭다운 — 답변 길이/깊이 프리셋 */}
        <div className="relative">
          {(() => {
            const current = responseStyleOptions.find((o) => o.key === responseStyle) ?? responseStyleOptions[0];
            const CurrentIcon = current.icon;
            return (
              <button
                type="button"
                onClick={() => setShowStyleMenu((v) => !v)}
                className={`flex h-9 shrink-0 items-center gap-1 rounded-lg border px-2 text-xs transition-colors ${
                  showStyleMenu
                    ? 'border-violet-500 bg-violet-600 text-white'
                    : 'border-zinc-300 bg-white text-zinc-700 hover:bg-zinc-100 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700'
                }`}
                title={t('styleLabel', { label: current.label })}
                aria-haspopup="listbox"
                aria-expanded={showStyleMenu}
              >
                <CurrentIcon className="size-3.5" />
                <span className="hidden sm:inline">{current.label}</span>
                <ChevronDown className={`size-3 transition-transform ${showStyleMenu ? 'rotate-180' : ''}`} />
              </button>
            );
          })()}

          {showStyleMenu && (
            <>
              <div
                className="fixed inset-0 z-40"
                onClick={() => setShowStyleMenu(false)}
                aria-hidden="true"
              />
              <ul
                role="listbox"
                className="absolute bottom-full left-0 z-50 mb-2 w-36 overflow-hidden rounded-lg border border-zinc-300 bg-white py-1 shadow-xl dark:border-zinc-700 dark:bg-zinc-800"
              >
                {responseStyleOptions.map(({ key, icon: Icon, label }) => {
                  const selected = responseStyle === key;
                  return (
                    <li key={key} role="option" aria-selected={selected}>
                      <button
                        type="button"
                        onClick={() => {
                          setResponseStyle(key);
                          setShowStyleMenu(false);
                        }}
                        className={`flex w-full items-center gap-2 px-3 py-1.5 text-left text-xs transition-colors ${
                          selected
                            ? 'bg-violet-600/10 text-violet-600 dark:text-violet-400'
                            : 'text-zinc-700 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-700'
                        }`}
                      >
                        <Icon className="size-3.5" />
                        <span className="flex-1">{label}</span>
                        {selected && <span className="text-violet-600 dark:text-violet-400">✓</span>}
                      </button>
                    </li>
                  );
                })}
              </ul>
            </>
          )}
        </div>

        {/* 텍스트 입력 */}
        <div className="relative flex-1">
          <input
            ref={inputRef}
            type="text"
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                handleSend();
              }
            }}
            placeholder={
              isListening
                ? t('placeholderListening')
                : selectedFile
                  ? t('placeholderWithFile')
                  : t('placeholderDefault')
            }
            className={`h-9 w-full rounded-lg border px-3 text-sm text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:ring-2 dark:text-white ${
              isListening
                ? 'border-rose-500 bg-rose-50 focus:ring-rose-500/50 dark:bg-rose-950/20'
                : 'border-zinc-300 bg-white focus:ring-cyan-500/50 dark:border-zinc-700 dark:bg-zinc-800'
            }`}
            disabled={busy}
          />
          {isListening && interimTranscript && (
            <div className="absolute bottom-full left-0 mb-1 rounded-lg bg-rose-100 px-3 py-1.5 text-sm text-rose-700 dark:bg-rose-900/50 dark:text-rose-300">
              <span className="animate-pulse">🎤</span> {interimTranscript}
            </div>
          )}
        </div>

        {/* 전송 */}
        <button
          onClick={handleSend}
          disabled={busy || !text.trim()}
          className="flex h-9 shrink-0 items-center gap-1 rounded-lg bg-cyan-600 px-3 text-sm font-medium text-white hover:bg-cyan-500 disabled:opacity-50"
        >
          {busy ? (
            <span className="size-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
          ) : (
            <Send className="size-4" />
          )}
          <span className="hidden sm:inline">{busy ? t('sending') : t('send')}</span>
        </button>
      </div>

      <p className="mt-2 text-center text-xs text-zinc-400">
        {t('disclaimer')}
      </p>
    </div>
  );
});

export default ChatInput;
