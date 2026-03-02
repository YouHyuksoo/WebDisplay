/**
 * @file MenuSystemSection.tsx
 * @description 도움말 - 메뉴 시스템 섹션. 3D 터널, 카드, 테마/배경 설명.
 * 초보자 가이드: 3D 메뉴의 조작 방법, 카드 레이아웃, 커스터마이징 기능을 안내.
 */
import SectionWrapper from './SectionWrapper';

export default function MenuSystemSection() {
  return (
    <SectionWrapper id="menu-system" title="메뉴 시스템" icon="🎮">
      <div className="space-y-6">
        {/* 3D 터널 메뉴 */}
        <div>
          <h3 className="mb-3 text-lg font-bold text-white">3D 터널 메뉴</h3>
          <p className="mb-3 leading-relaxed text-zinc-300">
            루트 경로(/)에 접속하면 3D 터널 애니메이션 안에 카테고리별 메뉴 카드가 표시됩니다.
            마우스 휠이나 터치 스와이프로 카테고리를 이동할 수 있습니다.
          </p>
          <div className="rounded-lg border border-zinc-800 bg-zinc-900/50 p-4">
            <h4 className="mb-2 text-sm font-bold text-zinc-300">터널 모양 변경</h4>
            <p className="text-sm text-zinc-400">
              설정에서 6가지 터널 모양을 선택할 수 있습니다:
              <span className="ml-1 text-zinc-300">삼각형 · 원형 · 사각형 · 육각형 · 별 · 무한</span>
            </p>
          </div>
        </div>

        {/* 카드 레이아웃 */}
        <div>
          <h3 className="mb-3 text-lg font-bold text-white">카드 레이아웃</h3>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-lg border border-zinc-800 bg-zinc-900/50 p-4">
              <h4 className="mb-1 font-bold text-emerald-400">그리드 모드</h4>
              <p className="text-sm text-zinc-400">카드를 격자 형태로 나열합니다. 많은 메뉴를 한눈에 볼 때 적합합니다.</p>
            </div>
            <div className="rounded-lg border border-zinc-800 bg-zinc-900/50 p-4">
              <h4 className="mb-1 font-bold text-purple-400">캐러셀 모드</h4>
              <p className="text-sm text-zinc-400">카드를 수평 슬라이더로 표시합니다. 시각적으로 돋보이는 프레젠테이션에 적합합니다.</p>
            </div>
          </div>
        </div>

        {/* 카테고리 */}
        <div>
          <h3 className="mb-3 text-lg font-bold text-white">카테고리</h3>
          <p className="mb-3 text-sm text-zinc-400">메뉴 카드는 카테고리별로 분류됩니다. 기본 카테고리:</p>
          <div className="overflow-hidden rounded-lg border border-zinc-700">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-zinc-700 bg-zinc-800">
                  <th className="px-4 py-2 text-left font-bold text-white">카테고리</th>
                  <th className="px-4 py-2 text-left font-bold text-white">설명</th>
                  <th className="px-4 py-2 text-left font-bold text-white">화면</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800">
                <tr><td className="px-4 py-2 text-yellow-400">★ FAVORITES</td><td className="px-4 py-2 text-zinc-400">즐겨찾기</td><td className="px-4 py-2 text-zinc-400">모든 화면</td></tr>
                <tr><td className="px-4 py-2 text-blue-400">❖ SMD MONITORING</td><td className="px-4 py-2 text-zinc-400">SMD 모니터링</td><td className="px-4 py-2 text-zinc-400">24, 25, 26, 27</td></tr>
                <tr><td className="px-4 py-2 text-cyan-400">▤ PBA MONITORING</td><td className="px-4 py-2 text-zinc-400">PBA 모니터링</td><td className="px-4 py-2 text-zinc-400">21</td></tr>
                <tr><td className="px-4 py-2 text-orange-400">⌂ EQUIPMENT</td><td className="px-4 py-2 text-zinc-400">설비 모니터링</td><td className="px-4 py-2 text-zinc-400">34, 35</td></tr>
                <tr><td className="px-4 py-2 text-emerald-400">✔ QUALITY</td><td className="px-4 py-2 text-zinc-400">품질 관리</td><td className="px-4 py-2 text-zinc-400">29, 30, 31, 37</td></tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* 테마 & 배경 */}
        <div>
          <h3 className="mb-3 text-lg font-bold text-white">테마 & 배경</h3>
          <div className="space-y-3">
            <div>
              <h4 className="mb-2 text-sm font-bold text-zinc-300">글로우 테마 (8종)</h4>
              <div className="flex flex-wrap gap-2">
                {[
                  { name: 'Gold', color: 'bg-yellow-500' },
                  { name: 'Purple', color: 'bg-purple-500' },
                  { name: 'Cyan', color: 'bg-cyan-400' },
                  { name: 'Pink', color: 'bg-pink-400' },
                  { name: 'Green', color: 'bg-green-400' },
                  { name: 'Red', color: 'bg-red-400' },
                  { name: 'Blue', color: 'bg-blue-400' },
                  { name: 'White', color: 'bg-zinc-200' },
                ].map((t) => (
                  <span key={t.name} className="flex items-center gap-1.5 rounded-full border border-zinc-700 bg-zinc-800 px-3 py-1 text-xs text-zinc-300">
                    <span className={`h-2.5 w-2.5 rounded-full ${t.color}`} />
                    {t.name}
                  </span>
                ))}
              </div>
            </div>
            <div>
              <h4 className="mb-2 text-sm font-bold text-zinc-300">배경 효과 (3종)</h4>
              <div className="flex flex-wrap gap-2">
                {['클래식 터널', '코스믹 워프', '오로라'].map((name) => (
                  <span key={name} className="rounded-full border border-zinc-700 bg-zinc-800 px-3 py-1 text-xs text-zinc-300">
                    {name}
                  </span>
                ))}
              </div>
            </div>
            <div>
              <h4 className="mb-2 text-sm font-bold text-zinc-300">카드 스타일 (9종)</h4>
              <div className="flex flex-wrap gap-2">
                {['글래스', '무지개', '그라데이션', '다크', '네온', '헤르메스', '사이버펑크', '애플', '럭셔리'].map((name) => (
                  <span key={name} className="rounded-full border border-zinc-700 bg-zinc-800 px-3 py-1 text-xs text-zinc-300">
                    {name}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* 바로가기 관리 */}
        <div>
          <h3 className="mb-3 text-lg font-bold text-white">바로가기 관리</h3>
          <ul className="list-inside list-disc space-y-1.5 text-zinc-300">
            <li><strong className="text-white">추가</strong> — 카드 우클릭 또는 + 버튼으로 새 바로가기를 추가합니다.</li>
            <li><strong className="text-white">수정</strong> — 카드를 우클릭하여 제목, URL, 아이콘, 색상을 변경합니다.</li>
            <li><strong className="text-white">삭제</strong> — 카드 우클릭 메뉴에서 삭제를 선택합니다.</li>
            <li><strong className="text-white">검색</strong> — 상단 검색바에서 바로가기를 빠르게 찾을 수 있습니다.</li>
          </ul>
        </div>
      </div>
    </SectionWrapper>
  );
}
