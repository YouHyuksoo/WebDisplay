/**
 * @file src/components/menu/MenuControls.tsx
 * @description 사이드바 컨트롤 (컬러 바, 레이아웃/공간/아이콘 토글) + 하단 버튼 + 설정 메뉴
 *
 * 초보자 가이드:
 * 1. **주요 개념**: mydesktop의 좌측 사이드바/설정 메뉴 HTML을 JSX로 변환
 * 2. **사용 방법**: MenuScene에서 import하여 렌더링
 * 3. **중요**: data-theme, data-shape, data-style 등 data 속성 유지 필수
 */

'use client';

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
  CircleHelp,
  Bell,
  Database,
} from "lucide-react";
import Link from 'next/link';
import { useTranslations } from 'next-intl';

/**
 * 좌측 사이드바 + 하단 버튼 + 설정 메뉴 + 서브메뉴
 */
export default function MenuControls() {
  const t = useTranslations('menuUI');

  return (
    <>
      {/* 왼쪽 사이드바 (모바일 인디케이터로 토글) */}
      <div id="left-sidebar-container">
        <div id="left-sidebar-indicator" data-tooltip={t('sidebarOpen')}>
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
                data-tooltip={t('glowGold')}
              />
              <button
                className="color-bar-btn purple"
                data-theme="purple"
                data-tooltip={t('glowPurple')}
              />
              <button
                className="color-bar-btn cyan"
                data-theme="cyan"
                data-tooltip={t('glowCyan')}
              />
              <button
                className="color-bar-btn pink"
                data-theme="pink"
                data-tooltip={t('glowPink')}
              />
              <button
                className="color-bar-btn green"
                data-theme="green"
                data-tooltip={t('glowGreen')}
              />
              <button
                className="color-bar-btn red"
                data-theme="red"
                data-tooltip={t('glowRed')}
              />
              <button
                className="color-bar-btn blue"
                data-theme="blue"
                data-tooltip={t('glowBlue')}
              />
              <button
                className="color-bar-btn white"
                data-theme="white"
                data-tooltip={t('glowWhite')}
              />
            </div>
          </div>

          {/* 사이드바 토글 버튼들 */}
          <div id="sidebar-toggles">
            {/* 레이아웃 전환 (그리드/캐러셀/썸네일) */}
            <button id="layout-toggle-btn" data-tooltip={t('layoutStyleToggle')}>
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
            <button id="space-toggle-btn" data-tooltip={t('spaceEffectToggle')}>
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
            <button id="icon-color-toggle-btn" data-tooltip={t('iconColorToggle')}>
              <Palette id="icon-color-brand" size={24} />
              <Paintbrush
                id="icon-color-white"
                size={24}
                style={{ display: "none" }}
              />
            </button>
            {/* 가상화 토글 (성능 최적화) */}
            <button id="virtualization-toggle-btn" data-tooltip={t('virtualToggle')}>
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

      {/* 하단 버튼 (설정/도움말/추가) */}
      <div className="bottom-buttons">
        <button className="floating-btn" id="settings-btn" data-tooltip={t('systemSettings')}>
          <Settings size={22} />
        </button>
        <Link className="floating-btn" href="/ai-chat" aria-label={t('aiChat')} data-tooltip={t('aiChat')}>
          <Sparkles className="size-5" />
        </Link>
        <a className="floating-btn" href="/help" data-tooltip={t('help')}>
          <CircleHelp size={22} />
        </a>
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
          <span>{t('tunnelShape')}</span>
          <span className="submenu-arrow">&rsaquo;</span>
        </div>
        <div
          className="settings-item settings-submenu-trigger"
          id="menu-card-style"
        >
          <span className="icon">
            <AppWindow size={16} />
          </span>
          <span>{t('cardStyle')}</span>
          <span className="submenu-arrow">&rsaquo;</span>
        </div>
        <div className="settings-item" id="menu-enable-3d">
          <span className="icon">
            <Orbit size={16} />
          </span>
          <span id="enable-3d-label">{t('bg3dOn')}</span>
        </div>
        <div className="settings-item" id="menu-auto-rolling">
          <span className="icon">
            <RotateCw size={16} />
          </span>
          <span id="auto-rolling-label">{t('autoRollingOff')}</span>
        </div>
        <div className="settings-item" id="menu-brightness">
          <span className="icon">
            <Sun size={16} />
          </span>
          <span>{t('bgBrightness')}</span>
          <div className="brightness-controls">
            <button
              className="brightness-btn"
              id="brightness-down"
              data-tooltip={t('brightnessDown')}
            >
              -
            </button>
            <span id="brightness-value">100%</span>
            <button className="brightness-btn" id="brightness-up" data-tooltip={t('brightnessUp')}>
              +
            </button>
          </div>
        </div>
        <div className="settings-item" id="menu-virtualization">
          <span className="icon">
            <Zap size={16} />
          </span>
          <span id="virtualization-label">{t('virtualizationOn')}</span>
        </div>
        <div className="settings-item" id="menu-display-options">
          <span className="icon">
            <Settings size={16} />
          </span>
          <span>{t('displayOptions')}</span>
        </div>
        <div className="settings-item" id="menu-categories">
          <span className="icon">
            <ListTree size={16} />
          </span>
          <span>{t('categoryManage')}</span>
        </div>
        <div
          className="settings-item"
          id="menu-card-manager"
          onClick={() => window.location.href = '/settings/cards'}
          style={{ cursor: 'pointer' }}
        >
          <span className="icon">
            <AppWindow size={16} />
          </span>
          <span>카드 관리</span>
        </div>
        <div
          className="settings-item"
          id="menu-ai-tables"
          onClick={() => window.location.href = '/settings/ai-tables'}
          style={{ cursor: 'pointer' }}
        >
          <span className="icon">
            <Database size={16} />
          </span>
          <span>AI 테이블 학습</span>
        </div>
        <div
          className="settings-item"
          id="menu-notification-settings"
          onClick={() => window.location.href = '/u1/slack-settings'}
          style={{ cursor: 'pointer' }}
        >
          <span className="icon">
            <Bell size={16} />
          </span>
          <span>{t('notificationSettings')}</span>
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
