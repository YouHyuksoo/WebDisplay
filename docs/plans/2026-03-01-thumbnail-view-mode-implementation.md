# Thumbnail View Mode Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** 메뉴에 thumbnail 보기 모드를 추가하여 사용자가 업로드한 스크린샷으로 디스플레이 화면을 미리 볼 수 있게 한다.

**Architecture:** 기존 `cardLayout`에 `'thumbnail'` 값을 추가하고, 레이아웃 토글을 `grid → carousel → thumbnail → grid` 3단 순환으로 변경한다. 썸네일 카드는 2열 그리드로 배치되며, 상단에 스크린샷 이미지(또는 등록 버튼), 하단에 제목을 표시한다. 이미지는 `/api/thumbnails` API를 통해 업로드하고 `/public/thumbnails/{screenId}.png`에 저장한다.

**Tech Stack:** Next.js 15 App Router, TypeScript, sharp (이미지 리사이즈), CSS

---

### Task 1: public/thumbnails 디렉토리 생성

**Files:**
- Create: `public/thumbnails/.gitkeep`

**Step 1: 디렉토리 생성**

```bash
mkdir -p public/thumbnails
touch public/thumbnails/.gitkeep
```

**Step 2: 커밋**

```bash
git add public/thumbnails/.gitkeep
git commit -m "chore: add public/thumbnails directory for screenshot storage"
```

---

### Task 2: 이미지 업로드 API 생성

**Files:**
- Create: `src/app/api/thumbnails/route.ts`

**Step 1: sharp 의존성 설치**

```bash
npm install sharp
npm install -D @types/sharp
```

> sharp가 이미 설치되어 있으면 스킵

**Step 2: API Route 구현**

`src/app/api/thumbnails/route.ts`:

```typescript
/**
 * @file src/app/api/thumbnails/route.ts
 * @description 디스플레이 화면 스크린샷 업로드 API
 *
 * 초보자 가이드:
 * 1. POST 요청으로 screenId + 이미지 파일을 전송
 * 2. sharp로 640×400 리사이즈 후 /public/thumbnails/{screenId}.png 저장
 * 3. DB 연결 없이 정적 파일만 사용
 */

import { NextRequest, NextResponse } from 'next/server';
import sharp from 'sharp';
import path from 'path';
import { writeFile, mkdir } from 'fs/promises';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const screenId = formData.get('screenId') as string;
    const file = formData.get('file') as File;

    if (!screenId || !file) {
      return NextResponse.json(
        { success: false, error: 'screenId와 file이 필요합니다' },
        { status: 400 },
      );
    }

    // 이미지 파일 검증
    if (!file.type.startsWith('image/')) {
      return NextResponse.json(
        { success: false, error: '이미지 파일만 업로드 가능합니다' },
        { status: 400 },
      );
    }

    // 파일 크기 제한 (10MB)
    if (file.size > 10 * 1024 * 1024) {
      return NextResponse.json(
        { success: false, error: '파일 크기는 10MB 이하여야 합니다' },
        { status: 400 },
      );
    }

    // screenId 검증 (숫자만)
    if (!/^\d+$/.test(screenId)) {
      return NextResponse.json(
        { success: false, error: '유효하지 않은 screenId입니다' },
        { status: 400 },
      );
    }

    const buffer = Buffer.from(await file.arrayBuffer());

    // sharp로 리사이즈 (640×400)
    const resized = await sharp(buffer)
      .resize(640, 400, { fit: 'cover' })
      .png()
      .toBuffer();

    // 저장 경로
    const thumbnailDir = path.join(process.cwd(), 'public', 'thumbnails');
    await mkdir(thumbnailDir, { recursive: true });

    const filePath = path.join(thumbnailDir, `${screenId}.png`);
    await writeFile(filePath, resized);

    return NextResponse.json({
      success: true,
      path: `/thumbnails/${screenId}.png`,
    });
  } catch (error) {
    console.error('Thumbnail upload error:', error);
    return NextResponse.json(
      { success: false, error: '이미지 업로드에 실패했습니다' },
      { status: 500 },
    );
  }
}
```

**Step 3: 빌드 확인**

```bash
npm run build
```

빌드 에러가 없는지 확인.

**Step 4: 커밋**

```bash
git add src/app/api/thumbnails/route.ts package.json package-lock.json
git commit -m "feat: add thumbnail upload API with sharp resize"
```

---

### Task 3: 썸네일 카드 CSS 스타일

**Files:**
- Create: `src/styles/menu/components-thumbnail.css`
- Modify: `src/app/(menu)/menu-theme.css` — CSS import 추가

**Step 1: CSS 파일 생성**

`src/styles/menu/components-thumbnail.css`:

```css
/**
 * @file src/styles/menu/components-thumbnail.css
 * @description 썸네일 보기 모드 카드 스타일
 *
 * 초보자 가이드:
 * 1. .thumbnail-layout 클래스가 .section-cards에 추가됨
 * 2. 2열 그리드, 각 카드 320×200px
 * 3. 카드 구성: 상단 이미지(~160px) + 하단 제목(~40px)
 */

/* === 썸네일 레이아웃 그리드 === */
.section-cards.thumbnail-layout {
  display: grid !important;
  grid-template-columns: repeat(2, 320px);
  gap: 16px;
  justify-content: center;
  align-content: start;
  padding: 20px;
  max-height: calc(100vh - 200px);
  overflow-y: auto;
  overflow-x: hidden;
}

/* === 썸네일 카드 === */
.thumbnail-layout .shortcut-card {
  width: 320px;
  height: 200px;
  display: flex;
  flex-direction: column;
  padding: 0;
  overflow: hidden;
  cursor: pointer;
  position: relative;
}

/* 이미지 영역 */
.thumbnail-layout .thumbnail-image-area {
  flex: 1;
  min-height: 0;
  position: relative;
  background: rgba(255, 255, 255, 0.03);
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
}

.thumbnail-layout .thumbnail-image-area img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

/* 이미지 미등록 상태 */
.thumbnail-layout .thumbnail-placeholder {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 8px;
  color: var(--text-secondary, rgba(255, 255, 255, 0.5));
  font-size: 12px;
}

.thumbnail-layout .thumbnail-placeholder svg {
  width: 32px;
  height: 32px;
  opacity: 0.4;
}

/* 이미지 등록/변경 버튼 */
.thumbnail-layout .thumbnail-upload-btn {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  padding: 6px 14px;
  background: rgba(0, 0, 0, 0.7);
  backdrop-filter: blur(8px);
  border: 1px solid rgba(255, 215, 0, 0.4);
  border-radius: 8px;
  color: var(--accent, #ffd700);
  font-size: 12px;
  cursor: pointer;
  opacity: 0;
  transition: opacity 0.2s ease;
  z-index: 5;
}

/* 미등록 상태에서는 항상 표시 */
.thumbnail-layout .thumbnail-image-area.empty .thumbnail-upload-btn {
  opacity: 1;
}

/* 등록된 상태에서 호버 시 오버레이 + 버튼 표시 */
.thumbnail-layout .thumbnail-image-area:not(.empty):hover .thumbnail-upload-btn {
  opacity: 1;
}

.thumbnail-layout .thumbnail-image-area:not(.empty):hover::after {
  content: '';
  position: absolute;
  inset: 0;
  background: rgba(0, 0, 0, 0.5);
  z-index: 4;
}

.thumbnail-upload-btn:hover {
  background: rgba(0, 0, 0, 0.85);
  border-color: var(--accent, #ffd700);
}

/* 제목 영역 */
.thumbnail-layout .thumbnail-title {
  height: 40px;
  display: flex;
  align-items: center;
  padding: 0 12px;
  font-size: 13px;
  font-weight: 500;
  color: var(--text-primary, rgba(255, 255, 255, 0.9));
  border-top: 1px solid rgba(255, 255, 255, 0.08);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

/* 기존 카드 내부 요소 숨김 (썸네일 모드에서는 별도 구조 사용) */
.thumbnail-layout .shortcut-icon,
.thumbnail-layout .shortcut-title,
.thumbnail-layout .shortcut-url,
.thumbnail-layout .card-actions {
  display: none;
}

/* === 스크롤바 스타일 === */
.section-cards.thumbnail-layout::-webkit-scrollbar {
  width: 4px;
}

.section-cards.thumbnail-layout::-webkit-scrollbar-track {
  background: transparent;
}

.section-cards.thumbnail-layout::-webkit-scrollbar-thumb {
  background: rgba(255, 215, 0, 0.2);
  border-radius: 2px;
}

/* === 반응형 === */
@media (max-width: 768px) {
  .section-cards.thumbnail-layout {
    grid-template-columns: 1fr;
    padding: 12px;
  }

  .thumbnail-layout .shortcut-card {
    width: 100%;
    height: 180px;
  }
}
```

**Step 2: menu-theme.css에 import 추가**

`src/app/(menu)/menu-theme.css`에 `components-thumbnail.css` import를 `responsive.css` 바로 앞에 추가:

```css
@import "../../styles/menu/components-thumbnail.css";
@import "../../styles/menu/responsive.css";
```

**Step 3: 커밋**

```bash
git add src/styles/menu/components-thumbnail.css src/app/(menu)/menu-theme.css
git commit -m "feat: add thumbnail card CSS styles and layout"
```

---

### Task 4: 썸네일 카드 렌더링 함수

**Files:**
- Modify: `src/lib/menu/cards.ts` — `createThumbnailCard()` 함수 추가, `renderAllCards()`에 thumbnail 분기 추가

**Step 1: createThumbnailCard 함수 추가**

`src/lib/menu/cards.ts`에 `createCard()` 함수 뒤에 추가:

```typescript
/**
 * 썸네일 모드 카드 DOM 요소 생성
 * @param shortcut - 바로가기 데이터
 * @param index - 카드 인덱스
 * @returns 썸네일 카드 DOM 요소
 */
export function createThumbnailCard(shortcut: Shortcut, index = 0): HTMLDivElement {
  const card = document.createElement('div');
  card.className = 'shortcut-card';

  if (state.cardStyle !== 'glass') {
    card.classList.add('style-' + state.cardStyle);
  }

  if (state.cardStyle === 'rainbow') {
    const color = RAINBOW_COLORS[index % RAINBOW_COLORS.length];
    card.style.setProperty('--rainbow-r', String(color.r));
    card.style.setProperty('--rainbow-g', String(color.g));
    card.style.setProperty('--rainbow-b', String(color.b));
  }

  card.dataset.id = shortcut.id;
  card.style.setProperty('--card-color', shortcut.color);

  // screenId 추출 (url에서 /display/XX 형태)
  const screenIdMatch = shortcut.url.match(/\/display\/(\d+)/);
  const screenId = screenIdMatch ? screenIdMatch[1] : '';
  const thumbnailSrc = screenId ? `/thumbnails/${screenId}.png` : '';
  const hasImage = !!screenId;

  // 이미지 영역
  const imageArea = document.createElement('div');
  imageArea.className = 'thumbnail-image-area';
  if (!hasImage) imageArea.classList.add('empty');

  if (hasImage) {
    const img = document.createElement('img');
    img.src = `${thumbnailSrc}?t=${Date.now()}`;
    img.alt = shortcut.title;
    img.loading = 'lazy';
    img.onerror = () => {
      img.remove();
      imageArea.classList.add('empty');
      imageArea.insertBefore(createPlaceholder(), uploadBtn);
    };
    imageArea.appendChild(img);
  } else {
    imageArea.appendChild(createPlaceholder());
  }

  // 업로드 버튼
  const uploadBtn = document.createElement('button');
  uploadBtn.className = 'thumbnail-upload-btn';
  uploadBtn.textContent = hasImage ? '이미지 변경' : '이미지 등록';
  uploadBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    triggerThumbnailUpload(screenId, card);
  });
  imageArea.appendChild(uploadBtn);

  // 제목 영역
  const titleArea = document.createElement('div');
  titleArea.className = 'thumbnail-title';
  titleArea.textContent = shortcut.title;

  card.appendChild(imageArea);
  card.appendChild(titleArea);

  // 클릭 - 디스플레이 화면 열기
  card.addEventListener('click', () => {
    const parent = card.closest('.section-cards');
    if (!parent?.classList.contains('active')) return;

    window.dispatchEvent(
      new CustomEvent('mes-navigate', {
        detail: { url: shortcut.url, title: shortcut.title },
      }),
    );

    import('./lanes').then((Lanes) => {
      if (Lanes.addToHistory) {
        Lanes.addToHistory(shortcut);
      }
    });
  });

  return card;
}

/** 이미지 미등록 placeholder */
function createPlaceholder(): HTMLElement {
  const placeholder = document.createElement('div');
  placeholder.className = 'thumbnail-placeholder';
  placeholder.innerHTML = `
    <svg viewBox="0 0 24 24" fill="currentColor">
      <path d="M21 19V5c0-1.1-.9-2-2-2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2zM8.5 13.5l2.5 3.01L14.5 12l4.5 6H5l3.5-4.5z"/>
    </svg>
    <span>스크린샷 미등록</span>
  `;
  return placeholder;
}

/** 이미지 업로드 트리거 */
function triggerThumbnailUpload(screenId: string, card: HTMLDivElement): void {
  if (!screenId) {
    import('./ui').then(({ showToast }) => showToast('이 화면은 이미지 등록을 지원하지 않습니다'));
    return;
  }

  const input = document.createElement('input');
  input.type = 'file';
  input.accept = 'image/*';
  input.onchange = async () => {
    const file = input.files?.[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('screenId', screenId);
    formData.append('file', file);

    try {
      const res = await fetch('/api/thumbnails', { method: 'POST', body: formData });
      const data = await res.json();

      if (data.success) {
        // 이미지 영역 갱신
        const imageArea = card.querySelector('.thumbnail-image-area');
        if (imageArea) {
          imageArea.classList.remove('empty');
          const placeholder = imageArea.querySelector('.thumbnail-placeholder');
          if (placeholder) placeholder.remove();

          let img = imageArea.querySelector('img');
          if (!img) {
            img = document.createElement('img');
            img.alt = card.querySelector('.thumbnail-title')?.textContent || '';
            img.loading = 'lazy';
            imageArea.insertBefore(img, imageArea.querySelector('.thumbnail-upload-btn'));
          }
          img.src = `${data.path}?t=${Date.now()}`;

          const btn = imageArea.querySelector('.thumbnail-upload-btn');
          if (btn) btn.textContent = '이미지 변경';
        }

        import('./ui').then(({ showToast }) => showToast('스크린샷이 등록되었습니다'));
      } else {
        import('./ui').then(({ showToast }) => showToast(data.error || '업로드 실패'));
      }
    } catch {
      import('./ui').then(({ showToast }) => showToast('업로드 중 오류가 발생했습니다'));
    }
  };
  input.click();
}
```

**Step 2: renderAllCards()에 thumbnail 분기 추가**

`src/lib/menu/cards.ts`의 `renderAllCards()` 함수에서 기존 `isCarousel` 체크 부분을 수정:

```typescript
const isCarousel = state.cardLayout === 'carousel';
const isThumbnail = state.cardLayout === 'thumbnail';
```

섹션 생성 루프에서:

```typescript
if (isCarousel) {
  sectionDiv.classList.add('carousel-layout');
}
if (isThumbnail) {
  sectionDiv.classList.add('thumbnail-layout');
}

// 카드 렌더링 (carousel은 나중에 renderCarouselSlots에서 처리)
if (!isCarousel) {
  const sectionShortcuts = state.shortcuts.filter(
    (s) => s.layer === section.id,
  );
  sectionShortcuts.forEach((shortcut, i) => {
    const cardEl = isThumbnail
      ? createThumbnailCard(shortcut, i)
      : createCard(shortcut, i);
    sectionDiv.appendChild(cardEl);
  });
}
```

하단의 캐러셀 초기화 분기도 수정:

```typescript
if (isCarousel) {
  state.carouselIndex = 0;
  import('./carousel').then((Carousel) => {
    Carousel.renderCarouselSlots();
    Carousel.updateCarouselUI();
  });
} else {
  import('./carousel').then((Carousel) => {
    Carousel.hideCarouselUI();
  });
}
```

(thumbnail 모드는 `isCarousel`이 false이므로 기존 else 분기 진입 — 캐러셀 UI 숨김)

**Step 3: 빌드 확인**

```bash
npm run build
```

**Step 4: 커밋**

```bash
git add src/lib/menu/cards.ts
git commit -m "feat: add thumbnail card creation and rendering in cards.ts"
```

---

### Task 5: 레이아웃 토글 3단 순환 + 아이콘

**Files:**
- Modify: `src/lib/menu/handlers/index.ts` — 레이아웃 토글 `grid → carousel → thumbnail → grid`
- Modify: `src/lib/menu/carousel.ts` — `changeCardLayout()`에 thumbnail 토스트 추가, `updateCardLayoutLabel()` 수정
- Modify: `src/components/menu/MenuControls.tsx` — thumbnail 아이콘 SVG 추가

**Step 1: handlers/index.ts 레이아웃 토글 수정**

기존 코드 (line 411-422):

```typescript
// ===== 레이아웃 전환 (그리드 <-> 캐러셀) =====
document.getElementById('layout-toggle-btn')?.addEventListener('click', () => {
  const next = state.cardLayout === 'grid' ? 'carousel' : 'grid';
  import('../carousel').then((C) => C.changeCardLayout(next));
  // 아이콘 토글
  const gridIcon = document.getElementById('layout-icon-grid');
  const carouselIcon = document.getElementById('layout-icon-carousel');
  if (gridIcon && carouselIcon) {
    gridIcon.style.display = next === 'grid' ? '' : 'none';
    carouselIcon.style.display = next === 'carousel' ? '' : 'none';
  }
});
```

변경 후:

```typescript
// ===== 레이아웃 전환 (그리드 → 캐러셀 → 썸네일 → 그리드) =====
document.getElementById('layout-toggle-btn')?.addEventListener('click', () => {
  const order = ['grid', 'carousel', 'thumbnail'] as const;
  const currentIdx = order.indexOf(state.cardLayout as typeof order[number]);
  const next = order[(currentIdx + 1) % order.length];
  import('../carousel').then((C) => C.changeCardLayout(next));
  // 아이콘 토글
  const gridIcon = document.getElementById('layout-icon-grid');
  const carouselIcon = document.getElementById('layout-icon-carousel');
  const thumbnailIcon = document.getElementById('layout-icon-thumbnail');
  if (gridIcon) gridIcon.style.display = next === 'grid' ? '' : 'none';
  if (carouselIcon) carouselIcon.style.display = next === 'carousel' ? '' : 'none';
  if (thumbnailIcon) thumbnailIcon.style.display = next === 'thumbnail' ? '' : 'none';
});
```

**Step 2: carousel.ts changeCardLayout 수정**

`changeCardLayout()` 함수의 토스트 메시지 수정:

```typescript
const toastMap: Record<string, string> = {
  carousel: '🎠 캐러셀 배치',
  grid: '📦 그리드 배치',
  thumbnail: '🖼️ 썸네일 배치',
};
showToast(toastMap[layout] || layout);
```

`updateCardLayoutLabel()` 수정:

```typescript
export function updateCardLayoutLabel(): void {
  const label = document.getElementById('card-layout-label');
  if (label) {
    const labelMap: Record<string, string> = {
      carousel: '배치: 캐러셀',
      grid: '배치: 그리드',
      thumbnail: '배치: 썸네일',
    };
    label.textContent = labelMap[state.cardLayout] || `배치: ${state.cardLayout}`;
  }
}
```

**Step 3: MenuControls.tsx 썸네일 아이콘 추가**

`#layout-toggle-btn` 안에 세 번째 SVG 아이콘 추가 (기존 grid/carousel 아이콘 뒤):

```tsx
<svg id="layout-icon-thumbnail" viewBox="0 0 24 24" fill="currentColor" style={{ display: 'none' }}>
  <path d="M21 19V5c0-1.1-.9-2-2-2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2zM8.5 13.5l2.5 3.01L14.5 12l4.5 6H5l3.5-4.5z" />
</svg>
```

**Step 4: 빌드 확인**

```bash
npm run build
```

**Step 5: 커밋**

```bash
git add src/lib/menu/handlers/index.ts src/lib/menu/carousel.ts src/components/menu/MenuControls.tsx
git commit -m "feat: 3-way layout toggle (grid/carousel/thumbnail) with icons"
```

---

### Task 6: 설정 저장/복원에서 thumbnail 지원 확인

**Files:**
- 확인: `src/lib/menu/storage.ts` — `DEFAULT_SETTINGS.cardLayout`
- 확인: `src/lib/menu/init.ts` — `state.cardLayout` 로드
- 확인: `src/lib/menu/ui.ts` — `saveSettings()` 호출

**Step 1: 기존 코드 확인**

이미 `cardLayout`은 `string` 타입이므로 `'thumbnail'` 값이 자연스럽게 저장/복원됩니다.

- `storage.ts`: `DEFAULT_SETTINGS.cardLayout = 'grid'` — 기본값은 grid (OK)
- `init.ts`: `state.cardLayout = settings.cardLayout` — 문자열 그대로 복원 (OK)
- `ui.ts`: `saveSettings()` — `cardLayout: state.cardLayout` 저장 (OK)

**추가 변경 불필요.** 타입이 `string`이므로 `'thumbnail'`이 자동 호환됨.

**Step 2: init.ts에서 초기 아이콘 상태 설정 확인**

`initMenuSystem()`에서 `updateCardLayoutLabel()`이 호출되므로 라벨은 OK.
하지만 레이아웃 토글 버튼의 아이콘 초기 상태는 `initEventListeners()` 이후에 설정해야 함.

`src/lib/menu/handlers/index.ts`의 `initEventListeners()` 함수 끝에 초기 아이콘 상태를 설정하는 코드 추가:

```typescript
// 레이아웃 아이콘 초기 상태
const gridIcon = document.getElementById('layout-icon-grid');
const carouselIcon = document.getElementById('layout-icon-carousel');
const thumbnailIcon = document.getElementById('layout-icon-thumbnail');
if (gridIcon) gridIcon.style.display = state.cardLayout === 'grid' ? '' : 'none';
if (carouselIcon) carouselIcon.style.display = state.cardLayout === 'carousel' ? '' : 'none';
if (thumbnailIcon) thumbnailIcon.style.display = state.cardLayout === 'thumbnail' ? '' : 'none';
```

**Step 3: 커밋**

```bash
git add src/lib/menu/handlers/index.ts
git commit -m "feat: set initial layout icon state on startup"
```

---

### Task 7: 통합 테스트 및 최종 점검

**Step 1: 개발 서버 실행**

```bash
npm run dev
```

**Step 2: 기능 테스트 체크리스트**

- [ ] 레이아웃 토글 버튼이 grid → carousel → thumbnail → grid 순으로 전환되는지 확인
- [ ] 썸네일 모드에서 카드가 2열 그리드로 표시되는지 확인
- [ ] 이미지 미등록 카드에 "이미지 등록" 버튼이 보이는지 확인
- [ ] 이미지 등록 버튼 클릭 시 파일 선택 다이얼로그가 열리는지 확인
- [ ] 이미지 업로드 후 카드에 스크린샷이 표시되는지 확인
- [ ] 이미지가 있는 카드에 호버 시 "이미지 변경" 버튼이 나타나는지 확인
- [ ] 카드 클릭 시 해당 디스플레이 화면으로 이동하는지 확인
- [ ] 모드 전환 후 새로고침해도 thumbnail 모드가 유지되는지 확인
- [ ] 토스트 메시지가 올바르게 표시되는지 확인
- [ ] 캐러셀 모드로 전환 시 캐러셀 UI(화살표, 점)가 정상 표시되는지 확인

**Step 3: 최종 커밋**

모든 테스트 통과 후:

```bash
git add -A
git commit -m "feat: complete thumbnail view mode with image upload"
```
