/**
 * @file SectionWrapper.tsx
 * @description 도움말 섹션 공통 래퍼. 섹션 ID(앵커), 제목, 아이콘을 표준화.
 * 초보자 가이드: 모든 섹션 컴포넌트가 이 래퍼로 감싸져 일관된 스타일과 앵커를 갖는다.
 */

interface SectionWrapperProps {
  id: string;
  title: string;
  icon: string;
  children: React.ReactNode;
}

export default function SectionWrapper({ id, title, icon, children }: SectionWrapperProps) {
  return (
    <section id={id} className="scroll-mt-8 pb-12 pt-8">
      <div className="mb-6 flex items-center gap-3 border-b border-zinc-800 pb-4">
        <span className="text-2xl">{icon}</span>
        <h2 className="text-2xl font-black text-white">{title}</h2>
      </div>
      {children}
    </section>
  );
}
