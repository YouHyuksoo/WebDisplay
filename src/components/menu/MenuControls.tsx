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
  Zap,
  ZapOff,
  RotateCw,
} from "lucide-react";

/**
 * 좌측 사이드바 + 하단 버튼 + 설정 메뉴 + 서브메뉴
 */
export default function MenuControls() {
  return (
    <>
      {/* 왼쪽 사이드바 (모바일 인디케이터로 토글) */}
      <div id="left-sidebar-container">
        <div id="left-sidebar-indicator" data-tooltip="사이드바 메뉴 열기">
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
                data-tooltip="골드 글로우"
              />
              <button
                className="color-bar-btn purple"
                data-theme="purple"
                data-tooltip="퍼플 글로우"
              />
              <button
                className="color-bar-btn cyan"
                data-theme="cyan"
                data-tooltip="시안 글로우"
              />
              <button
                className="color-bar-btn pink"
                data-theme="pink"
                data-tooltip="핑크 글로우"
              />
              <button
                className="color-bar-btn green"
                data-theme="green"
                data-tooltip="그린 글로우"
              />
              <button
                className="color-bar-btn red"
                data-theme="red"
                data-tooltip="레드 글로우"
              />
              <button
                className="color-bar-btn blue"
                data-theme="blue"
                data-tooltip="블루 글로우"
              />
              <button
                className="color-bar-btn white"
                data-theme="white"
                data-tooltip="화이트 글로우"
              />
            </div>
          </div>

          {/* 사이드바 토글 버튼들 */}
          <div id="sidebar-toggles">
            {/* 레이아웃 전환 (그리드/캐러셀/썸네일) */}
            <button id="layout-toggle-btn" data-tooltip="레이아웃 스타일 전환">
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
            <button id="space-toggle-btn" data-tooltip="배경 공간 효과 전환">
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
            <button id="icon-color-toggle-btn" data-tooltip="카드 아이콘 색상 모드 전환">
              <Palette id="icon-color-brand" size={24} />
              <Paintbrush
                id="icon-color-white"
                size={24}
                style={{ display: "none" }}
              />
            </button>
            {/* 가상화 토글 (성능 최적화) */}
            <button id="virtualization-toggle-btn" data-tooltip="성능 최적화(가상화) 토글">
              <Zap id="virtualization-icon-on" size={24} />
              <ZapOff
                id="virtualization-icon-off"
                size={24}
                style={{ display: "none" }}
              />
            </button>
          </div>
        </div>
      </div>

      {/* 하단 버튼 (설정/추가) */}
      <div className="bottom-buttons">
        <button className="floating-btn" id="settings-btn" data-tooltip="시스템 설정">
          <Settings size={22} />
        </button>
        <button className="floating-btn" id="add-btn" data-tooltip="바로가기 추가">
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
        <div className="settings-item" id="menu-enable-3d">
          <span className="icon">
            <Orbit size={16} />
          </span>
          <span id="enable-3d-label">3D 배경: 켜짐</span>
        </div>
        <div className="settings-item" id="menu-auto-rolling">
          <span className="icon">
            <RotateCw size={16} />
          </span>
          <span id="auto-rolling-label">자동 롤링: 꺼짐</span>
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
              data-tooltip="밝기 감소"
            >
              -
            </button>
            <span id="brightness-value">100%</span>
            <button className="brightness-btn" id="brightness-up" data-tooltip="밝기 증가">
              +
            </button>
          </div>
        </div>
        <div className="settings-item" id="menu-virtualization">
          <span className="icon">
            <Zap size={16} />
          </span>
          <span id="virtualization-label">성능: 고성능 (가상화)</span>
        </div>
        <div className="settings-item" id="menu-display-options">
          <span className="icon">
            <Settings size={16} />
          </span>
          <span>시스템 옵션 설정</span>
        </div>
        <div className="settings-item" id="menu-categories">
          <span className="icon">
            <ListTree size={16} />
          </span>
          <span>카테고리 관리</span>
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
