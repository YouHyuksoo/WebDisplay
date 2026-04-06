"use client";

import { useEffect, useMemo, useState } from "react";

interface RectShape {
  top: number;
  left: number;
  width: number;
  height: number;
}

interface Props {
  chartKey: string;
  title: string;
  getAnchorRect: (key: string) => RectShape | null;
  onClosed: () => void;
  children: React.ReactNode;
}

const ANIMATION_MS = 260;
const VIEWPORT_MARGIN = 72;

function fallbackRect(): RectShape {
  if (typeof window === "undefined") {
    return { top: 120, left: 120, width: 360, height: 220 };
  }

  return {
    top: window.innerHeight / 2 - 110,
    left: window.innerWidth / 2 - 180,
    width: 360,
    height: 220,
  };
}

export default function ChartExpandOverlay({ chartKey, title, getAnchorRect, onClosed, children }: Props) {
  const [phase, setPhase] = useState<"opening" | "open" | "closing">("opening");
  const [anchorRect, setAnchorRect] = useState<RectShape>(() => getAnchorRect(chartKey) ?? fallbackRect());

  useEffect(() => {
    const nextRect = getAnchorRect(chartKey);
    if (nextRect) {
      setAnchorRect(nextRect);
    }
  }, [chartKey, getAnchorRect]);

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        const nextRect = getAnchorRect(chartKey);
        if (nextRect) {
          setAnchorRect(nextRect);
        }
        setPhase("closing");
      }
    };

    const rafId = window.requestAnimationFrame(() => setPhase("open"));
    window.addEventListener("keydown", onKeyDown);

    return () => {
      window.cancelAnimationFrame(rafId);
      window.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [chartKey, getAnchorRect]);

  useEffect(() => {
    if (phase !== "closing") return;

    const timer = window.setTimeout(() => {
      onClosed();
    }, ANIMATION_MS);

    return () => window.clearTimeout(timer);
  }, [onClosed, phase]);

  const panelStyle = useMemo(() => {
    if (phase === "open") {
      const maxWidth = typeof window === "undefined" ? 1280 : window.innerWidth - VIEWPORT_MARGIN * 2;
      const maxHeight = typeof window === "undefined" ? 820 : window.innerHeight - VIEWPORT_MARGIN * 2;
      const width = Math.min(Math.max(anchorRect.width * 1.7, 820), maxWidth);
      const height = Math.min(Math.max(anchorRect.height * 1.75, 520), maxHeight);

      return {
        top: Math.max((maxHeight + VIEWPORT_MARGIN * 2 - height) / 2, VIEWPORT_MARGIN),
        left: Math.max((maxWidth + VIEWPORT_MARGIN * 2 - width) / 2, VIEWPORT_MARGIN),
        width,
        height,
        borderRadius: 24,
      };
    }

    return {
      top: anchorRect.top,
      left: anchorRect.left,
      width: anchorRect.width,
      height: anchorRect.height,
      borderRadius: 16,
    };
  }, [anchorRect, phase]);

  const beginClose = () => {
    const nextRect = getAnchorRect(chartKey);
    if (nextRect) {
      setAnchorRect(nextRect);
    }
    setPhase("closing");
  };

  return (
    <div className="fixed inset-0 z-50" aria-modal="true" role="dialog">
      <button
        type="button"
        className={`absolute inset-0 bg-gray-950/85 backdrop-blur-sm transition-opacity duration-300 ${phase === "open" ? "opacity-100" : "opacity-0"}`}
        onClick={beginClose}
        aria-label="닫기"
      />
      <div
        className="fixed border border-gray-700 bg-gray-900 shadow-2xl transition-all duration-300 ease-out"
        style={panelStyle}
      >
        <div className={`flex h-full flex-col overflow-hidden px-5 pt-5 pb-8 transition-opacity duration-200 ${phase === "open" ? "opacity-100 delay-75" : "opacity-0"}`}>
          <div className="mb-4 flex items-center justify-between gap-4 border-b border-gray-800 pb-3">
            <div>
              <h3 className="text-base font-semibold text-gray-100">{title}</h3>
              <p className="mt-1 text-xs text-gray-500">Esc 키 또는 배경 클릭으로 닫을 수 있습니다.</p>
            </div>
            <button
              type="button"
              onClick={beginClose}
              className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-gray-700 bg-gray-800 text-gray-400 transition-colors hover:border-red-500 hover:text-red-300"
              title="닫기"
              aria-label="닫기"
            >
              <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M18 6 6 18" />
                <path d="m6 6 12 12" />
              </svg>
            </button>
          </div>
          <div className="min-h-0 flex-1 overflow-hidden pb-4">
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}

