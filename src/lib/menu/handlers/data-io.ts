/**
 * @file src/lib/menu/handlers/data-io.ts
 * @description 데이터 내보내기/가져오기 (백업/복원)
 *
 * 초보자 가이드:
 * 1. **주요 개념**: JSON 파일로 데이터 백업 및 복원
 * 2. **사용 방법**: `import { exportData, importData } from './data-io'`
 * 3. **의존성**: state, ui, storage, categories, cards (lazy)
 *
 * 원본: mydesktop/js/handlers/data-io.js (App.Handlers)
 * 변경점: `App.Handlers.xxx` -> named export
 */

import { state } from '../state';
import {
  showToast,
  showConfirm,
  hideSettingsMenu,
  saveSettings,
  applyGlowTheme,
} from '../ui';
import * as Storage from '../storage';
import { t } from '../i18n';

/**
 * 데이터 내보내기 (JSON 파일 다운로드)
 */
export function exportData(): void {
  hideSettingsMenu();

  const data = {
    version: '1.0',
    exportedAt: new Date().toISOString(),
    shortcuts: state.shortcuts,
    categories: Storage.loadCategories(),
    settings: {
      tunnelShape: state.tunnelShape,
      glowTheme: state.glowTheme,
      iconColorMode: state.iconColorMode,
      cardStyle: state.cardStyle,
      spaceType: state.spaceType,
      cardLayout: state.cardLayout,
    },
    history: JSON.parse(localStorage.getItem('mydesktop-history') || '[]'),
  };

  const json = JSON.stringify(data, null, 2);
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);

  const a = document.createElement('a');
  a.href = url;
  a.download = `mydesktop-backup-${new Date().toISOString().slice(0, 10)}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);

  showToast(t('menuUI.exportComplete'));
}

/**
 * 데이터 가져오기 (JSON 파일 복원)
 */
export function importData(): void {
  hideSettingsMenu();

  const input = document.createElement('input');
  input.type = 'file';
  input.accept = '.json';

  input.onchange = (e: Event) => {
    const target = e.target as HTMLInputElement;
    const file = target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const result = event.target?.result;
        if (typeof result !== 'string') return;

        const data = JSON.parse(result);

        if (!data.version) {
          showToast(t('menuUI.importInvalidFile'));
          return;
        }

        const confirmed = await showConfirm(t('menuUI.importConfirm'), { title: t('menuUI.dataImportTitle'), danger: true });
        if (!confirmed) return;

        // 데이터 복원
        if (data.shortcuts) {
          state.shortcuts = data.shortcuts;
          Storage.saveShortcuts(data.shortcuts);
        }

        if (data.categories) {
          Storage.saveCategories(data.categories);
          import('../categories').then((Categories) => {
            Categories.load();
          });
        }

        if (data.settings) {
          state.tunnelShape = data.settings.tunnelShape || 'triangle';
          state.glowTheme = data.settings.glowTheme || 'gold';
          state.iconColorMode = data.settings.iconColorMode || 'brand';
          state.cardStyle = data.settings.cardStyle || 'glass';
          state.spaceType = data.settings.spaceType || 'tunnel';
          state.cardLayout = data.settings.cardLayout || 'carousel';
          saveSettings();
        }

        if (data.history) {
          localStorage.setItem('mydesktop-history', JSON.stringify(data.history));
          if (state.laneData) {
            state.laneData.left = data.history;
          }
        }

        // UI 새로고침
        import('../cards').then((Cards) => {
          Cards.renderCards();
        });
        applyGlowTheme(state.glowTheme);
        import('../categories').then((Categories) => {
          Categories.updateCategorySelect();
        });

        showToast(t('menuUI.importComplete'));
      } catch (err) {
        console.error('Import error:', err);
        showToast(t('menuUI.importReadFail'));
      }
    };

    reader.readAsText(file);
  };

  input.click();
}
