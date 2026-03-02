/**
 * @file ShortcutsSection.tsx
 * @description 도움말 - 키보드 단축키 섹션.
 * 초보자 가이드: 디스플레이 및 메뉴에서 사용 가능한 키보드 단축키 목록.
 */
import SectionWrapper from './SectionWrapper';

const SHORTCUTS = [
  { key: 'ESC', context: '디스플레이 화면', action: '메뉴(홈)로 돌아가기' },
  { key: 'ESC', context: '모달/팝업', action: '모달 닫기' },
  { key: 'F5', context: '전체', action: '페이지 새로고침 (데이터 즉시 갱신)' },
  { key: 'F11', context: '전체', action: '전체 화면 토글 (브라우저 기능)' },
  { key: '마우스 휠', context: '3D 메뉴', action: '카테고리 이동 (상/하)' },
  { key: '좌우 스와이프', context: '3D 메뉴 (터치)', action: '카테고리 이동' },
  { key: '컬럼 경계 드래그', context: '데이터 테이블', action: '컬럼 폭 조정 (저장됨)' },
];

export default function ShortcutsSection() {
  return (
    <SectionWrapper id="shortcuts" title="키보드 단축키" icon="⌨️">
      <div className="space-y-6">
        <p className="text-zinc-300">
          키보드와 마우스를 활용하여 더 빠르게 화면을 조작할 수 있습니다.
        </p>

        <div className="overflow-hidden rounded-lg border border-zinc-700">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-zinc-700 bg-zinc-800">
                <th className="px-4 py-3 text-left font-bold text-white">단축키</th>
                <th className="px-4 py-3 text-left font-bold text-white">사용 위치</th>
                <th className="px-4 py-3 text-left font-bold text-white">동작</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800">
              {SHORTCUTS.map((s, i) => (
                <tr key={i} className={i % 2 === 0 ? 'bg-zinc-900/50' : 'bg-zinc-950'}>
                  <td className="px-4 py-2.5">
                    <kbd className="rounded border border-zinc-600 bg-zinc-800 px-2 py-0.5 font-mono text-xs text-zinc-200">
                      {s.key}
                    </kbd>
                  </td>
                  <td className="px-4 py-2.5 text-zinc-400">{s.context}</td>
                  <td className="px-4 py-2.5 text-zinc-300">{s.action}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* 팁 */}
        <div className="rounded-lg border border-blue-900/50 bg-blue-950/30 p-4">
          <h4 className="mb-2 text-sm font-bold text-blue-400">💡 TV 모니터 운영 팁</h4>
          <ul className="list-inside list-disc space-y-1 text-sm text-zinc-400">
            <li>TV에 상시 표시할 경우 <kbd className="rounded border border-zinc-600 bg-zinc-800 px-1.5 py-0.5 font-mono text-xs">F11</kbd> 전체화면 모드를 사용하세요.</li>
            <li>여러 화면을 순환 표시하려면 브라우저의 탭 자동 전환 확장을 사용하세요.</li>
            <li>라인 선택 후 해당 설정이 저장되므로, 전원 복구 시 자동으로 이전 상태가 복원됩니다.</li>
          </ul>
        </div>
      </div>
    </SectionWrapper>
  );
}
