/**
 * @file [screenId]/page.tsx
 * @description 디스플레이 화면 동적 라우트. screenId에 따라 적절한 화면 컴포넌트를 로드.
 * 초보자 가이드: URL의 screenId 파라미터로 SCREENS 레지스트리에서 화면 설정을 찾아 렌더링한다.
 * 제목은 클라이언트 컴포넌트에서 useTranslations으로 다국어 자동 적용.
 */
import { notFound } from 'next/navigation';
import { SCREENS } from '@/lib/screens';
import DisplayLayout from '@/components/display/DisplayLayout';
import DisplayPlaceholder from '@/components/display/DisplayPlaceholder';
import SmdProductionStatus from '@/components/display/screens/smd-status/SmdProductionStatus';
import MslWarningStatus from '@/components/display/screens/msl-warning/MslWarningStatus';

interface PageProps {
  params: Promise<{ screenId: string }>;
}

export default async function DisplayPage({ params }: PageProps) {
  const { screenId } = await params;
  const screen = SCREENS[screenId];
  if (!screen) notFound();

  if (screenId === '24') {
    return <SmdProductionStatus screenId={screenId} />;
  }

  if (screenId === '29') {
    return <MslWarningStatus screenId={screenId} />;
  }

  return (
    <DisplayLayout title={screen.title}>
      <DisplayPlaceholder screenId={screenId} />
    </DisplayLayout>
  );
}
