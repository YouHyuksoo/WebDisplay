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
import { t } from '../i18n';

/**
 * 아이콘 색상 모드 전환
 */
export function toggleIconColor(): void {
  state.iconColorMode = state.iconColorMode === 'brand' ? 'white' : 'brand';
  saveSettings();

  import('../cards').then((Cards) => {
    Cards.renderCards();
  });

  showToast(state.iconColorMode === 'brand' ? t('menuUI.toastBrandColor') : t('menuUI.toastWhiteIcon'));
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
    tunnel: t('menuUI.toastTunnel'),
    warp: t('menuUI.toastWarp'),
    aurora: t('menuUI.toastAurora'),
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
    triangle: t('menuUI.shapeTriangle'),
    circle: t('menuUI.shapeCircle'),
    square: t('menuUI.shapeSquare'),
    hexagon: t('menuUI.shapeHexagon'),
    star: t('menuUI.shapeStar'),
    infinity: t('menuUI.shapeInfinity'),
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
    glass: t('menuUI.styleGlass'),
    rainbow: t('menuUI.styleRainbow'),
    gradient: t('menuUI.styleGradient'),
    dark: t('menuUI.styleDark'),
    neon: t('menuUI.styleNeon'),
    hermes: t('menuUI.styleHermes'),
    cyberpunk: t('menuUI.styleCyberpunk'),
    apple: t('menuUI.styleApple'),
    luxury: t('menuUI.styleLuxury'),
  };
  showToast(styleNames[style] || style);
}
