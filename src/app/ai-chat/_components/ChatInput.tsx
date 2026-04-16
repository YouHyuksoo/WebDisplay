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

import { useState, useRef, useCallback, useEffect, memo } from 'react';
import { Send, Mic, MicOff, Lightbulb, Paperclip, X } from 'lucide-react';
import { postSse } from '../_lib/sse-client';
import PersonaPicker from './PersonaPicker';
import ModelPicker from './ModelPicker';
import type { ProviderId } from '@/lib/ai/providers/types';

/* ------------------------------------------------------------------ */
/*  MES 예시 질문 그룹                                                  */
/* ------------------------------------------------------------------ */

const EXAMPLE_GROUPS = [
  {
    title: '생산 현황', icon: '📊',
    questions: [
      '오늘 P51 야간 생산 계획 알려줘',
      '어제 SMD 라인별 생산수량 비교',
      '이번 주 SMPS 라인 시간대별 실적 차트',
      '라인별 UPH 달성률 순위',
    ],
  },
  {
    title: '품질 분석', icon: '🔍',
    questions: [
      '오늘 CTQ 이상점 발생한 라인 목록',
      '이번 달 FPY 톱 5 / 워스트 5 라인',
      'AOI 불량률 추이 차트 (최근 7일)',
      'SPC 관리도 이탈 항목',
    ],
  },
  {
    title: '설비/자재', icon: '⚙️',
    questions: [
      '현재 MSL 경고 발생한 자재',
      '솔더 투입 이력 (오늘)',
      '설비 알람 로그 최근 10건',
      '피더 상태 이상 라인',
    ],
  },
  {
    title: '추적성', icon: '🔗',
    questions: [
      '바코드 XXXX의 공정 이력',
      '런카드별 투입/포장 수량 비교',
      '매거진 재고 현황',
      '팩 시리얼 추적',
    ],
  },
];

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
  onProviderChange: (id: ProviderId) => void;
  onModelChange: (id: string) => void;
  onPersonaChange: (id: string) => void;
  onStreamStart: () => void;
  onStreamEnd: () => void;
  onSessionAutoCreate: (sessionId: string) => void;
  suggestedInput?: string;
  onSuggestedInputHandled?: () => void;
}

/* ------------------------------------------------------------------ */
/*  컴포넌트                                                            */
/* ------------------------------------------------------------------ */

const ChatInput = memo(function ChatInput({
  sessionId, providerId, modelId, personaId,
  onProviderChange, onModelChange, onPersonaChange,
  onStreamStart, onStreamEnd, onSessionAutoCreate,
  suggestedInput, onSuggestedInputHandled,
}: Props) {
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const [showExamples, setShowExamples] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  // 음성 인식
  const [isListening, setIsListening] = useState(false);
  const [speechSupported, setSpeechSupported] = useState(false);
  const [interimTranscript, setInterimTranscript] = useState('');
  const recognitionRef = useRef<SpeechRecognitionInstance | null>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
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

    try {
      let sid = sessionId;
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

      await postSse('/api/ai-chat/stream', {
        sessionId: sid, prompt: text, providerId, modelId, personaId,
      }, () => {});

      setText('');
      setSelectedFile(null);
    } catch (e) {
      console.error(e);
    } finally {
      setBusy(false);
      onStreamEnd();
    }
  }, [text, busy, sessionId, providerId, modelId, personaId, onStreamStart, onStreamEnd, onSessionAutoCreate]);

  return (
    <div className="border-t border-zinc-200 bg-zinc-50 p-3 dark:border-zinc-700 dark:bg-zinc-900">
      {/* 페르소나 / 모델 선택 */}
      <div className="mb-2 flex items-center gap-2">
        <PersonaPicker value={personaId} onChange={onPersonaChange} />
        <ModelPicker providerId={providerId} modelId={modelId} onProviderChange={onProviderChange} onModelChange={onModelChange} />
      </div>

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

      {/* 입력 영역 */}
      <div className="flex items-end gap-2">
        {/* 파일 첨부 */}
        <input ref={fileInputRef} type="file" accept=".xlsx,.xls,.csv" onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) setSelectedFile(f);
          e.target.value = '';
        }} className="hidden" />
        <button
          onClick={() => fileInputRef.current?.click()}
          disabled={busy}
          className="rounded-lg p-2 text-zinc-400 hover:bg-zinc-200 hover:text-zinc-700 dark:hover:bg-zinc-800 dark:hover:text-zinc-200 disabled:opacity-50"
          title="파일 첨부 (.xlsx, .xls, .csv)"
        >
          <Paperclip className="size-5" />
        </button>

        {/* 음성 입력 */}
        {speechSupported && (
          <div className="relative">
            <button
              onClick={toggleListening}
              disabled={busy}
              className={`rounded-lg p-2 disabled:opacity-50 ${
                isListening
                  ? 'bg-rose-500 text-white hover:bg-rose-600'
                  : 'text-zinc-400 hover:bg-zinc-200 hover:text-zinc-700 dark:hover:bg-zinc-800 dark:hover:text-zinc-200'
              }`}
              title={isListening ? '음성 인식 중지' : '음성으로 입력'}
            >
              {isListening ? <Mic className="size-5" /> : <MicOff className="size-5" />}
            </button>
            {isListening && (
              <span className="absolute -right-1 -top-1 size-3 animate-pulse rounded-full bg-rose-500" />
            )}
          </div>
        )}

        {/* 예시 질문 */}
        <div className="relative">
          <button
            onClick={() => setShowExamples(!showExamples)}
            className={`rounded-lg p-2 ${
              showExamples
                ? 'bg-cyan-600/20 text-cyan-400'
                : 'text-zinc-400 hover:bg-zinc-200 hover:text-zinc-700 dark:hover:bg-zinc-800 dark:hover:text-zinc-200'
            }`}
            title="예시 질문"
          >
            <Lightbulb className="size-5" />
          </button>

          {showExamples && (
            <div className="absolute bottom-full left-0 mb-2 w-[700px] max-h-[350px] overflow-y-auto rounded-xl border border-zinc-300 bg-white p-4 shadow-xl dark:border-zinc-700 dark:bg-zinc-800 z-50">
              <div className="mb-3 flex items-center justify-between">
                <h3 className="text-sm font-semibold text-zinc-900 dark:text-white">예시 질문</h3>
                <button onClick={() => setShowExamples(false)} className="rounded p-1 text-zinc-400 hover:bg-zinc-200 dark:hover:bg-zinc-700">
                  <X className="size-4" />
                </button>
              </div>
              <div className="grid grid-cols-4 gap-3">
                {EXAMPLE_GROUPS.map((group) => (
                  <div key={group.title}>
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

        {/* 텍스트 입력 */}
        <div className="relative flex-1">
          <textarea
            ref={inputRef}
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSend();
              }
            }}
            rows={1}
            placeholder={
              isListening
                ? '🎤 말씀하세요... (인식된 내용이 여기에 입력됩니다)'
                : selectedFile
                  ? '파일과 함께 보낼 메시지를 입력하세요...'
                  : '질문을 입력하세요... (Shift+Enter 줄바꿈)'
            }
            className={`w-full resize-none rounded-xl border px-4 py-3 pr-12 text-sm text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:ring-2 dark:text-white ${
              isListening
                ? 'border-rose-500 bg-rose-50 focus:ring-rose-500/50 dark:bg-rose-950/20'
                : 'border-zinc-300 bg-white focus:ring-cyan-500/50 dark:border-zinc-700 dark:bg-zinc-800'
            }`}
            style={{ minHeight: '48px', maxHeight: '120px' }}
            disabled={busy}
          />
          {/* 중간 인식 결과 */}
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
          className="flex items-center gap-1 rounded-xl bg-cyan-600 px-4 py-3 text-sm font-medium text-white hover:bg-cyan-500 disabled:opacity-50"
        >
          {busy ? (
            <span className="size-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
          ) : (
            <Send className="size-4" />
          )}
          <span className="hidden sm:inline">{busy ? '처리중...' : '전송'}</span>
        </button>
      </div>

      <p className="mt-2 text-center text-xs text-zinc-400">
        AI 어시스턴트는 MES 데이터를 분석하여 답변합니다. 민감한 정보는 입력하지 마세요.
      </p>
    </div>
  );
});

export default ChatInput;
