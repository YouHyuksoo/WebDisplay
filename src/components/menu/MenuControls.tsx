/**
 * @file src/components/menu/MenuControls.tsx
 * @description 사이드바 컨트롤 (컬러 바, 레이아웃/공간/아이콘 토글) + 하단 버튼 + 설정 메뉴
 *
 * 초보자 가이드:
 * 1. **주요 개념**: mydesktop의 좌측 사이드바/설정 메뉴 HTML을 JSX로 변환
 * 2. **사용 방법**: MenuScene에서 import하여 렌더링
 * 3. **중요**: data-theme, data-shape, data-style 등 data 속성 유지 필수
 */

import {
  LayoutGrid,
  PanelsTopLeft,
  List as ListIcon,
  Orbit,
  Sparkles,
  Wind,
  Palette,
  Paintbrush,
  Settings,
  Plus,
  Boxes,
  AppWindow,
  Sun,
  ListTree,
  Import,
  Link2,
  Download,
  Upload,
} from "lucide-react";

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
              <button
                className="color-bar-btn gold active"
                data-theme="gold"
                title="Gold"
              />
              <button
                className="color-bar-btn purple"
                data-theme="purple"
                title="Purple"
              />
              <button
                className="color-bar-btn cyan"
                data-theme="cyan"
                title="Cyan"
              />
              <button
                className="color-bar-btn pink"
                data-theme="pink"
                title="Pink"
              />
              <button
                className="color-bar-btn green"
                data-theme="green"
                title="Green"
              />
              <button
                className="color-bar-btn red"
                data-theme="red"
                title="Red"
              />
              <button
                className="color-bar-btn blue"
                data-theme="blue"
                title="Blue"
              />
              <button
                className="color-bar-btn white"
                data-theme="white"
                title="White"
              />
            </div>
          </div>

          {/* 사이드바 토글 버튼들 */}
          <div id="sidebar-toggles">
            {/* 레이아웃 전환 (그리드/캐러셀) */}
            <button id="layout-toggle-btn" title="그리드/캐러셀 전환">
              <LayoutGrid id="layout-icon-grid" size={24} />
              <PanelsTopLeft
                id="layout-icon-carousel"
                size={24}
                style={{ display: "none" }}
              />
              <ListIcon
                id="layout-icon-thumbnail"
                size={24}
                style={{ display: "none" }}
              />
            </button>

            {/* 공간 전환 (터널/워프/오로라) */}
            <button id="space-toggle-btn" title="공간 전환">
              <Orbit id="space-icon-tunnel" size={24} />
              <Sparkles
                id="space-icon-warp"
                size={24}
                style={{ display: "none" }}
              />
              <Wind
                id="space-icon-aurora"
                size={24}
                style={{ display: "none" }}
              />
            </button>

            {/* 아이콘 색상 전환 */}
            <button id="icon-color-toggle-btn" title="아이콘 색상 전환">
              <Palette id="icon-color-brand" size={24} />
              <Paintbrush
                id="icon-color-white"
                size={24}
                style={{ display: "none" }}
              />
            </button>
          </div>
        </div>
      </div>

      {/* 하단 버튼 (설정/추가) */}
      <div className="bottom-buttons">
        <button className="floating-btn" id="settings-btn" title="설정">
          <Settings size={22} />
        </button>
        <button className="floating-btn" id="add-btn" title="추가">
          <Plus size={22} />
        </button>
      </div>

      {/* 설정 메뉴 */}
      <div id="settings-menu">
        <div
          className="settings-item settings-submenu-trigger"
          id="menu-tunnel"
        >
          <span className="icon">
            <Boxes size={16} />
          </span>
          <span>터널 모양</span>
          <span className="submenu-arrow">&rsaquo;</span>
        </div>
        <div
          className="settings-item settings-submenu-trigger"
          id="menu-card-style"
        >
          <span className="icon">
            <AppWindow size={16} />
          </span>
          <span>카드 스타일</span>
          <span className="submenu-arrow">&rsaquo;</span>
        </div>
        <div className="settings-item" id="menu-brightness">
          <span className="icon">
            <Sun size={16} />
          </span>
          <span>배경 밝기</span>
          <div className="brightness-controls">
            <button
              className="brightness-btn"
              id="brightness-down"
              title="어둡게"
            >
              -
            </button>
            <span id="brightness-value">100%</span>
            <button className="brightness-btn" id="brightness-up" title="밝게">
              +
            </button>
          </div>
        </div>
        <div className="settings-item" id="menu-categories">
          <span className="icon">
            <ListTree size={16} />
          </span>
          <span>카테고리 관리</span>
        </div>
        <div className="settings-item" id="menu-import">
          <span className="icon">
            <Import size={16} />
          </span>
          <span>북마크 가져오기</span>
        </div>
        <div className="settings-item" id="menu-protocol">
          <span className="icon">
            <Link2 size={16} />
          </span>
          <span>빠른 추가 설정</span>
        </div>
        <div className="settings-divider" />
        <div className="settings-item" id="menu-export">
          <span className="icon">
            <Download size={16} />
          </span>
          <span>데이터 내보내기</span>
        </div>
        <div className="settings-item" id="menu-restore">
          <span className="icon">
            <Upload size={16} />
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
