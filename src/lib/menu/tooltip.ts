/**
 * @file src/lib/menu/tooltip.ts
 * @description 풍선 도움말(Tooltip) 시스템
 *
 * 초보자 가이드:
 * 1. HTML 요소에 `data-tooltip="툴팁내용"` 속성을 추가하면 작동합니다.
 * 2. `init()`을 호출하여 이벤트 리스너를 등록합니다.
 */

let tooltipEl: HTMLDivElement | null = null;

/**
 * 전역 툴팁 요소 생성
 */
function createTooltipElement(): void {
  if (tooltipEl) return;

  tooltipEl = document.createElement('div');
  tooltipEl.className = 'custom-tooltip';
  tooltipEl.style.position = 'fixed';
  tooltipEl.style.pointerEvents = 'none';
  tooltipEl.style.zIndex = '9999';
  tooltipEl.style.opacity = '0';
  tooltipEl.style.transition = 'opacity 0.2s, transform 0.2s';
  tooltipEl.style.transform = 'translate(-50%, 10px)';

  document.body.appendChild(tooltipEl);
}

/**
 * 툴팁 표시
 * @param target - 대상 요소
 * @param text - 표시할 텍스트
 */
function showTooltip(target: HTMLElement, text: string): void {
  if (!tooltipEl) createTooltipElement();
  if (!tooltipEl) return;

  // 브라우저 기본 툴팁 방지 (title 속성 임시 제거)
  if (target.hasAttribute('title')) {
    target.setAttribute('data-original-title', target.getAttribute('title') || '');
    target.removeAttribute('title');
  }

  tooltipEl.textContent = text;
  tooltipEl.style.opacity = '1';
  tooltipEl.classList.remove('is-bottom'); // 기본값: 위쪽

  const rect = target.getBoundingClientRect();
  const left = rect.left + rect.width / 2;
  
  // 툴팁 높이 측정 (임시 측정 위해 렌더링)
  const tooltipHeight = tooltipEl.offsetHeight || 40;
  const spaceAbove = rect.top;
  const isBottom = spaceAbove < tooltipHeight + 20; // 상단 공간이 부족하면 아래로

  let top: number;
  if (isBottom) {
    tooltipEl.classList.add('is-bottom');
    top = rect.bottom + 12; // 아래쪽 배치
    tooltipEl.style.transform = 'translate(-50%, 0) scale(1)';
  } else {
    top = rect.top - 12; // 위쪽 배치
    tooltipEl.style.transform = 'translate(-50%, -100%) scale(1)';
  }

  tooltipEl.style.left = `${left}px`;
  tooltipEl.style.top = `${top}px`;

  // 화면 경계 체크 (가로)
  const tooltipRect = tooltipEl.getBoundingClientRect();
  if (tooltipRect.left < 10) {
    tooltipEl.style.left = '10px';
    const currentTransform = tooltipEl.style.transform;
    tooltipEl.style.transform = currentTransform.replace('-50%', '0');
  } else if (tooltipRect.right > window.innerWidth - 10) {
    tooltipEl.style.left = `${window.innerWidth - 10}px`;
    const currentTransform = tooltipEl.style.transform;
    tooltipEl.style.transform = currentTransform.replace('-50%', '-100%');
  }
}

/**
 * 툴팁 숨기기
 */
function hideTooltip(target?: HTMLElement): void {
  if (!tooltipEl) return;
  tooltipEl.style.opacity = '0';
  tooltipEl.style.transform = 'translate(-50%, -90%) scale(0.95)';

  // 브라우저 기본 툴팁 복구
  if (target && target.hasAttribute('data-original-title')) {
    target.setAttribute('title', target.getAttribute('data-original-title') || '');
    target.removeAttribute('data-original-title');
  }
}

/**
 * 이벤트 핸들러
 */
function handleMouseOver(e: MouseEvent): void {
  const target = (e.target as HTMLElement).closest('[data-tooltip], [title]') as HTMLElement;
  if (target) {
    const text = target.getAttribute('data-tooltip') || target.getAttribute('title');
    if (text) {
      showTooltip(target, text);
    }
  }
}

function handleMouseOut(e: MouseEvent): void {
  const target = (e.target as HTMLElement).closest('[data-tooltip], [data-original-title]') as HTMLElement;
  if (target) {
    hideTooltip(target);
  }
}

/**
 * 툴팁 시스템 초기화
 */
export function init(): void {
  if (typeof window === 'undefined') return;

  document.addEventListener('mouseover', handleMouseOver);
  document.addEventListener('mouseout', handleMouseOut);
}

/**
 * 툴팁 시스템 해제
 */
export function cleanup(): void {
  if (typeof window === 'undefined') return;

  document.removeEventListener('mouseover', handleMouseOver);
  document.removeEventListener('mouseout', handleMouseOut);

  if (tooltipEl) {
    tooltipEl.remove();
    tooltipEl = null;
  }
}
