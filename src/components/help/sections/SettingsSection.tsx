/**
 * @file SettingsSection.tsx
 * @description 도움말 - 설정 & 옵션 섹션.
 * 초보자 가이드: 디스플레이 화면의 라인 선택, 테마, 언어 설정 등을 안내.
 */
import SectionWrapper from './SectionWrapper';

export default function SettingsSection() {
  return (
    <SectionWrapper id="settings" title="설정 & 옵션" icon="🎛️">
      <div className="space-y-6">
        {/* 라인 선택 */}
        <div>
          <h3 className="mb-3 text-lg font-bold text-white">라인 선택</h3>
          <p className="mb-3 leading-relaxed text-zinc-300">
            각 디스플레이 화면에서 모니터링할 라인을 선택할 수 있습니다.
            헤더의 톱니바퀴(⚙) 아이콘을 클릭하면 라인 선택 모달이 열립니다.
          </p>
          <ul className="list-inside list-disc space-y-1.5 text-sm text-zinc-400">
            <li>최초 접속 시 라인이 미선택이면 자동으로 선택 모달이 표시됩니다.</li>
            <li>선택한 라인은 화면별로 localStorage에 저장되어 다음 접속 시 유지됩니다.</li>
            <li>전체 선택/해제 토글로 빠르게 전환할 수 있습니다.</li>
          </ul>
        </div>

        {/* SQL 뷰어 */}
        <div>
          <h3 className="mb-3 text-lg font-bold text-white">SQL 뷰어</h3>
          <p className="mb-3 leading-relaxed text-zinc-300">
            헤더의 SQL 아이콘을 클릭하면 현재 화면에서 사용 중인 SQL 쿼리를 확인할 수 있습니다.
            개발자나 DBA가 데이터 소스를 추적하는 데 유용합니다.
          </p>
        </div>

        {/* 언어 변경 */}
        <div>
          <h3 className="mb-3 text-lg font-bold text-white">언어 변경</h3>
          <p className="mb-3 leading-relaxed text-zinc-300">
            3개 언어를 지원하며, 메뉴의 도구 설정에서 변경할 수 있습니다:
          </p>
          <div className="flex gap-3">
            {[
              { code: 'ko', name: '한국어', flag: '🇰🇷' },
              { code: 'en', name: 'English', flag: '🇺🇸' },
              { code: 'es', name: 'Español', flag: '🇪🇸' },
            ].map((lang) => (
              <div key={lang.code} className="flex items-center gap-2 rounded-lg border border-zinc-800 bg-zinc-900/50 px-4 py-2">
                <span className="text-lg">{lang.flag}</span>
                <div>
                  <span className="text-sm font-bold text-white">{lang.name}</span>
                  <span className="ml-1 text-xs text-zinc-500">({lang.code})</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* 자동 갱신 */}
        <div>
          <h3 className="mb-3 text-lg font-bold text-white">자동 갱신</h3>
          <p className="mb-3 leading-relaxed text-zinc-300">
            모든 디스플레이 화면은 기본 30초 주기로 데이터를 자동 갱신합니다.
            헤더 우측에 현재 갱신 주기와 스크롤 주기가 표시됩니다.
          </p>
          <div className="rounded-lg border border-zinc-800 bg-zinc-900/50 p-4">
            <div className="flex items-center gap-6 text-sm">
              <div>
                <span className="text-zinc-500">새로고침:</span>
                <span className="ml-1 font-mono text-white">30초</span>
              </div>
              <div>
                <span className="text-zinc-500">스크롤:</span>
                <span className="ml-1 font-mono text-white">10초</span>
              </div>
            </div>
            <p className="mt-2 text-xs text-zinc-500">
              * 갱신 주기는 옵션 설정(화면 18)에서 변경할 수 있습니다.
            </p>
          </div>
        </div>

        {/* 데이터 저장 */}
        <div>
          <h3 className="mb-3 text-lg font-bold text-white">데이터 저장</h3>
          <p className="leading-relaxed text-zinc-300">
            모든 설정(라인 선택, 메뉴 바로가기, 테마, 언어 등)은 브라우저의 localStorage에 저장됩니다.
            같은 브라우저에서 다시 접속하면 이전 설정이 자동으로 복원됩니다.
          </p>
          <p className="mt-2 text-sm text-zinc-500">
            * 다른 브라우저나 시크릿 모드에서는 설정이 초기화됩니다.
          </p>
        </div>
      </div>
    </SectionWrapper>
  );
}
