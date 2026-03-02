/**
 * @file OverviewSection.tsx
 * @description 도움말 - 시스템 개요 섹션.
 * 초보자 가이드: MES Display 시스템의 전반적인 소개와 화면 구조를 설명.
 */
import SectionWrapper from './SectionWrapper';

export default function OverviewSection() {
  return (
    <SectionWrapper id="overview" title="시스템 개요" icon="📋">
      <div className="space-y-6">
        {/* 소개 */}
        <div>
          <h3 className="mb-3 text-lg font-bold text-white">MES Display란?</h3>
          <p className="leading-relaxed text-zinc-300">
            SOLUM MES Display는 제조 실행 시스템(Manufacturing Execution System)의 실시간 모니터링 화면입니다.
            SMD 라인 생산현황, 품질 관리, 설비 상태 등을 TV/모니터에 상시 표시하여
            현장 관리자가 생산 상태를 한눈에 파악할 수 있도록 합니다.
          </p>
        </div>

        {/* 주요 특징 */}
        <div>
          <h3 className="mb-3 text-lg font-bold text-white">주요 특징</h3>
          <div className="grid gap-3 sm:grid-cols-2">
            {[
              { label: '실시간 갱신', desc: '30초 주기로 Oracle DB에서 최신 데이터를 자동 조회합니다.' },
              { label: 'TV 최적화', desc: '큰 폰트와 고대비 다크 테마로 원거리에서도 가독성이 뛰어납니다.' },
              { label: '다국어 지원', desc: '한국어/영어/스페인어 3개 언어를 지원하며 실시간 전환 가능합니다.' },
              { label: 'NG 경고', desc: '품질 이상 발생 시 빨간색 배너와 경고음으로 즉시 알림합니다.' },
            ].map((item) => (
              <div key={item.label} className="rounded-lg border border-zinc-800 bg-zinc-900/50 p-4">
                <h4 className="mb-1 font-bold text-blue-400">{item.label}</h4>
                <p className="text-sm text-zinc-400">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>

        {/* 화면 구조 */}
        <div>
          <h3 className="mb-3 text-lg font-bold text-white">화면 구조</h3>
          <p className="mb-3 text-sm text-zinc-400">모든 디스플레이 화면은 동일한 3단 레이아웃을 사용합니다:</p>
          <div className="overflow-hidden rounded-lg border border-zinc-700">
            <div className="flex h-10 items-center justify-between border-b border-zinc-700 bg-zinc-800 px-4">
              <span className="text-sm font-bold text-white">헤더 (h-14)</span>
              <span className="text-xs text-zinc-500">제목 · 시간 · 설정 · SQL보기 · 도움말 · 나가기</span>
            </div>
            <div className="flex h-32 items-center justify-center bg-zinc-900/50">
              <span className="text-zinc-500">콘텐츠 영역 (flex-1) — 데이터 테이블/그리드</span>
            </div>
            <div className="flex h-8 items-center justify-center border-t border-zinc-700 bg-zinc-800">
              <span className="text-xs text-zinc-500">메시지바 (h-8) — 스크롤 진행 표시</span>
            </div>
          </div>
        </div>

        {/* 접근 방법 */}
        <div>
          <h3 className="mb-3 text-lg font-bold text-white">접근 방법</h3>
          <ol className="list-inside list-decimal space-y-2 text-zinc-300">
            <li><strong className="text-white">3D 메뉴</strong> — 브라우저에서 루트 경로(/)로 접속하면 3D 터널 메뉴가 표시됩니다.</li>
            <li><strong className="text-white">직접 URL</strong> — <code className="rounded bg-zinc-800 px-2 py-0.5 text-sm text-blue-400">/display/24</code> 처럼 화면 ID를 직접 입력합니다.</li>
            <li><strong className="text-white">즐겨찾기</strong> — 메뉴의 FAVORITES 카테고리에서 자주 사용하는 화면에 빠르게 접근합니다.</li>
          </ol>
        </div>
      </div>
    </SectionWrapper>
  );
}
