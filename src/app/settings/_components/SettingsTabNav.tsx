/**
 * @file src/app/settings/_components/SettingsTabNav.tsx
 * @description 설정 페이지 좌측 탭 네비. usePathname으로 현재 탭 강조.
 *
 * 초보자 가이드:
 * 1. TABS 배열에 탭 경로/라벨/아이콘을 선언
 * 2. usePathname으로 현재 경로를 읽어 startsWith로 활성 탭 판정
 * 3. 라이트/다크 모드 모두를 고려하여 기본색 + dark: 변형을 함께 지정
 */
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutGrid, Bot, UserCog, BookOpen } from "lucide-react";

const TABS = [
  { href: "/settings/cards", label: "카드 관리", icon: LayoutGrid },
  { href: "/settings/ai-models", label: "AI 모델", icon: Bot },
  { href: "/settings/ai-personas", label: "AI 페르소나", icon: UserCog },
  { href: "/settings/ai-glossary", label: "AI 용어사전", icon: BookOpen },
];

export default function SettingsTabNav() {
  const pathname = usePathname();
  return (
    <nav className="flex w-56 shrink-0 flex-col gap-1 border-r border-zinc-200 bg-white p-3 dark:border-zinc-800 dark:bg-zinc-950">
      {TABS.map((t) => {
        const active = pathname.startsWith(t.href);
        const Icon = t.icon;
        return (
          <Link
            key={t.href}
            href={t.href}
            className={`flex items-center gap-2 rounded-md px-3 py-2 text-sm ${
              active
                ? "bg-zinc-100 text-cyan-600 dark:bg-zinc-800 dark:text-cyan-400"
                : "text-zinc-600 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-800/60"
            }`}
          >
            <Icon className="size-4" />
            {t.label}
          </Link>
        );
      })}
    </nav>
  );
}
