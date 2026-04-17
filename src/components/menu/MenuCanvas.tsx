/**
 * @file src/components/menu/MenuCanvas.tsx
 * @description Three.js 캔버스, 3D 카드 공간, 글로우 오브, 깊이 인디케이터 등 배경 레이어
 *
 * 초보자 가이드:
 * 1. **주요 개념**: mydesktop의 3D 배경 영역을 JSX로 변환한 컴포넌트
 * 2. **사용 방법**: MenuScene에서 import하여 렌더링
 * 3. **중요**: 모든 ID는 원본 index.html과 동일해야 함 (JS 모듈이 getElementById 사용)
 */

/**
 * 로딩 화면 + Three.js 캔버스 + 글로우 오브 + 3D 카드 공간 + 깊이 인디케이터
 */
export default function MenuCanvas() {
  return (
    <>
      {/* 로딩 화면 */}
      <div id="loading-screen">
        <div className="loading-ring" />
      </div>

      {/* 몽환적인 조명 (글로우 오브 4개) */}
      <div id="ambient-glow">
        <div className="glow-orb orb-1" />
        <div className="glow-orb orb-2" />
        <div className="glow-orb orb-3" />
        <div className="glow-orb orb-4" />
      </div>

      {/* Three.js 캔버스 컨테이너 */}
      <div id="canvas-container" />

      {/* 3D 카드 공간 (섹션별 카드가 여기에 동적으로 생성됨) */}
      <div id="cards-3d-space" />

      {/* 그리드 스크롤 버튼 */}
      <div id="grid-scroll-controls">
        <button className="grid-scroll-btn" id="grid-scroll-up" title="위로 스크롤">
          <svg viewBox="0 0 24 24" fill="currentColor">
            <path d="M7.41 15.41L12 10.83l4.59 4.58L18 14l-6-6-6 6z" />
          </svg>
        </button>
        <button className="grid-scroll-btn" id="grid-scroll-down" title="아래로 스크롤">
          <svg viewBox="0 0 24 24" fill="currentColor">
            <path d="M7.41 8.59L12 13.17l4.59-4.58L18 10l-6 6-6-6z" />
          </svg>
        </button>
      </div>

      {/* 캐러셀 인디케이터 (점) */}
      <div className="carousel-dots" id="carousel-dots" />

      {/* 섹션 정보 (현재 카테고리 이름/설명) */}
      <div id="section-info">
        <div id="section-title">FAVORITES</div>
        <div id="section-subtitle">Your most used sites</div>
      </div>

      {/* 좁은 화면에서 나타나는 핸들 (호버 시 depth-indicator 슬라이드 인) */}
      <div id="depth-handle" aria-hidden="true" />

      {/* 깊이 인디케이터 (섹션 도트) */}
      <div id="depth-indicator" />

      {/* 스크롤 힌트 */}
      <div id="scroll-hint">
        <div className="mouse" />
        <span>SCROLL TO TRAVEL</span>
      </div>
    </>
  );
}
