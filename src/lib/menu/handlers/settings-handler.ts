/**
 * @file src/lib/menu/handlers/settings-handler.ts
 * @description 설정 변경 핸들러 (아이콘 색상, 공간 타입, 터널 모양, 카드 스타일)
 *
 * 초보자 가이드:
 * 1. **주요 개념**: 사용자 설정 변경 (공간 타입, 터널 모양, 카드 스타일 등)
 * 2. **사용 방법**: `import { changeSpaceType, changeTunnelShape } from './settings-handler'`
 * 3. **의존성**: state, ui, space modules (lazy)
 *
 * 원본: mydesktop/js/handlers/settings-handler.js (App.Handlers)
 * 변경점: `App.Handlers.xxx` -> named export
 */

import { state } from '../state';
import {
  showToast,
  saveSettings,
  updateSpaceMenu,
  updateTunnelMenu,
  hideTunnelSubmenu,
  updateCardStyleMenu,
  hideCardStyleSubmenu,
  hideSettingsMenu,
} from '../ui';

/**
 * 아이콘 색상 모드 전환
 */
export function toggleIconColor(): void {
  state.iconColorMode = state.iconColorMode === 'brand' ? 'white' : 'brand';
  saveSettings();

  import('../cards').then((Cards) => {
    Cards.renderCards();
  });

  showToast(state.iconColorMode === 'brand' ? '\uD83C\uDFA8 브랜드 색상' : '\u26AA 흰색 아이콘');
}

/**
 * 공간 타입 전환 (tunnel -> warp -> aurora -> tunnel)
 */
export function changeSpaceType(): void {
  const spaceTypes = ['tunnel', 'warp', 'aurora'];
  const currentIndex = spaceTypes.indexOf(state.spaceType);
  const newIndex = (currentIndex + 1) % spaceTypes.length;
  const newType = spaceTypes[newIndex];

  state.spaceType = newType;
  saveSettings();

  // Space 모듈은 lazy import로 사용
  import('../space/index').then((Space) => {
    Space.clearSpace();
    if (newType === 'warp') {
      Space.createCosmicWarp();
    } else if (newType === 'aurora') {
      Space.createAurora();
    } else {
      Space.createTunnel();
    }
  });

  updateSpaceMenu();

  const toastMessages: Record<string, string> = {
    tunnel: '\uD83D\uDD3A 클래식 터널',
    warp: '\uD83C\uDF0C 코스믹 워프',
    aurora: '\u2728 오로라',
  };
  showToast(toastMessages[newType]);
  hideSettingsMenu();
}

/**
 * 터널 모양 변경
 * @param shape - 터널 모양
 */
export function changeTunnelShape(shape: string): void {
  state.tunnelShape = shape;
  saveSettings();

  if (state.spaceType === 'tunnel') {
    import('../space/index').then((Space) => {
      Space.clearSpace();
      Space.createTunnel();
    });
  }

  updateTunnelMenu();
  hideTunnelSubmenu();

  const shapeNames: Record<string, string> = {
    triangle: '\uD83D\uDD3A 삼각형',
    circle: '\u2B55 원형',
    square: '\u2B1C 사각형',
    hexagon: '\u2B21 육각형',
    star: '\u2B50 별',
    infinity: '\u221E 무한',
  };
  showToast(shapeNames[shape] || shape);
}

/**
 * 카드 스타일 변경
 * @param style - 카드 스타일
 */
export function changeCardStyle(style: string): void {
  state.cardStyle = style;
  saveSettings();

  import('../cards').then((Cards) => {
    Cards.renderCards();
  });

  updateCardStyleMenu();
  hideCardStyleSubmenu();

  const styleNames: Record<string, string> = {
    glass: '\uD83D\uDD2E 글래스',
    rainbow: '\uD83C\uDF08 무지개',
    gradient: '\uD83C\uDFA8 그라데이션',
    dark: '\uD83C\uDF11 다크',
    neon: '\uD83D\uDCA1 네온',
    hermes: '\uD83E\uDDE1 헤르메스',
    cyberpunk: '\uD83E\uDD16 사이버펑크',
    apple: '\uD83C\uDF4E 애플',
    luxury: '\uD83D\uDC8E 럭셔리',
  };
  showToast(styleNames[style] || style);
}
