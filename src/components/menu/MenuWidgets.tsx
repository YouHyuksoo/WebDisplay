/**
 * @file src/components/menu/MenuWidgets.tsx
 * @description 위젯 영역 - 검색, 시계, 이스터에그 패널, 기능 아이콘(다국어/테마/종료)
 *
 * 초보자 가이드:
 * 1. **주요 개념**: mydesktop의 위젯 HTML 구조를 JSX로 변환
 * 2. **사용 방법**: MenuScene에서 import하여 렌더링
 * 3. **중요**: 이스터에그는 ✨ 클릭 시 패널 토글, 각 아이콘 클릭 시 1회 실행
 */

'use client';

import { Search, History, ArrowLeft, Globe, Moon, Power, Image, ImageOff, RotateCw, CircleStop, Pencil, PencilOff } from 'lucide-react';
import { useTranslations } from 'next-intl';
import DbStatusBadge from './DbStatusBadge';

/**
 * 검색창 + 시계 + 이스터에그 패널 + 기능 아이콘(다국어/테마/종료)
 */
export default function MenuWidgets() {
  const t = useTranslations('menuUI');

  return (
    <>
      {/* 검색창 */}
      <div id="search-area">
        <div id="search-container">
          <div className="search-box">
            <Search className="search-icon" size={20} />
            <input
              type="text"
              id="search-input"
              placeholder={t('searchPlaceholder')}
              autoComplete="off"
            />
            <kbd className="search-shortcut">/</kbd>
          </div>
          <div className="search-results" id="search-results" />
        </div>
        <button id="recent-btn" data-tooltip={t('recentTitle')}>
          <History size={20} />
        </button>
        <button id="back-btn" data-tooltip={t('goBack')}>
          <ArrowLeft size={20} />
        </button>
      </div>

      {/* 시계 위젯 + DB 상태 */}
      <div id="clock-widget">
        <div className="time" id="clock-time">00:00:00</div>
        <div className="date" id="clock-date">0000-00-00</div>
        <DbStatusBadge />
      </div>

      {/* 이스터에그 패널 (✨ 클릭 시 토글) */}
      <div id="easter-egg-container">
        <div id="easter-egg-indicator" data-tooltip={t('easterEgg')}>&#10024;</div>
        <div id="easter-egg-panel">
          <button className="easter-btn" id="dragon-test-btn" data-tooltip={t('dragonSummon')}>&#128009;</button>
          <button className="easter-btn" id="wolf-test-btn" data-tooltip={t('wolfSummon')}>&#128058;</button>
          <button className="easter-btn" id="meteor-test-btn" data-tooltip={t('meteorShower')}>&#9732;&#65039;</button>
          <button className="easter-btn" id="meteor-impact-btn" data-tooltip={t('meteorImpact')}>&#128165;</button>
          <button className="easter-btn" id="crow-test-btn" data-tooltip={t('crowAttack')}>&#128038;</button>
          <button className="easter-btn" id="cat-test-btn" data-tooltip={t('catPaw')}>&#128049;</button>
          <button className="easter-btn" id="ufo-test-btn" data-tooltip={t('ufoAppear')}>&#128760;</button>
          <button className="easter-btn" id="star-test-btn" data-tooltip={t('starFly')}>&#11088;</button>
          <button className="easter-btn toggle-btn" id="click-fx-btn" data-tooltip={t('clickRipple')}>&#128070;</button>
          <button className="easter-btn toggle-btn" id="card-sleep-btn" data-tooltip={t('cardSleep')}>&#128564;</button>
        </div>
      </div>

      {/* 우측 상단 기능 아이콘 */}
      <div id="util-icons">
        <button className="util-btn" id="auto-rolling-toggle-btn" data-tooltip={t('autoRollingToggle')}>
          <RotateCw id="rolling-icon-on" size={20} style={{ display: 'none' }} />
          <CircleStop id="rolling-icon-off" size={20} />
        </button>
        <button className="util-btn" id="edit-mode-toggle-btn" data-tooltip={t('editModeToggle')}>
          <Pencil id="edit-mode-icon-on" size={20} style={{ display: 'none' }} />
          <PencilOff id="edit-mode-icon-off" size={20} />
        </button>
        <button className="util-btn" id="bg-toggle-btn" data-tooltip={t('bgToggle')}>
          <Image id="bg-icon-on" size={20} />
          <ImageOff id="bg-icon-off" size={20} style={{ display: 'none' }} />
        </button>
        <div id="locale-wrapper">
          <button className="util-btn" id="locale-btn" data-tooltip={t('localeSwitch')}>
            <Globe size={20} />
          </button>
          <div id="locale-dropdown">
            <button className="locale-option" data-locale="ko">
              <span className="locale-flag">&#127472;&#127479;</span>
              <span>한국어</span>
            </button>
            <button className="locale-option" data-locale="en">
              <span className="locale-flag">&#127482;&#127480;</span>
              <span>English</span>
            </button>
            <button className="locale-option" data-locale="es">
              <span className="locale-flag">&#127466;&#127480;</span>
              <span>Español</span>
            </button>
            <button className="locale-option" data-locale="vi">
              <span className="locale-flag">&#127483;&#127475;</span>
              <span>Tiếng Việt</span>
            </button>
          </div>
        </div>
        <button className="util-btn" id="theme-btn" data-tooltip={t('themeToggle')}>
          <Moon size={20} />
        </button>
        <button className="util-btn" id="exit-btn" data-tooltip={t('exitBtn')}>
          <Power size={20} />
        </button>
      </div>

      {/* 종료 확인 모달 */}
      <div className="modal-overlay" id="exit-modal">
        <div className="modal dialog-modal">
          <h2 className="modal-title">{t('exitSystem')}</h2>
          <p className="dialog-message">{t('exitConfirmMsg')}</p>
          <div className="modal-actions">
            <button className="modal-btn secondary" id="exit-cancel">{t('cancel')}</button>
            <button className="modal-btn primary" id="exit-confirm">{t('exitBtn')}</button>
          </div>
        </div>
      </div>
    </>
  );
}
