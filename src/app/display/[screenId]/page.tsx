/**
 * @file [screenId]/page.tsx
 * @description 디스플레이 화면 동적 라우트. screenId에 따라 적절한 화면 컴포넌트를 로드.
 * 초보자 가이드: URL의 screenId 파라미터로 SCREENS 레지스트리에서 화면 설정을 찾아 렌더링한다.
 */
import { notFound } from 'next/navigation';
import { SCREENS } from '@/lib/screens';
import DisplayLayout from '@/components/display/DisplayLayout';
import MachineStatusSmd from '@/components/display/screens/MachineStatusSmd';

interface PageProps {
  params: Promise<{ screenId: string }>;
}

export default async function DisplayPage({ params }: PageProps) {
  const { screenId } = await params;
  const screen = SCREENS[screenId];
  if (!screen) notFound();

  return (
    <DisplayLayout title={screen.titleKo}>
      {screenId === '24' ? (
        <MachineStatusSmd />
      ) : (
        <div className="flex h-full items-center justify-center text-zinc-400 dark:text-zinc-500">
          <div className="text-center">
            <p className="text-4xl font-bold" style={{ color: 'var(--glow-primary)' }}>{screen.titleKo}</p>
            <p className="mt-2 text-sm">화면 구현 예정 (Menu {screen.id})</p>
            <p className="mt-1 text-xs text-zinc-400">ESC 키로 메뉴 복귀</p>
          </div>
        </div>
      )}
    </DisplayLayout>
  );
}
