/**
 * @file src/components/menu/MenuWidgets.tsx
 * @description 위젯 영역 - 검색, 시계, 이스터에그 패널, 기능 아이콘(다국어/테마/종료)
 *
 * 초보자 가이드:
 * 1. **주요 개념**: mydesktop의 위젯 HTML 구조를 JSX로 변환
 * 2. **사용 방법**: MenuScene에서 import하여 렌더링
 * 3. **중요**: 이스터에그는 ✨ 클릭 시 패널 토글, 각 아이콘 클릭 시 1회 실행
 */

import { Search, History, ArrowLeft, Globe, Moon, Power } from 'lucide-react';

/**
 * 검색창 + 시계 + 이스터에그 패널 + 기능 아이콘(다국어/테마/종료)
 */
export default function MenuWidgets() {
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
              placeholder="바로가기 검색..."
              autoComplete="off"
            />
            <kbd className="search-shortcut">/</kbd>
          </div>
          <div className="search-results" id="search-results" />
        </div>
        <button id="recent-btn" data-tooltip="최근 사용">
          <History size={20} />
        </button>
        <button id="back-btn" data-tooltip="돌아가기">
          <ArrowLeft size={20} />
        </button>
      </div>

      {/* 시계 위젯 */}
      <div id="clock-widget">
        <div className="time" id="clock-time">00:00:00</div>
        <div className="date" id="clock-date">0000-00-00</div>
      </div>

      {/* 이스터에그 패널 (✨ 클릭 시 토글) */}
      <div id="easter-egg-container">
        <div id="easter-egg-indicator" data-tooltip="이스터에그">&#10024;</div>
        <div id="easter-egg-panel">
          <button className="easter-btn" id="dragon-test-btn" data-tooltip="드래곤 소환">&#128009;</button>
          <button className="easter-btn" id="wolf-test-btn" data-tooltip="늑대 소환">&#128058;</button>
          <button className="easter-btn" id="meteor-test-btn" data-tooltip="유성 샤워">&#9732;&#65039;</button>
          <button className="easter-btn" id="meteor-impact-btn" data-tooltip="유성 충돌">&#128165;</button>
          <button className="easter-btn" id="crow-test-btn" data-tooltip="까마귀 도둑">&#128038;</button>
          <button className="easter-btn" id="cat-test-btn" data-tooltip="고양이 발자국">&#128049;</button>
          <button className="easter-btn" id="ufo-test-btn" data-tooltip="UFO 외계인">&#128760;</button>
          <button className="easter-btn" id="star-test-btn" data-tooltip="별 날아오기">&#11088;</button>
          <button className="easter-btn toggle-btn" id="click-fx-btn" data-tooltip="클릭 리플 ON/OFF">&#128070;</button>
          <button className="easter-btn toggle-btn" id="card-sleep-btn" data-tooltip="카드 수면 ON/OFF">&#128564;</button>
        </div>
      </div>

      {/* 우측 상단 기능 아이콘 */}
      <div id="util-icons">
        <div id="locale-wrapper">
          <button className="util-btn" id="locale-btn" data-tooltip="다국어 전환">
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
          </div>
        </div>
        <button className="util-btn" id="theme-btn" data-tooltip="테마 전환">
          <Moon size={20} />
        </button>
        <button className="util-btn" id="exit-btn" data-tooltip="종료">
          <Power size={20} />
        </button>
      </div>

      {/* 종료 확인 모달 */}
      <div className="modal-overlay" id="exit-modal">
        <div className="modal dialog-modal">
          <h2 className="modal-title">시스템 종료</h2>
          <p className="dialog-message">프로그램을 종료하시겠습니까?</p>
          <div className="modal-actions">
            <button className="modal-btn secondary" id="exit-cancel">취소</button>
            <button className="modal-btn primary" id="exit-confirm">종료</button>
          </div>
        </div>
      </div>
    </>
  );
}
