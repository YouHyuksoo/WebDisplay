/**
 * @file src/app/ai-chat/layout.tsx
 * @description AI 챗 페이지 다크 테마 레이아웃.
 */
export default function AiChatLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-screen w-screen flex-col bg-zinc-950 text-zinc-100">
      {children}
    </div>
  );
}
