# Menu Easter Egg Redesign & UI 개선 Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** 메뉴 페이지의 GPU 부하를 줄이고, 이스터에그를 수동 클릭 실행 방식으로 전환하며, 시스템정보/날씨를 제거하고 다국어/테마/종료 아이콘을 추가하고, 캐러셀 중앙 카드 확대 효과를 적용한다.

**Architecture:** effects/index.ts의 자동 실행 타이머를 모두 제거하고, MenuWidgets.tsx에 클릭 패널 UI를 구성한다. 시스템/날씨 위젯을 제거한 우측 상단에 다국어/테마/종료 기능 아이콘을 배치한다. carousel.ts의 updateCarouselPosition에서 중앙 카드에 확대 스케일을 적용한다.

**Tech Stack:** Next.js 15, TypeScript, GSAP, CSS (layer menu)

---

### Task 1: effects/index.ts 자동 실행 제거

**Files:**
- Modify: `src/lib/menu/effects/index.ts:47-57`

**Step 1: init()에서 자동 start 호출 전부 제거**

`init()` 함수의 본문을 비우고, 개별 트리거 함수만 re-export 유지:

```typescript
/**
 * 이펙트 시스템 초기화 (자동 실행 없음 - 모든 이펙트는 수동 클릭으로 실행)
 */
export function init(): void {
  console.log('[Effects] Effect system ready (manual trigger mode)');
}
```

import 문에서 사용하지 않는 start 함수 import도 제거:
- `startMeteorShower`, `startCrowAttacks`, `startCatPaws`, `startCardSleepSystem`, `startUfoVisits`, `startDragonAttacks`, `startMeteorImpacts`

re-export에서도 start 함수들 제거 (외부에서 자동 실행 호출 방지).

**Step 2: 빌드 확인**

Run: `npm run build`
Expected: 빌드 성공 (unused import 경고 없음)

**Step 3: Commit**

```bash
git add src/lib/menu/effects/index.ts
git commit -m "refactor: remove auto-start timers from effects init for GPU optimization"
```

---

### Task 2: init.ts에서 시스템/날씨 위젯 초기화 제거

**Files:**
- Modify: `src/lib/menu/init.ts:105-106`

**Step 1: 시스템/날씨 초기화 호출 제거**

`initMenuSystem()` 라인 105-106 제거:

```typescript
// 삭제: Widgets.initSystemInfo();
// 삭제: Widgets.initWeather();
```

시계(`Widgets.updateClock()`, `clockIntervalId`)는 유지.

**Step 2: 빌드 확인**

Run: `npm run build`
Expected: 빌드 성공

**Step 3: Commit**

```bash
git add src/lib/menu/init.ts
git commit -m "refactor: remove system info and weather widget initialization"
```

---

### Task 3: MenuWidgets.tsx - 시스템/날씨 제거 + 이스터에그 패널 확장 + 우측 기능 아이콘

**Files:**
- Modify: `src/components/menu/MenuWidgets.tsx`

**Step 1: 전체 재작성**

시스템 위젯(57-84줄)과 날씨 위젯(86-97줄)을 제거하고, 이스터에그 패널을 10개 아이콘 그리드로 확장하고, 우측 상단 기능 아이콘 3개를 추가:

```tsx
/**
 * @file src/components/menu/MenuWidgets.tsx
 * @description 위젯 영역 - 검색, 시계, 이스터에그 패널, 기능 아이콘(다국어/테마/종료)
 *
 * 초보자 가이드:
 * 1. **주요 개념**: mydesktop의 위젯 HTML 구조를 JSX로 변환
 * 2. **사용 방법**: MenuScene에서 import하여 렌더링
 * 3. **중요**: 이스터에그는 ✨ 클릭 시 패널 토글, 각 아이콘 클릭 시 1회 실행
 */

/**
 * 검색창 + 시계 + 이스터에그 패널 + 기능 아이콘(다국어/테마/종료)
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

      {/* 이스터에그 패널 (✨ 클릭 시 토글) */}
      <div id="easter-egg-container">
        <div id="easter-egg-indicator" title="이스터에그">&#10024;</div>
        <div id="easter-egg-panel">
          <button className="easter-btn" id="dragon-test-btn" title="드래곤 소환">&#128009;</button>
          <button className="easter-btn" id="wolf-test-btn" title="늑대 소환">&#128058;</button>
          <button className="easter-btn" id="meteor-test-btn" title="유성 샤워">&#9732;&#65039;</button>
          <button className="easter-btn" id="meteor-impact-btn" title="유성 충돌">&#128165;</button>
          <button className="easter-btn" id="crow-test-btn" title="까마귀 도둑">&#128038;</button>
          <button className="easter-btn" id="cat-test-btn" title="고양이 발자국">&#128049;</button>
          <button className="easter-btn" id="ufo-test-btn" title="UFO 외계인">&#128760;</button>
          <button className="easter-btn" id="star-test-btn" title="별 날아오기">&#11088;</button>
          <button className="easter-btn toggle-btn" id="click-fx-btn" title="클릭 리플 ON/OFF">&#128070;</button>
          <button className="easter-btn toggle-btn" id="card-sleep-btn" title="카드 수면 ON/OFF">&#128564;</button>
        </div>
      </div>

      {/* 우측 상단 기능 아이콘 */}
      <div id="util-icons">
        <button className="util-btn" id="locale-btn" title="다국어 전환">&#127760;</button>
        <button className="util-btn" id="theme-btn" title="테마 전환">&#127769;</button>
        <button className="util-btn" id="exit-btn" title="종료">&#9211;</button>
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
```

**Step 2: 빌드 확인**

Run: `npm run build`
Expected: 빌드 성공

**Step 3: Commit**

```bash
git add src/components/menu/MenuWidgets.tsx
git commit -m "feat: easter egg panel with 10 icons, add locale/theme/exit util icons, remove system/weather widgets"
```

---

### Task 4: CSS - 이스터에그 패널 + 기능 아이콘 스타일

**Files:**
- Modify: `src/styles/menu/components-effects.css:96-171` (이스터에그 섹션 교체)
- Modify: `src/styles/menu/components-core.css:299-429` (시스템/날씨 CSS 제거, 기능 아이콘 CSS 추가)
- Modify: `src/styles/menu/responsive.css` (시스템/날씨 반응형 제거, 새 요소 반응형 추가)

**Step 1: components-effects.css 이스터에그 섹션 교체**

`#easter-egg-container` ~ `.easter-btn:active` (라인 96-171)을 아래로 교체:

```css
/* ===== Easter Egg Panel ===== */
#easter-egg-container {
  position: fixed;
  left: 20px;
  top: 120px;
  z-index: 300;
}

#easter-egg-indicator {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  background: rgba(10, 10, 15, 0.5);
  backdrop-filter: blur(10px);
  border: 1px solid rgba(255, 215, 0, 0.2);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 14px;
  cursor: pointer;
  transition: all 0.3s ease;
  opacity: 0.5;
}

#easter-egg-indicator:hover {
  opacity: 1;
  border-color: var(--accent);
  box-shadow: 0 0 15px rgba(255, 215, 0, 0.3);
}

#easter-egg-indicator.active {
  opacity: 1;
  border-color: var(--accent);
  box-shadow: 0 0 15px rgba(255, 215, 0, 0.3);
}

/* 패널 (기본 숨김, 인디케이터 클릭 시 표시) */
#easter-egg-panel {
  position: absolute;
  left: 40px;
  top: -4px;
  display: grid;
  grid-template-columns: repeat(5, 1fr);
  gap: 6px;
  padding: 8px;
  background: rgba(10, 10, 15, 0.85);
  backdrop-filter: blur(15px);
  border: 1px solid rgba(255, 215, 0, 0.2);
  border-radius: 12px;
  opacity: 0;
  visibility: hidden;
  transform: translateX(-10px);
  transition: all 0.3s ease;
}

#easter-egg-panel.open {
  opacity: 1;
  visibility: visible;
  transform: translateX(0);
}

.easter-btn {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  border: 1px solid rgba(255, 215, 0, 0.3);
  background: rgba(10, 10, 15, 0.7);
  backdrop-filter: blur(10px);
  cursor: pointer;
  font-size: 18px;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.3s ease;
  opacity: 0.8;
}

.easter-btn:hover {
  opacity: 1;
  border-color: var(--accent);
  box-shadow: 0 0 15px rgba(255, 215, 0, 0.3);
  transform: scale(1.1);
}

.easter-btn:active {
  transform: scale(0.95);
}

/* 토글 버튼 활성 상태 */
.easter-btn.toggle-btn.active {
  border-color: var(--accent);
  background: rgba(255, 215, 0, 0.15);
  box-shadow: 0 0 10px rgba(255, 215, 0, 0.2);
}
```

**Step 2: components-core.css 시스템/날씨 CSS 제거 + 기능 아이콘 CSS 추가**

`#system-widget` ~ `#weather-widget:hover .weather-edit-hint` (라인 299-429)을 모두 제거하고, 대신 기능 아이콘 CSS 추가:

```css
/* ===== Utility Icons (우측 상단) ===== */
#util-icons {
  position: fixed;
  top: 20px;
  right: 20px;
  display: flex;
  gap: 10px;
  z-index: 200;
}

.util-btn {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  border: 1px solid rgba(255, 215, 0, 0.2);
  background: rgba(10, 10, 15, 0.5);
  backdrop-filter: blur(10px);
  cursor: pointer;
  font-size: 18px;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.3s ease;
  color: var(--text);
  opacity: 0.7;
}

.util-btn:hover {
  opacity: 1;
  border-color: var(--accent);
  box-shadow: 0 0 15px rgba(255, 215, 0, 0.3);
  transform: scale(1.1);
}

.util-btn:active {
  transform: scale(0.95);
}
```

**Step 3: responsive.css 시스템/날씨 반응형 제거 + 새 요소 반응형 추가**

768px 미디어쿼리에서 `#system-widget`, `#weather-widget` 관련 (라인 21-54) 제거.
480px 미디어쿼리에서 `#system-widget`, `#weather-widget` 관련 (라인 177-205) 제거.

새로 추가:
```css
/* 768px */
#util-icons {
  top: 15px;
  right: 15px;
  gap: 8px;
}

.util-btn {
  width: 34px;
  height: 34px;
  font-size: 16px;
}

/* 480px */
#util-icons {
  top: 10px;
  right: 10px;
  gap: 6px;
}

.util-btn {
  width: 30px;
  height: 30px;
  font-size: 14px;
}

#easter-egg-panel {
  grid-template-columns: repeat(5, 1fr);
  gap: 4px;
  padding: 6px;
}

.easter-btn {
  width: 30px;
  height: 30px;
  font-size: 14px;
}
```

**Step 4: 빌드 확인**

Run: `npm run build`
Expected: 빌드 성공

**Step 5: Commit**

```bash
git add src/styles/menu/components-effects.css src/styles/menu/components-core.css src/styles/menu/responsive.css
git commit -m "style: easter egg panel grid, utility icons, remove system/weather CSS"
```

---

### Task 5: 이스터에그 패널 + 기능 아이콘 이벤트 바인딩

**Files:**
- Modify: `src/lib/menu/handlers/index.ts` 또는 적절한 핸들러 파일

**Step 1: 이벤트 리스너 추가**

`initEventListeners()` 또는 별도 함수에서 아래 이벤트를 바인딩:

1. **이스터에그 패널 토글**: `#easter-egg-indicator` 클릭 → `#easter-egg-panel`에 `.open` 클래스 토글
2. **패널 바깥 클릭 닫기**: document 클릭 시 패널 외부면 `.open` 제거
3. **각 이스터에그 버튼 클릭 → 1회 실행**:
   - `#dragon-test-btn` → `createDragonAttack()`
   - `#wolf-test-btn` → `createWolfAppear()`
   - `#meteor-test-btn` → `createMeteor()`
   - `#meteor-impact-btn` → `createMeteorImpact()`
   - `#crow-test-btn` → `createCrowAttack()`
   - `#cat-test-btn` → `createCatPawEvent()`
   - `#ufo-test-btn` → `createUfoEvent()`
   - `#star-test-btn` → `createStarFlyby()`
   - `#click-fx-btn` → 클릭 리플 on/off 토글 (`.active` 클래스 + 전역 플래그)
   - `#card-sleep-btn` → 카드 수면 on/off 토글 (`.active` 클래스 + `startCardSleepSystem`/stop)
4. **다국어 아이콘**: `#locale-btn` 클릭 → `mes-display-locale` 순환 (ko→en→es→ko) + `location.reload()`
5. **테마 아이콘**: `#theme-btn` 클릭 → `mes-display-theme` 토글 (light/dark) + `document.documentElement.classList.toggle('dark')`
6. **종료 아이콘**: `#exit-btn` 클릭 → `#exit-modal` 표시, `#exit-confirm` → `window.close()`, `#exit-cancel` → 모달 닫기

**Step 2: 빌드 확인**

Run: `npm run build`
Expected: 빌드 성공

**Step 3: 수동 검증**

- `http://localhost:3000/` 접속
- ✨ 클릭 → 패널 열림 확인
- 각 이스터에그 아이콘 클릭 → 이펙트 1회 실행 확인
- 자동 실행 없음 확인 (페이지 로드 후 대기, 이펙트 미발생)
- 🌐 클릭 → 언어 순환 확인
- 🌙 클릭 → 테마 토글 확인
- ⏻ 클릭 → 종료 모달 확인

**Step 4: Commit**

```bash
git add src/lib/menu/handlers/
git commit -m "feat: easter egg panel toggle, effect trigger buttons, locale/theme/exit handlers"
```

---

### Task 6: 캐러셀 중앙 카드 확대 효과

**Files:**
- Modify: `src/lib/menu/carousel.ts:148-224` (`updateCarouselPosition` 함수)

**Step 1: scale/opacity 값 변경**

`updateCarouselPosition()` 함수의 scale/opacity 계산 부분을 수정하여 중앙 카드(normalizedDepth ≈ 1)는 크게, 주변은 작게 표시:

데스크탑 기준 변경:
```typescript
// 기존: scale = 0.65 + 0.35 * normalizedDepth;  (0.65 ~ 1.0)
// 변경: 중앙 카드 확대, 주변 축소
scale = 0.75 + 0.35 * normalizedDepth;    // 0.75 ~ 1.1
opacity = 0.5 + 0.5 * normalizedDepth;     // 유지
```

모바일 기준 변경:
```typescript
// 기존: scale = 0.7 + 0.3 * normalizedDepth;  (0.7 ~ 1.0)
// 변경:
scale = 0.75 + 0.3 * normalizedDepth;     // 0.75 ~ 1.05
opacity = 0.6 + 0.4 * normalizedDepth;     // 유지
```

**Step 2: 수동 검증**

- 캐러셀 모드에서 중앙 카드가 주변보다 눈에 띄게 크게 표시되는지 확인
- 화살표/스와이프로 이동 시 스케일 전환이 부드러운지 확인

**Step 3: Commit**

```bash
git add src/lib/menu/carousel.ts
git commit -m "feat: carousel center card scale-up effect for visual emphasis"
```

---

### Task 7: 최종 검증 및 정리

**Step 1: 전체 빌드**

Run: `npm run build`
Expected: 빌드 성공, 경고 없음

**Step 2: 수동 통합 테스트**

1. `http://localhost:3000/` → 메뉴 정상 로드
2. 시스템 정보/날씨 위젯 사라짐 확인
3. 우측 상단에 🌐🌙⏻ 아이콘 표시 확인
4. ✨ 클릭 → 10개 아이콘 패널 열림
5. 각 이스터에그 클릭 → 1회 실행
6. 페이지 로드 후 자동 이펙트 없음 확인 (GPU 부하 감소)
7. 캐러셀 중앙 카드 확대 확인
8. 다국어/테마/종료 기능 동작 확인

**Step 3: 최종 Commit**

```bash
git add -A
git commit -m "feat: menu easter egg redesign - manual trigger, utility icons, carousel center scale"
```
