/**
 * @file HelpContent.tsx
 * @description 도움말 콘텐츠 영역. 모든 섹션 컴포넌트를 순서대로 렌더링.
 * 초보자 가이드: 각 섹션은 id 속성으로 앵커 역할을 하여 사이드바 클릭 시 스크롤 대상이 된다.
 */
import OverviewSection from './sections/OverviewSection';
import MenuSystemSection from './sections/MenuSystemSection';
import SmdMonitoringSection from './sections/SmdMonitoringSection';
import PbaMonitoringSection from './sections/PbaMonitoringSection';
import EquipmentSection from './sections/EquipmentSection';
import QualitySection from './sections/QualitySection';
import SettingsSection from './sections/SettingsSection';
import ShortcutsSection from './sections/ShortcutsSection';

export default function HelpContent() {
  return (
    <main className="mx-auto max-w-4xl px-8 py-10">
      <OverviewSection />
      <MenuSystemSection />
      <SmdMonitoringSection />
      <PbaMonitoringSection />
      <EquipmentSection />
      <QualitySection />
      <SettingsSection />
      <ShortcutsSection />
      <footer className="mt-16 border-t border-zinc-800 py-8 text-center text-sm text-zinc-600">
        SOLUM MES Display v1.0 &copy; {new Date().getFullYear()}
      </footer>
    </main>
  );
}
