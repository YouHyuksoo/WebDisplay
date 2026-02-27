/**
 * @file src/components/menu/MenuWidgets.tsx
 * @description 위젯 영역 - 시계, 시스템 정보, 날씨, 검색, 이스터에그 버튼
 *
 * 초보자 가이드:
 * 1. **주요 개념**: mydesktop의 위젯 HTML 구조를 JSX로 변환
 * 2. **사용 방법**: MenuScene에서 import하여 렌더링
 * 3. **중요**: 모든 ID와 클래스명을 원본과 동일하게 유지
 */

/**
 * 검색창 + 시계 + 이스터에그 + 시스템 위젯 + 날씨 위젯
 */
export default function MenuWidgets() {
  return (
    <>
      {/* 검색창 */}
      <div id="search-container">
        <div className="search-box">
          <svg className="search-icon" viewBox="0 0 24 24" fill="currentColor">
            <path d="M15.5 14h-.79l-.28-.27C15.41 12.59 16 11.11 16 9.5 16 5.91 13.09 3 9.5 3S3 5.91 3 9.5 5.91 16 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z" />
          </svg>
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

      {/* 시계 위젯 */}
      <div id="clock-widget">
        <div className="time" id="clock-time">00:00</div>
        <div className="date" id="clock-date">Loading...</div>
      </div>

      {/* 이스터에그 테스트 버튼 */}
      <div id="easter-egg-container">
        <div id="easter-egg-indicator" title="이스터에그">&#10024;</div>
        <div id="easter-egg-buttons">
          <button className="easter-btn" id="dragon-test-btn" title="드래곤 소환">
            &#128009;
          </button>
          <button className="easter-btn" id="wolf-test-btn" title="늑대 소환">
            &#128058;
          </button>
          <button className="easter-btn" id="meteor-test-btn" title="유성 충돌">
            &#9732;&#65039;
          </button>
        </div>
      </div>

      {/* 시스템 정보 위젯 */}
      <div id="system-widget">
        <div className="system-row" id="battery-row">
          <span className="system-icon">&#128267;</span>
          <span className="system-label">Battery</span>
          <div className="system-bar">
            <div className="system-bar-fill" id="battery-bar" />
          </div>
          <span className="system-value" id="battery-value">--%</span>
        </div>
        <div className="system-row">
          <span className="system-icon">&#9889;</span>
          <span className="system-label">Cores</span>
          <span className="system-value" id="cores-value">--</span>
        </div>
        <div className="system-row" id="network-row">
          <span className="system-icon">&#128246;</span>
          <span className="system-label">Network</span>
          <span className="system-value" id="network-value">--</span>
        </div>
        <div className="system-row" id="memory-row">
          <span className="system-icon">&#128202;</span>
          <span className="system-label">JS Heap</span>
          <div className="system-bar">
            <div className="system-bar-fill" id="memory-bar" />
          </div>
          <span className="system-value" id="memory-value">--MB</span>
        </div>
      </div>

      {/* 날씨 위젯 */}
      <div id="weather-widget" title="클릭해서 도시 변경">
        <div className="weather-main">
          <span className="weather-icon" id="weather-icon">&#127780;&#65039;</span>
          <span className="weather-temp" id="weather-temp">--&deg;</span>
        </div>
        <div className="weather-info">
          <span className="weather-desc" id="weather-desc">날씨 로딩...</span>
          <span className="weather-location" id="weather-location">--</span>
        </div>
        <div className="weather-edit-hint">&#128205; 클릭해서 변경</div>
      </div>
    </>
  );
}
