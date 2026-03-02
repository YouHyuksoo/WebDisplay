/**
 * @file page.tsx
 * @description 도움말 페이지 라우트. /help 경로로 접근.
 * 초보자 가이드: screenId 쿼리 파라미터로 해당 섹션으로 자동 스크롤.
 * useSearchParams를 사용하므로 Suspense 경계가 필요.
 */
import { Suspense } from 'react';
import HelpPage from '@/components/help/HelpPage';

export default function Help() {
  return (
    <Suspense>
      <HelpPage />
    </Suspense>
  );
}
