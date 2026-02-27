/**
 * @file DisplayMessageBar.tsx
 * @description 디스플레이 화면 하단 메시지 바. PB의 st_msg 역할.
 * 초보자 가이드: 화면 맨 아래 고정된 얇은 바로, 상태 메시지나 알림을 표시한다.
 */
interface DisplayMessageBarProps {
  message?: string;
}

export default function DisplayMessageBar({ message }: DisplayMessageBarProps) {
  return (
    <footer className="flex h-8 shrink-0 items-center border-t border-zinc-200 bg-zinc-50 px-6 dark:border-white/10 dark:bg-black/50">
      <span className="text-xs text-zinc-500 dark:text-zinc-400">{message || ''}</span>
    </footer>
  );
}
