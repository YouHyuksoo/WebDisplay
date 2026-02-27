# SOLUM MES Display Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** mydesktop 3D 메뉴 시스템을 통째로 Next.js에 포팅하고, MES 디스플레이 화면을 구현한다.

**Architecture:** mydesktop의 vanilla JS 모듈들을 ES module로 변환하여 React client component에서 초기화. 카드 클릭만 Next.js router로 교체. 디스플레이 화면은 100vh 고정 레이아웃 + SWR polling.

**Tech Stack:** Next.js 15, TypeScript, Tailwind CSS 4, Three.js, GSAP, next-themes, next-intl, SWR, Recharts, oracledb

---

## Phase 1: Project Foundation

### Task 1: Install Dependencies

**Step 1: Install runtime dependencies**

Run:
```bash
cd C:/Project/WebDisplay
npm install three gsap @lottiefiles/dotlottie-wc swr next-themes next-intl recharts
```

**Step 2: Install dev dependencies**

Run:
```bash
npm install -D @types/three
```

**Step 3: Verify installation**

Run: `npm ls three gsap swr next-themes next-intl recharts`
Expected: 모든 패키지 버전 표시, 에러 없음

**Step 4: Commit**

```bash
git add package.json package-lock.json
git commit -m "deps: add three.js, gsap, swr, next-themes, next-intl, recharts"
```

---

### Task 2: Root Layout & Theme Provider Setup

**Files:**
- Modify: `src/app/layout.tsx`
- Create: `src/components/providers/ThemeProvider.tsx`
- Modify: `src/app/globals.css`

**Step 1: Create ThemeProvider**

```typescript
// src/components/providers/ThemeProvider.tsx
'use client';

import { ThemeProvider as NextThemesProvider } from 'next-themes';

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  return (
    <NextThemesProvider attribute="class" defaultTheme="dark" enableSystem={false}>
      {children}
    </NextThemesProvider>
  );
}
```

**Step 2: Update globals.css**

기존 Tailwind import 유지하면서 100vh 고정 + glow theme CSS 변수 추가:

```css
@import "tailwindcss";

:root {
  --glow-primary: #ffd700;
  --glow-secondary: #ff8c00;
  --glow-orb-1: rgba(255, 215, 0, 0.15);
  --glow-orb-2: rgba(255, 140, 0, 0.1);
}

html, body {
  height: 100vh;
  overflow: hidden;
}
```

**Step 3: Update layout.tsx**

```typescript
// src/app/layout.tsx
import type { Metadata } from "next";
import { ThemeProvider } from "@/components/providers/ThemeProvider";
import "./globals.css";

export const metadata: Metadata = {
  title: "SOLUM MES Display",
  description: "Manufacturing Execution System Display Monitor",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ko" suppressHydrationWarning>
      <body className="h-screen overflow-hidden bg-[#050508] text-white antialiased">
        <ThemeProvider>
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}
```

**Step 4: Verify dev server**

Run: `npm run dev`
Expected: http://localhost:3000 에서 검은 배경 페이지 표시

**Step 5: Commit**

```bash
git add src/app/layout.tsx src/app/globals.css src/components/providers/ThemeProvider.tsx
git commit -m "feat: root layout with dark theme, 100vh fixed, glow CSS variables"
```

---

## Phase 2: mydesktop Menu System Port

### Task 3: Port mydesktop CSS

**Files:**
- Create: `src/styles/menu/variables.css`
- Create: `src/styles/menu/base.css`
- Create: `src/styles/menu/animations.css`
- Create: `src/styles/menu/components.css` (모든 component CSS 통합)

**Step 1: Copy & adapt CSS files**

mydesktop CSS 파일들을 `src/styles/menu/`로 복사.
`C:/Project/mydesktop/css/` 전체를 가져오되:
- `variables.css` → 그대로 (CSS 변수)
- `base.css` → 그대로 (기본 스타일)
- `animations.css` → 그대로
- `components/` 하위 20개 CSS → `components.css` 하나로 통합
- `responsive.css` → 그대로

핵심: **내용 수정 최소화**, import 경로만 Next.js에 맞게 조정.

**Step 2: Import in globals.css**

```css
@import "tailwindcss";
@import "../styles/menu/variables.css";
@import "../styles/menu/base.css";
@import "../styles/menu/animations.css";
@import "../styles/menu/components.css";
@import "../styles/menu/responsive.css";
```

**Step 3: Verify no CSS conflicts**

Run: `npm run dev`
Expected: 페이지 로드 시 CSS 에러 없음

**Step 4: Commit**

```bash
git add src/styles/
git commit -m "feat: port mydesktop CSS to src/styles/menu/"
```

---

### Task 4: Port mydesktop Core JS Modules (config, state, storage)

**Files:**
- Create: `src/lib/menu/config.ts`
- Create: `src/lib/menu/state.ts`
- Create: `src/lib/menu/storage.ts`
- Create: `src/lib/menu/types.ts`

**Step 1: Create types**

```typescript
// src/lib/menu/types.ts
export interface Shortcut {
  id: string;
  title: string;
  url: string;
  color: string;
  icon: string;
  layer: number;
}

export interface Category {
  id: number;
  name: string;
  subtitle: string;
  icon: string;
}

export interface MenuSettings {
  tunnelShape: string;
  glowTheme: string;
  iconColorMode: string;
  cardStyle: string;
  spaceType: string;
  cardLayout: string;
}

export interface GlowTheme {
  primary: string;
  secondary: string;
  orbs: string[];
}
```

**Step 2: Port config.js → config.ts**

mydesktop `js/config.js`를 TypeScript ES module로 변환.
`App.Config` → named exports.
- `GLOW_THEMES` 8색 그대로
- `TUNNEL`, `WARP` 상수 그대로
- `DEFAULT_SHORTCUTS` → MES 메뉴 16개 화면 카드로 교체
- `DEFAULT_CATEGORIES` → Management / Monitoring / Quality 3개로 교체

MES 카드 데이터 예시:
```typescript
export const MES_MENU_CARDS: Shortcut[] = [
  // Management
  { id: 'menu-12', title: 'ASSY 생산 현황', url: '/display/12', color: '#ffd700', icon: 'svg:factory', layer: 0 },
  { id: 'menu-16', title: '설비 로그 오류', url: '/display/16', color: '#ff6b6b', icon: 'svg:alert', layer: 0 },
  { id: 'menu-18', title: '옵션 설정', url: '/display/18', color: '#94a3b8', icon: 'svg:settings', layer: 0 },
  // Monitoring
  { id: 'menu-21', title: 'ASSY 기계 상태', url: '/display/21', color: '#06b6d4', icon: 'svg:machine', layer: 1 },
  // ... 나머지 13개
];

export const MES_CATEGORIES: Category[] = [
  { id: 0, name: 'MANAGEMENT', subtitle: '관리 설정', icon: '⚙️' },
  { id: 1, name: 'MONITORING', subtitle: '실시간 모니터링', icon: '📊' },
  { id: 2, name: 'QUALITY', subtitle: '품질 관리', icon: '✅' },
];
```

**Step 3: Port state.js → state.ts**

`App.State` → mutable state object export.
Three.js 관련 필드는 `any` 타입으로 (런타임에 할당).

**Step 4: Port storage.js → storage.ts**

`App.Storage` → named function exports.
localStorage 키 prefix를 `mes-display-`로 변경.

**Step 5: Commit**

```bash
git add src/lib/menu/
git commit -m "feat: port mydesktop config/state/storage as ES modules with MES menu data"
```

---

### Task 5: Port Three.js Space Modules

**Files:**
- Create: `src/lib/menu/space/core.ts`
- Create: `src/lib/menu/space/tunnel.ts`
- Create: `src/lib/menu/space/warp.ts`
- Create: `src/lib/menu/space/aurora.ts`
- Create: `src/lib/menu/space/index.ts`

**Step 1: Port each space module**

mydesktop `js/space/*.js` → TypeScript ES modules.
변환 규칙:
- `App.Space.xxx` → named export `xxx`
- `App.State` import → `import { state } from '../state'`
- `App.Config` import → `import { TUNNEL, WARP } from '../config'`
- `three` → `import * as THREE from 'three'` (npm 패키지)
- `gsap` → `import gsap from 'gsap'` (npm 패키지)

각 파일 내부 로직은 **그대로** 유지. import/export만 변경.

**Step 2: Create space/index.ts**

animate() 루프를 export. requestAnimationFrame 루프 그대로.

**Step 3: Commit**

```bash
git add src/lib/menu/space/
git commit -m "feat: port Three.js space modules (tunnel, warp, aurora)"
```

---

### Task 6: Port Cards, Carousel, Sections, Lanes Modules

**Files:**
- Create: `src/lib/menu/cards.ts`
- Create: `src/lib/menu/carousel.ts`
- Create: `src/lib/menu/sections.ts`
- Create: `src/lib/menu/lanes.ts`
- Create: `src/lib/menu/categories.ts`

**Step 1: Port each module**

동일한 변환 규칙 적용:
- `App.xxx` → named exports
- 내부 로직 그대로 유지
- DOM 조작 코드 그대로 유지 (client component에서 실행되므로)

**Step 2: cards.ts에서 카드 클릭 핸들러 수정**

이것이 유일한 핵심 변경. 카드 클릭 시 `window.open(url)` 대신 커스텀 이벤트 발생:

```typescript
// cards.ts 내부, 카드 클릭 핸들러에서:
// 기존: window.open(shortcut.url, '_blank')
// 변경:
card.addEventListener('click', () => {
  const event = new CustomEvent('mes-navigate', {
    detail: { url: shortcut.url }
  });
  window.dispatchEvent(event);
});
```

**Step 3: Commit**

```bash
git add src/lib/menu/cards.ts src/lib/menu/carousel.ts src/lib/menu/sections.ts src/lib/menu/lanes.ts src/lib/menu/categories.ts
git commit -m "feat: port cards/carousel/sections/lanes with MES routing hook"
```

---

### Task 7: Port UI, Effects, Handlers Modules

**Files:**
- Create: `src/lib/menu/ui.ts`
- Create: `src/lib/menu/search.ts`
- Create: `src/lib/menu/effects/index.ts`
- Create: `src/lib/menu/effects/click-effects.ts`
- Create: `src/lib/menu/effects/dragon.ts`
- Create: `src/lib/menu/effects/crow.ts`
- Create: `src/lib/menu/effects/meteor.ts`
- Create: `src/lib/menu/effects/meteor-impact.ts`
- Create: `src/lib/menu/effects/wolf.ts`
- Create: `src/lib/menu/effects/ufo-alien.ts`
- Create: `src/lib/menu/effects/star-flyby.ts`
- Create: `src/lib/menu/effects/cat-paws.ts`
- Create: `src/lib/menu/effects/card-sleep.ts`
- Create: `src/lib/menu/handlers/index.ts`
- Create: `src/lib/menu/handlers/shortcut-crud.ts`
- Create: `src/lib/menu/handlers/settings-handler.ts`
- Create: `src/lib/menu/handlers/data-io.ts`
- Create: `src/lib/menu/handlers/grid-scroll.ts`

**Step 1: Port UI module**

`App.UI` → named exports. applyGlowTheme, showToast 등 그대로.

**Step 2: Port all effects modules**

각 이스터 에그 그대로 포팅. Lottie는 `@lottiefiles/dotlottie-wc` npm 패키지 사용.

**Step 3: Port handlers**

이벤트 핸들러 그대로. `shortcut-crud.ts`에서 바로가기 추가/수정은 MES에서 불필요하므로 비활성화 가능하지만 코드는 유지.

**Step 4: 불필요한 모듈 제외**

- `bookmarks.js` → 제외 (브라우저 북마크 기능, MES 불필요)
- `widgets.js` → 시계만 유지, 날씨/시스템 제외
- `handlers/protocol-handler.js` → 제외

**Step 5: Commit**

```bash
git add src/lib/menu/ui.ts src/lib/menu/search.ts src/lib/menu/effects/ src/lib/menu/handlers/
git commit -m "feat: port UI, effects (easter eggs), handlers modules"
```

---

### Task 8: Create MenuScene React Component

**Files:**
- Create: `src/components/menu/MenuScene.tsx`
- Create: `src/lib/menu/init.ts`

**Step 1: Create init.ts (mydesktop main.js 포팅)**

mydesktop `js/main.js`의 `init()` 함수를 ES module로 변환:

```typescript
// src/lib/menu/init.ts
import { loadSettings, loadShortcuts } from './storage';
import { state } from './state';
import * as Space from './space';
import * as Cards from './cards';
import * as Events from './handlers';
import * as Effects from './effects';

export function initMenuSystem() {
  // 1. Load data
  const settings = loadSettings();
  state.shortcuts = loadShortcuts();
  Object.assign(state, settings);

  // 2. Init Three.js
  Space.init();

  // 3. Create space based on type
  switch (state.spaceType) {
    case 'warp': Space.createCosmicWarp(); break;
    case 'aurora': Space.createAurora(); break;
    default: Space.createTunnel(); break;
  }

  // 4. Render cards
  Cards.renderCards();

  // 5. Init events
  Events.initEventListeners();

  // 6. Start animation loop
  Space.animate();

  // 7. Start effects
  Effects.init();
}

export function destroyMenuSystem() {
  // Three.js cleanup
  Space.dispose();
  // Event listeners cleanup
  Events.cleanup();
  // Animation frame cancel
  Space.stopAnimate();
}
```

**Step 2: Create MenuScene.tsx**

```typescript
// src/components/menu/MenuScene.tsx
'use client';

import { useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';

export default function MenuScene() {
  const router = useRouter();
  const initialized = useRef(false);

  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;

    // Dynamic import to avoid SSR issues with Three.js
    import('@/lib/menu/init').then(({ initMenuSystem }) => {
      initMenuSystem();
    });

    // Listen for MES navigation events from cards
    const handleNavigate = (e: CustomEvent<{ url: string }>) => {
      router.push(e.detail.url);
    };
    window.addEventListener('mes-navigate', handleNavigate as EventListener);

    return () => {
      window.removeEventListener('mes-navigate', handleNavigate as EventListener);
      import('@/lib/menu/init').then(({ destroyMenuSystem }) => {
        destroyMenuSystem();
      });
    };
  }, [router]);

  // mydesktop index.html의 HTML 구조를 JSX로 변환
  return (
    <div className="h-screen w-screen overflow-hidden">
      {/* Loading Screen */}
      <div id="loading-screen">{/* ... */}</div>

      {/* Three.js Canvas */}
      <div id="canvas-container" />

      {/* Cards 3D Space */}
      <div id="cards-3d-space" />

      {/* Carousel Dots */}
      <div id="carousel-dots" />

      {/* Section Info */}
      <div id="section-info" />

      {/* Easter Egg Container */}
      <div id="easter-egg-container">
        <div id="easter-egg-indicator" title="이스터에그">✨</div>
        <div id="easter-egg-buttons">
          <button className="easter-btn" id="dragon-test-btn" title="드래곤 소환">🐉</button>
          <button className="easter-btn" id="wolf-test-btn" title="늑대 소환">🐺</button>
          <button className="easter-btn" id="meteor-test-btn" title="유성 충돌">☄️</button>
        </div>
      </div>

      {/* Color Bar (Glow Theme) */}
      <div id="color-bar">{/* 8색 버튼 */}</div>

      {/* Settings Menu */}
      <div id="settings-menu">{/* 설정 옵션들 */}</div>

      {/* Bottom Bar */}
      <div id="bottom-bar">
        <button id="settings-btn">⚙️</button>
        <button id="layout-toggle-btn">📐</button>
        <button id="space-toggle-btn">🌀</button>
      </div>

      {/* Modals */}
      <div id="shortcut-modal" className="modal-overlay hidden">{/* ... */}</div>

      {/* Toast Container */}
      <div id="toast-container" />
    </div>
  );
}
```

mydesktop `index.html`의 전체 HTML 구조를 이 JSX에 그대로 옮긴다.
class → className, 닫는 태그 등 JSX 규칙만 적용.

**Step 3: Update page.tsx**

```typescript
// src/app/page.tsx
import MenuScene from '@/components/menu/MenuScene';

export default function Home() {
  return <MenuScene />;
}
```

**Step 4: Verify menu system**

Run: `npm run dev`
Expected: mydesktop 3D 메뉴가 Next.js에서 동작, 카드 클릭 시 /display/[id]로 라우팅

**Step 5: Commit**

```bash
git add src/components/menu/ src/lib/menu/init.ts src/app/page.tsx
git commit -m "feat: MenuScene component - mydesktop 3D menu system integrated"
```

---

## Phase 3: Display Screen Infrastructure

### Task 9: Common Display Layout

**Files:**
- Create: `src/components/display/DisplayLayout.tsx`
- Create: `src/components/display/DisplayHeader.tsx`
- Create: `src/components/display/DisplayMessageBar.tsx`

**Step 1: Create DisplayHeader**

```typescript
// src/components/display/DisplayHeader.tsx
'use client';

import { useEffect, useState } from 'react';

interface DisplayHeaderProps {
  title: string;
  refreshInterval: number;
}

export default function DisplayHeader({ title, refreshInterval }: DisplayHeaderProps) {
  const [time, setTime] = useState('');

  useEffect(() => {
    const tick = () => setTime(new Date().toLocaleTimeString('ko-KR'));
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);

  return (
    <header className="flex h-12 shrink-0 items-center justify-between border-b border-white/10 bg-black/50 px-6 backdrop-blur">
      <h1 className="text-lg font-semibold" style={{ color: 'var(--glow-primary)' }}>{title}</h1>
      <div className="flex items-center gap-4 text-sm text-zinc-400">
        <span>새로고침: {refreshInterval}초</span>
        <span className="font-mono text-white">{time}</span>
      </div>
    </header>
  );
}
```

**Step 2: Create DisplayMessageBar**

```typescript
// src/components/display/DisplayMessageBar.tsx
interface DisplayMessageBarProps {
  message?: string;
}

export default function DisplayMessageBar({ message }: DisplayMessageBarProps) {
  return (
    <footer className="flex h-8 shrink-0 items-center border-t border-white/10 bg-black/50 px-6 backdrop-blur">
      <span className="text-xs text-zinc-400">{message}</span>
    </footer>
  );
}
```

**Step 3: Create DisplayLayout**

```typescript
// src/components/display/DisplayLayout.tsx
'use client';

import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import DisplayHeader from './DisplayHeader';
import DisplayMessageBar from './DisplayMessageBar';

interface DisplayLayoutProps {
  title: string;
  refreshInterval?: number;
  message?: string;
  children: React.ReactNode;
}

export default function DisplayLayout({ title, refreshInterval = 30, message, children }: DisplayLayoutProps) {
  const router = useRouter();

  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') router.push('/');
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [router]);

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-zinc-950 dark:bg-zinc-950">
      <DisplayHeader title={title} refreshInterval={refreshInterval} />
      <main className="flex-1 overflow-y-auto">
        {children}
      </main>
      <DisplayMessageBar message={message} />
    </div>
  );
}
```

**Step 4: Commit**

```bash
git add src/components/display/
git commit -m "feat: DisplayLayout - 100vh fixed layout with header/content/message bar"
```

---

### Task 10: Display Route & Screen Registry

**Files:**
- Create: `src/app/display/[screenId]/page.tsx`
- Create: `src/lib/screens.ts`

**Step 1: Create screen registry**

```typescript
// src/lib/screens.ts
export interface ScreenConfig {
  id: string;
  title: string;
  titleKo: string;
  window: string;
  group: 'management' | 'monitoring' | 'quality';
}

export const SCREENS: Record<string, ScreenConfig> = {
  '12': { id: '12', title: 'ASSY Production Status', titleKo: 'ASSY 생산 현황', window: 'w_display_assy_production_status', group: 'management' },
  '16': { id: '16', title: 'Machine Log Error', titleKo: '설비 로그 수집 오류', window: 'w_display_machine_log_gather_error_list', group: 'management' },
  '18': { id: '18', title: 'Display Option', titleKo: '옵션 설정', window: 'w_display_option', group: 'management' },
  '21': { id: '21', title: 'ASSY Machine Status', titleKo: 'ASSY 기계 상태', window: 'w_display_machine_status_assy', group: 'monitoring' },
  '22': { id: '22', title: 'ASSY Production', titleKo: 'ASSY 생산량', window: 'w_display_production_assy', group: 'monitoring' },
  '23': { id: '23', title: 'AOI Yield', titleKo: 'AOI 수율', window: 'w_display_aoi_yield', group: 'monitoring' },
  '24': { id: '24', title: 'SMD Machine Status', titleKo: 'SMD 기계 상태', window: 'w_display_machine_status_smd', group: 'monitoring' },
  '25': { id: '25', title: 'SMD Production', titleKo: 'SMD 생산량', window: 'w_display_production_smd', group: 'monitoring' },
  '26': { id: '26', title: 'Material Input', titleKo: '자재 투입 현황', window: 'w_display_material_input', group: 'monitoring' },
  '27': { id: '27', title: 'MSL Management', titleKo: 'MSL 관리', window: 'w_display_msl_mgmt', group: 'monitoring' },
  '28': { id: '28', title: 'Machine Operation Rate', titleKo: '설비 가동률', window: 'w_display_machine_operation_rate', group: 'monitoring' },
  '31': { id: '31', title: 'Solder Paste Mgmt', titleKo: 'Solder Paste 관리', window: 'w_display_solderpaste_mgmt', group: 'quality' },
  '32': { id: '32', title: 'Stencil Mgmt', titleKo: 'Stencil 관리', window: 'w_display_stencil_mgmt', group: 'quality' },
  '34': { id: '34', title: 'Vision Defect', titleKo: '비전 불량', window: 'w_display_vision_defect', group: 'quality' },
  '37': { id: '37', title: 'Temperature Mgmt', titleKo: '온도 관리', window: 'w_display_temp_mgmt', group: 'quality' },
  '38': { id: '38', title: 'Humidity Mgmt', titleKo: '습도 관리', window: 'w_display_humidity_mgmt', group: 'quality' },
};
```

**Step 2: Create dynamic route page**

```typescript
// src/app/display/[screenId]/page.tsx
import { notFound } from 'next/navigation';
import { SCREENS } from '@/lib/screens';
import DisplayLayout from '@/components/display/DisplayLayout';

interface PageProps {
  params: Promise<{ screenId: string }>;
}

export default async function DisplayPage({ params }: PageProps) {
  const { screenId } = await params;
  const screen = SCREENS[screenId];
  if (!screen) notFound();

  return (
    <DisplayLayout title={screen.titleKo}>
      <div className="flex h-full items-center justify-center text-zinc-500">
        {screen.titleKo} - 구현 예정
      </div>
    </DisplayLayout>
  );
}
```

**Step 3: Verify routing**

Run: `npm run dev`
Navigate to: http://localhost:3000/display/24
Expected: "SMD 기계 상태 - 구현 예정" 표시, ESC 누르면 메뉴로 복귀

**Step 4: Commit**

```bash
git add src/app/display/ src/lib/screens.ts
git commit -m "feat: display route with screen registry and 100vh layout"
```

---

### Task 11: Auto-Launch Feature

**Files:**
- Create: `src/hooks/useAutoLaunch.ts`
- Modify: `src/app/page.tsx`

**Step 1: Create useAutoLaunch hook**

```typescript
// src/hooks/useAutoLaunch.ts
'use client';

import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { SCREENS } from '@/lib/screens';

const STORAGE_KEY = 'mes-display-auto-launch';

export function useAutoLaunch() {
  const router = useRouter();

  useEffect(() => {
    const screenId = localStorage.getItem(STORAGE_KEY);
    if (screenId && SCREENS[screenId]) {
      router.replace(`/display/${screenId}`);
    }
  }, [router]);
}

export function setAutoLaunch(screenId: string | null) {
  if (screenId) {
    localStorage.setItem(STORAGE_KEY, screenId);
  } else {
    localStorage.removeItem(STORAGE_KEY);
  }
}

export function getAutoLaunch(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(STORAGE_KEY);
}
```

**Step 2: Apply to page.tsx**

```typescript
// src/app/page.tsx
'use client';

import { useAutoLaunch } from '@/hooks/useAutoLaunch';
import MenuScene from '@/components/menu/MenuScene';

export default function Home() {
  useAutoLaunch();
  return <MenuScene />;
}
```

**Step 3: Commit**

```bash
git add src/hooks/useAutoLaunch.ts src/app/page.tsx
git commit -m "feat: auto-launch - skip menu and go directly to configured display"
```

---

## Phase 4: API & Data Layer (SMD Machine Status First)

### Task 12: Oracle DB Connection Pool

**Files:**
- Create: `src/lib/db.ts`

**Step 1: Install oracledb**

Run: `npm install oracledb`

**Step 2: Create connection pool**

```typescript
// src/lib/db.ts
import oracledb from 'oracledb';

let poolPromise: Promise<oracledb.Pool> | null = null;

function getPool(): Promise<oracledb.Pool> {
  if (!poolPromise) {
    poolPromise = oracledb.createPool({
      user: process.env.ORACLE_USER,
      password: process.env.ORACLE_PASSWORD,
      connectString: process.env.ORACLE_CONNECT_STRING,
      poolMin: 2,
      poolMax: 10,
      poolIncrement: 1,
    });
  }
  return poolPromise;
}

export async function executeQuery<T>(sql: string, binds: Record<string, unknown> = {}): Promise<T[]> {
  const pool = await getPool();
  const conn = await pool.getConnection();
  try {
    const result = await conn.execute(sql, binds, { outFormat: oracledb.OUT_FORMAT_OBJECT });
    return (result.rows as T[]) ?? [];
  } finally {
    await conn.close();
  }
}
```

**Step 3: Create .env.local template**

```
ORACLE_USER=
ORACLE_PASSWORD=
ORACLE_CONNECT_STRING=
```

**Step 4: Commit**

```bash
git add src/lib/db.ts
git commit -m "feat: Oracle DB connection pool with executeQuery helper"
```

---

### Task 13: SMD Machine Status API & Screen

**Files:**
- Create: `src/app/api/display/24/route.ts`
- Create: `src/lib/queries/machine-status-smd.ts`
- Create: `src/components/display/screens/MachineStatusSmd.tsx`
- Modify: `src/app/display/[screenId]/page.tsx`

**Step 1: Create SQL queries**

```typescript
// src/lib/queries/machine-status-smd.ts
export const SQL_CHECK_ITEMS = `
  SELECT /* d_display_machine_status_check_items_smd */
    -- PB DataWindow SQL을 여기에 복사
    -- SOLUM MES_DISP의 d_display_machine_status_check_items_smd.srd에서 추출
    *
  FROM dual
  WHERE 1=0
`;

export const SQL_MACHINE_STATUS = `
  SELECT /* d_display_machine_status_es */
    -- PB DataWindow SQL을 여기에 복사
    *
  FROM dual
  WHERE 1=0
`;
```

Note: 실제 SQL은 PB .srd 파일에서 추출 필요. Task 실행 시 powerbuilder-analyzer 스킬로 추출.

**Step 2: Create API route**

```typescript
// src/app/api/display/24/route.ts
import { NextResponse } from 'next/server';
import { executeQuery } from '@/lib/db';
import { SQL_CHECK_ITEMS, SQL_MACHINE_STATUS } from '@/lib/queries/machine-status-smd';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const orgId = searchParams.get('orgId') ?? '1';

  try {
    const [checkItems, machineStatus] = await Promise.all([
      executeQuery(SQL_CHECK_ITEMS, { orgId }),
      executeQuery(SQL_MACHINE_STATUS, { orgId }),
    ]);

    return NextResponse.json({ checkItems, machineStatus });
  } catch (error) {
    console.error('SMD Machine Status API error:', error);
    return NextResponse.json({ error: 'Database query failed' }, { status: 500 });
  }
}
```

**Step 3: Create screen component**

```typescript
// src/components/display/screens/MachineStatusSmd.tsx
'use client';

import useSWR from 'swr';

const fetcher = (url: string) => fetch(url).then(r => r.json());

export default function MachineStatusSmd() {
  const { data, error, isLoading } = useSWR('/api/display/24', fetcher, {
    refreshInterval: 30000, // 30초 폴링
  });

  if (isLoading) return <div className="flex h-full items-center justify-center">로딩 중...</div>;
  if (error) return <div className="flex h-full items-center justify-center text-red-500">데이터 로드 실패</div>;

  return (
    <div className="flex h-full flex-col gap-4 p-4">
      {/* 점검 항목 테이블 */}
      <section className="flex-1 overflow-y-auto rounded-lg border border-white/10 bg-black/30">
        <table className="w-full text-sm">
          <thead className="sticky top-0 bg-zinc-900">
            <tr>
              <th className="p-2 text-left">Machine</th>
              <th className="p-2 text-left">Status</th>
              <th className="p-2 text-left">Check Item</th>
            </tr>
          </thead>
          <tbody>
            {data?.checkItems?.map((item: Record<string, unknown>, i: number) => (
              <tr key={i} className="border-t border-white/5">
                <td className="p-2">{String(item.MACHINE_NAME ?? '')}</td>
                <td className="p-2">{String(item.STATUS ?? '')}</td>
                <td className="p-2">{String(item.CHECK_ITEM ?? '')}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </div>
  );
}
```

**Step 4: Wire screen component to route**

```typescript
// src/app/display/[screenId]/page.tsx 수정
// screenId === '24' 일 때 MachineStatusSmd 로드
```

**Step 5: Commit**

```bash
git add src/app/api/display/ src/lib/queries/ src/components/display/screens/ src/app/display/
git commit -m "feat: SMD Machine Status (menu 24) - API route + SWR polling + display screen"
```

---

### Task 14: Auto-Scroll Hook

**Files:**
- Create: `src/hooks/useAutoScroll.ts`

**Step 1: Create auto-scroll hook**

```typescript
// src/hooks/useAutoScroll.ts
'use client';

import { useEffect, useRef } from 'react';

interface UseAutoScrollOptions {
  containerRef: React.RefObject<HTMLElement | null>;
  enabled?: boolean;
  interval?: number; // ms
  pageSize?: number; // px to scroll per tick
}

export function useAutoScroll({ containerRef, enabled = true, interval = 5000, pageSize }: UseAutoScrollOptions) {
  const scrollDirection = useRef<'down' | 'up'>('down');

  useEffect(() => {
    if (!enabled) return;
    const container = containerRef.current;
    if (!container) return;

    const id = setInterval(() => {
      const { scrollTop, scrollHeight, clientHeight } = container;
      const scrollAmount = pageSize ?? clientHeight;

      if (scrollDirection.current === 'down') {
        if (scrollTop + clientHeight >= scrollHeight - 10) {
          scrollDirection.current = 'up';
          container.scrollTo({ top: 0, behavior: 'smooth' });
        } else {
          container.scrollBy({ top: scrollAmount, behavior: 'smooth' });
        }
      }
    }, interval);

    return () => clearInterval(id);
  }, [containerRef, enabled, interval, pageSize]);
}
```

**Step 2: Commit**

```bash
git add src/hooks/useAutoScroll.ts
git commit -m "feat: auto-scroll hook for display data tables"
```

---

## Phase 5: i18n & Polish

### Task 15: next-intl Setup

**Files:**
- Create: `src/i18n/request.ts`
- Create: `src/i18n/messages/ko.json`
- Create: `src/i18n/messages/en.json`
- Create: `src/i18n/messages/es.json`
- Modify: `next.config.ts`

**Step 1: Create message files**

각 언어별 JSON 파일. 메뉴 제목, UI 라벨, 디스플레이 헤더 등.

```json
// src/i18n/messages/ko.json
{
  "menu": {
    "management": "관리 설정",
    "monitoring": "실시간 모니터링",
    "quality": "품질 관리"
  },
  "display": {
    "loading": "로딩 중...",
    "error": "데이터 로드 실패",
    "refresh": "새로고침"
  },
  "screens": {
    "24": "SMD 기계 상태"
  }
}
```

**Step 2: Configure next-intl**

next-intl 설정. locale 감지는 localStorage 기반 (Gvs_language 패턴 유지).

**Step 3: Commit**

```bash
git add src/i18n/ next.config.ts
git commit -m "feat: i18n setup with next-intl (ko/en/es)"
```

---

## Phase Summary

| Phase | Tasks | Description |
|-------|-------|-------------|
| 1 | Task 1-2 | 의존성 설치, 루트 레이아웃, 테마 프로바이더 |
| 2 | Task 3-8 | mydesktop 메뉴 시스템 통째로 포팅 (CSS, JS, React 통합) |
| 3 | Task 9-11 | 디스플레이 공통 레이아웃, 라우팅, 자동 실행 |
| 4 | Task 12-14 | Oracle DB, SMD Machine Status API & 화면, 자동 스크롤 |
| 5 | Task 15 | i18n (ko/en/es) |

**Total: 15 Tasks**

Phase 2 (mydesktop 포팅)가 가장 크며 전체 작업의 ~60%.
핵심은 mydesktop JS를 ES module로 변환하면서 내부 로직은 그대로 유지하는 것.

---

## Key Rules (모든 태스크에 적용)

1. **100vh 고정 레이아웃** — 페이지 스크롤 절대 없음, 데이터만 내부 스크롤
2. **mydesktop 그대로** — 설정/이스터에그/3D효과 모두 유지, 카드 클릭만 라우팅으로 교체
3. **dark: 클래스 규칙** — dark: 사용 시 반드시 기본값도 함께 지정
4. **파일 크기 제한** — 페이지 300줄, 컴포넌트 200줄, 400줄 초과 시 분리
5. **JSDoc 주석** — 모든 파일에 @file, @description 필수
