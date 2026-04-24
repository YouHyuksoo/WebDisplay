/**
 * @file src/components/menu/MenuModals.tsx
 * @description 모달 다이얼로그 모음 - 바로가기, 카테고리, 북마크, 프로토콜, 범용 다이얼로그
 *
 * 초보자 가이드:
 * 1. **주요 개념**: mydesktop의 모달 HTML 구조를 JSX로 변환
 * 2. **사용 방법**: MenuScene에서 import하여 렌더링
 * 3. **중요**: 모든 ID는 원본과 동일 유지 (JS 모듈이 getElementById 사용)
 */

'use client';

import { Lightbulb, Paperclip, Link as LinkIcon, Download, Plus, ArrowUp, Clipboard } from 'lucide-react';
import { useTranslations } from 'next-intl';

/**
 * 바로가기 모달 + 카테고리 모달 + 북마크 가져오기 + 프로토콜 설정 + 범용 다이얼로그
 */
export default function MenuModals() {
  const t = useTranslations('menuUI.modals');
  return (
    <>
      {/* 바로가기 추가/수정 모달 */}
      <div className="modal-overlay" id="shortcut-modal">
        <div className="modal">
          <h2 className="modal-title" id="modal-title">{t('addShortcut')}</h2>
          <div className="modal-field">
            <label>{t('fieldTitle')}</label>
            <input type="text" id="shortcut-title" placeholder="Google" />
          </div>
          <div className="modal-field">
            <label>{t('fieldUrl')}</label>
            <input type="url" id="shortcut-url" placeholder="https://google.com" />
          </div>
          <div className="modal-field">
            <label>{t('fieldCategory')}</label>
            <select id="shortcut-layer">
              <option value="0">{t('favorites')}</option>
            </select>
          </div>
          <div className="modal-field">
            <label>{t('fieldIcon')}</label>
            <input type="text" id="shortcut-icon" placeholder="si:google" />
            <div className="icon-help">
              <small style={{ display: 'flex', alignItems: 'center', gap: '4px', marginBottom: '4px' }}>
                <Lightbulb size={12} /> {t.rich('iconHintFormat', { strong: (chunks) => <strong>{chunks}</strong> })}
              </small>
              <small style={{ display: 'flex', alignItems: 'center', gap: '4px', marginBottom: '4px' }}>
                <Paperclip size={12} />{' '}
                <a href="https://simpleicons.org" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--accent)' }}>
                  simpleicons.org
                </a>
                {t('iconHintSearch')}
              </small>
              <small style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <LinkIcon size={12} /> {t('iconHintUrl')}
              </small>
            </div>
          </div>
          <div className="modal-field">
            <label>{t('fieldColor')}</label>
            <div className="color-picker-wrapper" id="color-picker" />
          </div>
          <div className="modal-actions">
            <button className="modal-btn secondary" id="modal-cancel">{t('cancel')}</button>
            <button className="modal-btn danger" id="modal-delete" style={{ display: 'none' }}>{t('delete')}</button>
            <button className="modal-btn primary" id="modal-save">{t('save')}</button>
          </div>
        </div>
      </div>

      {/* 카테고리 관리 모달 */}
      <div className="modal-overlay" id="category-modal">
        <div className="modal category-modal">
          <h2 className="modal-title">{t('categoryManage')}</h2>
          <div className="category-list" id="category-list" />
          <button className="add-category-btn" id="add-category-btn">{t('newCategoryBtn')}</button>
          <div className="modal-actions">
            <button className="modal-btn secondary" id="category-modal-close">{t('close')}</button>
          </div>
        </div>
      </div>

      {/* 카테고리 편집 다이얼로그 */}
      <div className="modal-overlay" id="category-edit-dialog">
        <div className="modal">
          <h2 className="modal-title" id="category-edit-title">{t('newCategory')}</h2>
          <div className="modal-field">
            <label>{t('fieldName')}</label>
            <input type="text" id="category-name-input" placeholder="CATEGORY" />
          </div>
          <div className="modal-field">
            <label>{t('fieldDesc')}</label>
            <input type="text" id="category-subtitle-input" placeholder="Description" />
          </div>
          <div className="modal-field">
            <label>{t('fieldIconSymbol')}</label>
            <input type="text" id="category-icon-input" placeholder="◻" maxLength={2} />
          </div>
          <div className="modal-actions">
            <button className="modal-btn secondary" id="category-edit-cancel">{t('cancel')}</button>
            <button className="modal-btn primary" id="category-edit-save">{t('save')}</button>
          </div>
        </div>
      </div>

      {/* 북마크 가져오기 모달 */}
      <div className="modal-overlay" id="import-modal">
        <div className="modal import-modal">
          <h2 className="modal-title">{t('importBookmarks')}</h2>
          <p className="import-description">
            {t('importBookmarksDesc')}
          </p>
          <div className="import-dropzone" id="import-dropzone">
            <div className="dropzone-icon">
              <Download size={48} />
            </div>
            <div className="dropzone-text">
              {t.rich('dropzoneText', { br: () => <br /> })}
            </div>
          </div>
          <input type="file" id="bookmark-file" accept=".html" hidden />
          <div className="import-preview" id="import-preview" />
        </div>
      </div>

      {/* 프로토콜 핸들러 설정 모달 */}
      <div className="modal-overlay" id="protocol-modal">
        <div className="modal protocol-modal">
          <h2 className="modal-title" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <LinkIcon size={24} /> {t('quickAddSettings')}
          </h2>
          <p className="protocol-description">
            {t('quickAddDesc')}
          </p>
          <div className="modal-field">
            <label>{t('mydesktopUrlLabel')}</label>
            <input type="url" id="protocol-base-url" placeholder="https://your-domain.com/mydesktop/" />
            <small className="protocol-url-hint">
              {t('localFileWarning')}
            </small>
          </div>
          <div className="bookmarklet-container" id="bookmarklet-container" style={{ display: 'none' }}>
            <a href="#" id="bookmarklet-link" className="bookmarklet-btn" onClick={(e) => e.preventDefault()} style={{ display: 'flex', alignItems: 'center', gap: '8px', justifyContent: 'center' }}>
              <Plus size={16} /> Add to MyDesktop
            </a>
            <div className="bookmarklet-hint" style={{ display: 'flex', alignItems: 'center', gap: '4px', justifyContent: 'center' }}>
              <ArrowUp size={14} /> {t('dragToBookmarkBar')}
            </div>
            <div className="bookmarklet-copy">
              <button className="modal-btn secondary" id="copy-bookmarklet-btn" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Clipboard size={16} /> {t('copyCode')}
              </button>
              <small>{t('dragFallback')}</small>
            </div>
          </div>
          <div className="protocol-usage">
            <h3>{t('howToUse')}</h3>
            <ol>
              <li>{t('howStep1')}</li>
              <li>{t('howStep2')}</li>
              <li>{t('howStep3')}</li>
              <li>{t('howStep4')}</li>
            </ol>
          </div>
          <div className="modal-actions">
            <button className="modal-btn secondary" id="protocol-modal-close">{t('close')}</button>
          </div>
        </div>
      </div>

      {/* 범용 다이얼로그 모달 */}
      <div className="modal-overlay" id="dialog-modal">
        <div className="modal dialog-modal">
          <h2 className="modal-title" id="dialog-title">{t('confirm')}</h2>
          <p className="dialog-message" id="dialog-message">{t('message')}</p>
          <div className="modal-field dialog-input-field" id="dialog-input-field" style={{ display: 'none' }}>
            <input type="text" id="dialog-input" placeholder="" />
          </div>
          <div className="modal-actions">
            <button className="modal-btn secondary" id="dialog-cancel">{t('cancel')}</button>
            <button className="modal-btn primary" id="dialog-confirm">{t('confirm')}</button>
          </div>
        </div>
      </div>
    </>
  );
}
