/**
 * @file src/components/menu/MenuControls.tsx
 * @description 사이드바 컨트롤 (컬러 바, 레이아웃/공간/아이콘 토글) + 하단 버튼 + 설정 메뉴
 *
 * 초보자 가이드:
 * 1. **주요 개념**: mydesktop의 좌측 사이드바/설정 메뉴 HTML을 JSX로 변환
 * 2. **사용 방법**: MenuScene에서 import하여 렌더링
 * 3. **중요**: data-theme, data-shape, data-style 등 data 속성 유지 필수
 */

/**
 * 좌측 사이드바 + 하단 버튼 + 설정 메뉴 + 서브메뉴
 */
export default function MenuControls() {
  return (
    <>
      {/* 왼쪽 사이드바 (모바일 인디케이터로 토글) */}
      <div id="left-sidebar-container">
        <div id="left-sidebar-indicator" title="메뉴 열기">
          <span />
          <span />
          <span />
        </div>
        <div id="left-sidebar-menus">
          {/* 컬러 바 */}
          <div id="color-bar">
            <span id="color-bar-label">Glow</span>
            <div className="color-bar-options">
              <button className="color-bar-btn gold active" data-theme="gold" title="Gold" />
              <button className="color-bar-btn purple" data-theme="purple" title="Purple" />
              <button className="color-bar-btn cyan" data-theme="cyan" title="Cyan" />
              <button className="color-bar-btn pink" data-theme="pink" title="Pink" />
              <button className="color-bar-btn green" data-theme="green" title="Green" />
              <button className="color-bar-btn red" data-theme="red" title="Red" />
              <button className="color-bar-btn blue" data-theme="blue" title="Blue" />
              <button className="color-bar-btn white" data-theme="white" title="White" />
            </div>
          </div>

          {/* 사이드바 토글 버튼들 */}
          <div id="sidebar-toggles">
            {/* 레이아웃 전환 (그리드/캐러셀) */}
            <button id="layout-toggle-btn" title="그리드/캐러셀 전환">
              <svg id="layout-icon-grid" viewBox="0 0 24 24" fill="currentColor">
                <path d="M4 8h4V4H4v4zm6 12h4v-4h-4v4zm-6 0h4v-4H4v4zm0-6h4v-4H4v4zm6 0h4v-4h-4v4zm6-10v4h4V4h-4zm-6 4h4V4h-4v4zm6 6h4v-4h-4v4zm0 6h4v-4h-4v4z" />
              </svg>
              <svg id="layout-icon-carousel" viewBox="0 0 24 24" fill="currentColor" style={{ display: 'none' }}>
                <path d="M7 19h10V4H7v15zm-5-2h4V6H2v11zM18 6v11h4V6h-4z" />
              </svg>
            </button>

            {/* 공간 전환 (터널/워프/오로라) */}
            <button id="space-toggle-btn" title="공간 전환">
              <svg id="space-icon-tunnel" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 2L2 19h20L12 2zm0 4l6.5 11h-13L12 6z" />
              </svg>
              <svg id="space-icon-warp" viewBox="0 0 24 24" fill="currentColor" style={{ display: 'none' }}>
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z" />
              </svg>
              <svg id="space-icon-aurora" viewBox="0 0 24 24" fill="currentColor" style={{ display: 'none' }}>
                <path d="M12 3c-1.1 0-2 .9-2 2v2c0 1.1.9 2 2 2s2-.9 2-2V5c0-1.1-.9-2-2-2zm-6.5 4c-.83 0-1.5.67-1.5 1.5S4.67 10 5.5 10 7 9.33 7 8.5 6.33 7 5.5 7zm13 0c-.83 0-1.5.67-1.5 1.5s.67 1.5 1.5 1.5 1.5-.67 1.5-1.5S19.33 7 18.5 7zM6 12c-1.1 0-2 .9-2 2v3c0 1.1.9 2 2 2s2-.9 2-2v-3c0-1.1-.9-2-2-2zm12 0c-1.1 0-2 .9-2 2v3c0 1.1.9 2 2 2s2-.9 2-2v-3c0-1.1-.9-2-2-2zm-6 2c-1.1 0-2 .9-2 2v2c0 1.1.9 2 2 2s2-.9 2-2v-2c0-1.1-.9-2-2-2z" />
              </svg>
            </button>

            {/* 아이콘 색상 전환 */}
            <button id="icon-color-toggle-btn" title="아이콘 색상 전환">
              <svg id="icon-color-brand" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 3c-4.97 0-9 4.03-9 9s4.03 9 9 9c.83 0 1.5-.67 1.5-1.5 0-.39-.15-.74-.39-1.01-.23-.26-.38-.61-.38-.99 0-.83.67-1.5 1.5-1.5H16c2.76 0 5-2.24 5-5 0-4.42-4.03-8-9-8zm-5.5 9c-.83 0-1.5-.67-1.5-1.5S5.67 9 6.5 9 8 9.67 8 10.5 7.33 12 6.5 12zm3-4C8.67 8 8 7.33 8 6.5S8.67 5 9.5 5s1.5.67 1.5 1.5S10.33 8 9.5 8zm5 0c-.83 0-1.5-.67-1.5-1.5S13.67 5 14.5 5s1.5.67 1.5 1.5S15.33 8 14.5 8zm3 4c-.83 0-1.5-.67-1.5-1.5S16.67 9 17.5 9s1.5.67 1.5 1.5-.67 1.5-1.5 1.5z" />
              </svg>
              <svg id="icon-color-white" viewBox="0 0 24 24" fill="currentColor" style={{ display: 'none' }}>
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2z" />
              </svg>
            </button>
          </div>
        </div>
      </div>

      {/* 하단 버튼 (설정/추가) */}
      <div className="bottom-buttons">
        <button className="floating-btn" id="settings-btn">&#9881;&#65039;</button>
        <button className="floating-btn" id="add-btn">+</button>
      </div>

      {/* 설정 메뉴 */}
      <div id="settings-menu">
        <div className="settings-item settings-submenu-trigger" id="menu-tunnel">
          <span className="icon">
            <svg viewBox="0 0 24 24" fill="currentColor" width="16" height="16">
              <path d="M12 2L2 19h20L12 2zm0 4l6.5 11h-13L12 6z" />
            </svg>
          </span>
          <span>터널 모양</span>
          <span className="submenu-arrow">&rsaquo;</span>
        </div>
        <div className="settings-item settings-submenu-trigger" id="menu-card-style">
          <span className="icon">
            <svg viewBox="0 0 24 24" fill="currentColor" width="16" height="16">
              <path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16H5V5h14v14z" />
            </svg>
          </span>
          <span>카드 스타일</span>
          <span className="submenu-arrow">&rsaquo;</span>
        </div>
        <div className="settings-item" id="menu-categories">
          <span className="icon">
            <svg viewBox="0 0 24 24" fill="currentColor" width="16" height="16">
              <path d="M3 13h2v-2H3v2zm0 4h2v-2H3v2zm0-8h2V7H3v2zm4 4h14v-2H7v2zm0 4h14v-2H7v2zM7 7v2h14V7H7z" />
            </svg>
          </span>
          <span>카테고리 관리</span>
        </div>
        <div className="settings-item" id="menu-import">
          <span className="icon">
            <svg viewBox="0 0 24 24" fill="currentColor" width="16" height="16">
              <path d="M19 9h-4V3H9v6H5l7 7 7-7zM5 18v2h14v-2H5z" />
            </svg>
          </span>
          <span>북마크 가져오기</span>
        </div>
        <div className="settings-item" id="menu-protocol">
          <span className="icon">
            <svg viewBox="0 0 24 24" fill="currentColor" width="16" height="16">
              <path d="M3.9 12c0-1.71 1.39-3.1 3.1-3.1h4V7H7c-2.76 0-5 2.24-5 5s2.24 5 5 5h4v-1.9H7c-1.71 0-3.1-1.39-3.1-3.1zM8 13h8v-2H8v2zm9-6h-4v1.9h4c1.71 0 3.1 1.39 3.1 3.1s-1.39 3.1-3.1 3.1h-4V17h4c2.76 0 5-2.24 5-5s-2.24-5-5-5z" />
            </svg>
          </span>
          <span>빠른 추가 설정</span>
        </div>
        <div className="settings-divider" />
        <div className="settings-item" id="menu-export">
          <span className="icon">
            <svg viewBox="0 0 24 24" fill="currentColor" width="16" height="16">
              <path d="M19 9h-4V3H9v6H5l7 7 7-7zM5 18v2h14v-2H5z" />
            </svg>
          </span>
          <span>데이터 내보내기</span>
        </div>
        <div className="settings-item" id="menu-restore">
          <span className="icon">
            <svg viewBox="0 0 24 24" fill="currentColor" width="16" height="16">
              <path d="M9 16h6v-6h4l-7-7-7 7h4v6zm-4 2h14v2H5v-2z" />
            </svg>
          </span>
          <span>데이터 가져오기</span>
        </div>
        <div className="settings-divider" />
        <div className="settings-credits">
          <div className="credits-name">DogBirds</div>
          <div className="credits-tagline">Where imagination takes flight</div>
        </div>
      </div>

    </>
  );
}
