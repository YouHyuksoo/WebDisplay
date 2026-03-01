/**
 * @file src/lib/menu/widgets.ts
 * @description 위젯 관련 함수들 - 시계, 시스템 정보, 배터리, 날씨 등
 *
 * 초보자 가이드:
 * 1. **주요 개념**: 시스템 정보를 표시하는 위젯 업데이트 함수들
 * 2. **사용 방법**: `import * as Widgets from './widgets'; Widgets.updateClock();`
 * 3. **의존성**: showToast, showPrompt (ui.ts)
 *
 * 원본: mydesktop/js/widgets.js (App.Widgets)
 * 변경점: `App.Widgets.xxx` -> named export
 */

import { showToast, showPrompt } from './ui';

// ---------------------------------------------------------------------------
// Clock
// ---------------------------------------------------------------------------

/**
 * 시계 업데이트
 * 현재 시간과 날짜를 화면에 표시
 */
export function updateClock(): void {
  const now = new Date();
  const clockTime = document.getElementById('clock-time');
  const clockDate = document.getElementById('clock-date');

  if (clockTime) {
    clockTime.textContent = now.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
    });
  }

  if (clockDate) {
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, '0');
    const d = String(now.getDate()).padStart(2, '0');
    const weekdays = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];
    clockDate.textContent = `${y}-${m}-${d} (${weekdays[now.getDay()]})`;
  }
}

// ---------------------------------------------------------------------------
// System Info
// ---------------------------------------------------------------------------

/**
 * 시스템 정보 초기화
 * CPU 코어, 네트워크, 배터리, 메모리 정보 설정
 */
export function initSystemInfo(): void {
  // CPU 코어 수
  const cores = navigator.hardwareConcurrency || '--';
  const coresEl = document.getElementById('cores-value');
  if (coresEl) coresEl.textContent = String(cores);

  // 네트워크 정보
  const nav = navigator as Navigator & {
    connection?: {
      effectiveType?: string;
      downlink?: number;
      addEventListener: (event: string, handler: () => void) => void;
    };
  };

  if (nav.connection) {
    updateNetwork();
    nav.connection.addEventListener('change', updateNetwork);
  } else {
    const networkRow = document.getElementById('network-row');
    if (networkRow) networkRow.style.display = 'none';
  }

  // 배터리
  const navBattery = navigator as Navigator & {
    getBattery?: () => Promise<{
      level: number;
      charging: boolean;
      addEventListener: (event: string, handler: () => void) => void;
    }>;
  };

  if (navBattery.getBattery) {
    navBattery.getBattery().then((battery) => {
      updateBattery(battery);
      battery.addEventListener('levelchange', () => updateBattery(battery));
      battery.addEventListener('chargingchange', () => updateBattery(battery));
    });
  } else {
    const batteryRow = document.getElementById('battery-row');
    if (batteryRow) batteryRow.style.display = 'none';
  }

  // JS 힙 메모리 (Chrome만)
  const perf = performance as Performance & {
    memory?: { usedJSHeapSize: number; jsHeapSizeLimit: number };
  };

  if (perf.memory) {
    updateMemory();
    setInterval(updateMemory, 2000);
  } else {
    const memoryRow = document.getElementById('memory-row');
    if (memoryRow) memoryRow.style.display = 'none';
  }
}

/**
 * 네트워크 정보 업데이트
 */
export function updateNetwork(): void {
  const nav = navigator as Navigator & {
    connection?: { effectiveType?: string; downlink?: number };
  };
  const conn = nav.connection;
  if (!conn) return;

  let info = conn.effectiveType?.toUpperCase() || '--';
  if (conn.downlink) {
    info += ` ${conn.downlink}Mbps`;
  }

  const networkEl = document.getElementById('network-value');
  if (networkEl) networkEl.textContent = info;

  const icon = document.querySelector('#network-row .system-icon');
  if (icon) {
    if (conn.effectiveType === '4g') icon.textContent = '\uD83D\uDCF6';
    else if (conn.effectiveType === '3g') icon.textContent = '\uD83D\uDCF5';
    else if (conn.effectiveType === '2g') icon.textContent = '\uD83D\uDCF5';
    else icon.textContent = '\uD83D\uDCF6';
  }
}

/**
 * 배터리 정보 업데이트
 * @param battery - 배터리 매니저 객체
 */
export function updateBattery(battery: { level: number; charging: boolean }): void {
  const level = Math.round(battery.level * 100);

  const batteryValue = document.getElementById('battery-value');
  if (batteryValue) batteryValue.textContent = level + '%';

  const batteryBar = document.getElementById('battery-bar') as HTMLElement | null;
  if (batteryBar) batteryBar.style.width = level + '%';

  const row = document.getElementById('battery-row');
  if (row) {
    if (battery.charging) {
      row.classList.add('battery-charging');
      const icon = row.querySelector('.system-icon');
      if (icon) icon.textContent = '\u26A1';
    } else {
      row.classList.remove('battery-charging');
      const icon = row.querySelector('.system-icon');
      if (icon) icon.textContent = level <= 20 ? '\uD83E\uDEAB' : '\uD83D\uDD0B';
    }
  }
}

/**
 * 메모리 사용량 업데이트 (Chrome 전용)
 */
export function updateMemory(): void {
  const perf = performance as Performance & {
    memory?: { usedJSHeapSize: number; jsHeapSizeLimit: number };
  };
  if (!perf.memory) return;

  const used = perf.memory.usedJSHeapSize;
  const total = perf.memory.jsHeapSizeLimit;
  const usedMB = Math.round(used / 1024 / 1024);
  const percent = Math.round((used / total) * 100);

  const memoryValue = document.getElementById('memory-value');
  if (memoryValue) memoryValue.textContent = usedMB + 'MB';

  const memoryBar = document.getElementById('memory-bar') as HTMLElement | null;
  if (memoryBar) memoryBar.style.width = percent + '%';
}

// ---------------------------------------------------------------------------
// Weather
// ---------------------------------------------------------------------------

/** 날씨 코드를 이모지로 변환 */
function getWeatherEmoji(code: string): string {
  const weatherEmojis: Record<string, string> = {
    '113': '\u2600\uFE0F', '116': '\u26C5', '119': '\u2601\uFE0F',
    '122': '\u2601\uFE0F', '143': '\uD83C\uDF2B\uFE0F', '176': '\uD83C\uDF26\uFE0F',
    '179': '\uD83C\uDF28\uFE0F', '182': '\uD83C\uDF27\uFE0F', '185': '\uD83C\uDF27\uFE0F',
    '200': '\u26C8\uFE0F', '227': '\uD83C\uDF28\uFE0F', '230': '\u2744\uFE0F',
    '248': '\uD83C\uDF2B\uFE0F', '260': '\uD83C\uDF2B\uFE0F', '263': '\uD83C\uDF27\uFE0F',
    '266': '\uD83C\uDF27\uFE0F', '281': '\uD83C\uDF27\uFE0F', '284': '\uD83C\uDF27\uFE0F',
    '293': '\uD83C\uDF27\uFE0F', '296': '\uD83C\uDF27\uFE0F', '299': '\uD83C\uDF27\uFE0F',
    '302': '\uD83C\uDF27\uFE0F', '305': '\uD83C\uDF27\uFE0F', '308': '\uD83C\uDF27\uFE0F',
    '311': '\uD83C\uDF27\uFE0F', '314': '\uD83C\uDF27\uFE0F', '317': '\uD83C\uDF27\uFE0F',
    '320': '\uD83C\uDF27\uFE0F', '323': '\uD83C\uDF28\uFE0F', '326': '\uD83C\uDF28\uFE0F',
    '329': '\uD83C\uDF28\uFE0F', '332': '\uD83C\uDF28\uFE0F', '335': '\uD83C\uDF28\uFE0F',
    '338': '\u2744\uFE0F', '350': '\uD83C\uDF27\uFE0F', '353': '\uD83C\uDF27\uFE0F',
    '356': '\uD83C\uDF27\uFE0F', '359': '\uD83C\uDF27\uFE0F', '362': '\uD83C\uDF27\uFE0F',
    '365': '\uD83C\uDF27\uFE0F', '368': '\uD83C\uDF28\uFE0F', '371': '\uD83C\uDF28\uFE0F',
    '374': '\uD83C\uDF27\uFE0F', '377': '\uD83C\uDF27\uFE0F', '386': '\u26C8\uFE0F',
    '389': '\u26C8\uFE0F', '392': '\u26C8\uFE0F', '395': '\u26C8\uFE0F',
  };
  return weatherEmojis[code] || '\uD83C\uDF24\uFE0F';
}

/**
 * 날씨 업데이트 (wttr.in API 사용)
 */
export function updateWeather(): void {
  const savedLocation = localStorage.getItem('mydesktop-weather-location') || 'Seoul';

  fetch(`https://wttr.in/${encodeURIComponent(savedLocation)}?format=j1`)
    .then((res) => res.json())
    .then((data) => {
      const current = data.current_condition[0];
      const location = data.nearest_area[0];

      const weatherTemp = document.getElementById('weather-temp');
      if (weatherTemp) weatherTemp.textContent = current.temp_C + '\u00B0';

      const weatherIcon = document.getElementById('weather-icon');
      if (weatherIcon) weatherIcon.textContent = getWeatherEmoji(current.weatherCode);

      const weatherDesc = document.getElementById('weather-desc');
      if (weatherDesc) weatherDesc.textContent = current.weatherDesc[0].value;

      const weatherLocation = document.getElementById('weather-location');
      if (weatherLocation) weatherLocation.textContent = location.areaName[0].value;
    })
    .catch((err) => {
      console.error('Weather fetch error:', err);
      const weatherDesc = document.getElementById('weather-desc');
      if (weatherDesc) weatherDesc.textContent = '날씨 로드 실패';
    });
}

/**
 * 날씨 위젯 초기화
 */
export function initWeather(): void {
  updateWeather();
  setInterval(updateWeather, 30 * 60 * 1000);

  const weatherWidget = document.getElementById('weather-widget');
  if (weatherWidget) {
    weatherWidget.addEventListener('click', changeWeatherLocation);
  }
}

/**
 * 날씨 도시 변경
 */
async function changeWeatherLocation(): Promise<void> {
  const currentLocation = localStorage.getItem('mydesktop-weather-location') || 'Seoul';
  const newLocation = await showPrompt(
    '날씨를 확인할 도시를 입력하세요:\n(영문 도시명 권장: Seoul, Busan, Tokyo, NewYork 등)',
    currentLocation,
    { title: '날씨 위치 변경', placeholder: 'Seoul' },
  );

  if (newLocation && typeof newLocation === 'string' && newLocation.trim()) {
    localStorage.setItem('mydesktop-weather-location', newLocation.trim());
    const weatherDesc = document.getElementById('weather-desc');
    if (weatherDesc) weatherDesc.textContent = '로딩 중...';
    updateWeather();
    showToast(`날씨 위치: ${newLocation.trim()}`);
  }
}
