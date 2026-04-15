/**
 * @file src/components/mxvc/reverse-trace/TraceStartScreen.tsx
 * @description 역추적 초기 CTA 화면 — "추적 시작" 버튼으로 위자드 오픈
 *
 * 초보자 가이드:
 * - 추적 결과가 없는 초기 상태에 표시
 * - onStart 콜백으로 부모가 위자드 모달을 연다
 */
'use client';

interface Props {
  onStart: () => void;
}

export default function TraceStartScreen({ onStart }: Props) {
  return (
    <div className="flex h-full w-full items-center justify-center p-8">
      <div className="max-w-lg w-full rounded-xl border border-zinc-700 bg-zinc-900/50 p-10 text-center shadow-lg">
        <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-blue-600/20 text-blue-400">
          <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="11" cy="11" r="8" />
            <path d="m21 21-4.3-4.3" />
          </svg>
        </div>
        <h2 className="mb-2 text-xl font-semibold text-zinc-100">역추적을 시작하세요</h2>
        <p className="mb-6 text-sm text-zinc-400">
          릴번호를 알면 바로 입력하고,<br />
          모를 때는 <span className="text-zinc-200">출고 / 런번호 / 피더 / 엑셀</span> 조건으로 찾아 추적할 수 있습니다.
        </p>
        <button
          onClick={onStart}
          className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-6 py-2.5 text-sm font-medium text-white transition-colors hover:bg-blue-500"
        >
          추적 시작
          <span aria-hidden>→</span>
        </button>
      </div>
    </div>
  );
}
