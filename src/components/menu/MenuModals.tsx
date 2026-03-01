/**
 * @file src/components/menu/MenuModals.tsx
 * @description 모달 다이얼로그 모음 - 바로가기, 카테고리, 북마크, 프로토콜, 범용 다이얼로그
 *
 * 초보자 가이드:
 * 1. **주요 개념**: mydesktop의 모달 HTML 구조를 JSX로 변환
 * 2. **사용 방법**: MenuScene에서 import하여 렌더링
 * 3. **중요**: 모든 ID는 원본과 동일 유지 (JS 모듈이 getElementById 사용)
 */

import { Lightbulb, Paperclip, Link as LinkIcon, Download, Plus, ArrowUp, Clipboard } from 'lucide-react';

/**
 * 바로가기 모달 + 카테고리 모달 + 북마크 가져오기 + 프로토콜 설정 + 범용 다이얼로그
 */
export default function MenuModals() {
  return (
    <>
      {/* 바로가기 추가/수정 모달 */}
      <div className="modal-overlay" id="shortcut-modal">
        <div className="modal">
          <h2 className="modal-title" id="modal-title">Add Shortcut</h2>
          <div className="modal-field">
            <label>Title</label>
            <input type="text" id="shortcut-title" placeholder="Google" />
          </div>
          <div className="modal-field">
            <label>URL</label>
            <input type="url" id="shortcut-url" placeholder="https://google.com" />
          </div>
          <div className="modal-field">
            <label>Category</label>
            <select id="shortcut-layer">
              <option value="0">★ Favorites</option>
            </select>
          </div>
          <div className="modal-field">
            <label>Icon</label>
            <input type="text" id="shortcut-icon" placeholder="si:google" />
            <div className="icon-help">
              <small style={{ display: 'flex', alignItems: 'center', gap: '4px', marginBottom: '4px' }}>
                <Lightbulb size={12} /> <strong>si:아이콘명</strong> 형식 사용 (예: si:google, si:github, si:youtube)
              </small>
              <small style={{ display: 'flex', alignItems: 'center', gap: '4px', marginBottom: '4px' }}>
                <Paperclip size={12} />{' '}
                <a href="https://simpleicons.org" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--accent)' }}>
                  simpleicons.org
                </a>
                에서 아이콘 이름 검색
              </small>
              <small style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <LinkIcon size={12} /> 또는 이미지 URL 직접 입력 / 비워두면 첫글자 표시
              </small>
            </div>
          </div>
          <div className="modal-field">
            <label>Color</label>
            <div className="color-picker-wrapper" id="color-picker" />
          </div>
          <div className="modal-actions">
            <button className="modal-btn secondary" id="modal-cancel">Cancel</button>
            <button className="modal-btn danger" id="modal-delete" style={{ display: 'none' }}>Delete</button>
            <button className="modal-btn primary" id="modal-save">Save</button>
          </div>
        </div>
      </div>

      {/* 카테고리 관리 모달 */}
      <div className="modal-overlay" id="category-modal">
        <div className="modal category-modal">
          <h2 className="modal-title">카테고리 관리</h2>
          <div className="category-list" id="category-list" />
          <button className="add-category-btn" id="add-category-btn">+ 새 카테고리</button>
          <div className="modal-actions">
            <button className="modal-btn secondary" id="category-modal-close">닫기</button>
          </div>
        </div>
      </div>

      {/* 카테고리 편집 다이얼로그 */}
      <div className="modal-overlay" id="category-edit-dialog">
        <div className="modal">
          <h2 className="modal-title" id="category-edit-title">새 카테고리</h2>
          <div className="modal-field">
            <label>이름</label>
            <input type="text" id="category-name-input" placeholder="CATEGORY" />
          </div>
          <div className="modal-field">
            <label>설명</label>
            <input type="text" id="category-subtitle-input" placeholder="Description" />
          </div>
          <div className="modal-field">
            <label>아이콘 (문자/심볼)</label>
            <input type="text" id="category-icon-input" placeholder="◻" maxLength={2} />
          </div>
          <div className="modal-actions">
            <button className="modal-btn secondary" id="category-edit-cancel">취소</button>
            <button className="modal-btn primary" id="category-edit-save">저장</button>
          </div>
        </div>
      </div>

      {/* 북마크 가져오기 모달 */}
      <div className="modal-overlay" id="import-modal">
        <div className="modal import-modal">
          <h2 className="modal-title">북마크 가져오기</h2>
          <p className="import-description">
            Chrome에서 북마크 내보내기한 HTML 파일을 선택하거나 드래그하세요.
          </p>
          <div className="import-dropzone" id="import-dropzone">
            <div className="dropzone-icon">
              <Download size={48} />
            </div>
            <div className="dropzone-text">
              HTML 파일을 드래그하거나
              <br />
              클릭해서 선택
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
            <LinkIcon size={24} /> 빠른 추가 설정
          </h2>
          <p className="protocol-description">
            다른 사이트에서 클릭 한 번으로 MyDesktop에 추가하세요!
          </p>
          <div className="modal-field">
            <label>MyDesktop URL (호스팅 주소)</label>
            <input type="url" id="protocol-base-url" placeholder="https://your-domain.com/mydesktop/" />
            <small className="protocol-url-hint">
              로컬 파일(file://)은 보안상 지원되지 않습니다
            </small>
          </div>
          <div className="bookmarklet-container" id="bookmarklet-container" style={{ display: 'none' }}>
            <a href="#" id="bookmarklet-link" className="bookmarklet-btn" onClick={(e) => e.preventDefault()} style={{ display: 'flex', alignItems: 'center', gap: '8px', justifyContent: 'center' }}>
              <Plus size={16} /> Add to MyDesktop
            </a>
            <div className="bookmarklet-hint" style={{ display: 'flex', alignItems: 'center', gap: '4px', justifyContent: 'center' }}>
              <ArrowUp size={14} /> 이 버튼을 북마크바로 드래그!
            </div>
            <div className="bookmarklet-copy">
              <button className="modal-btn secondary" id="copy-bookmarklet-btn" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Clipboard size={16} /> 코드 복사
              </button>
              <small>드래그가 안 되면 코드를 복사해서 북마크 URL에 붙여넣기</small>
            </div>
          </div>
          <div className="protocol-usage">
            <h3>사용 방법</h3>
            <ol>
              <li>MyDesktop을 웹서버에 업로드 (GitHub Pages, Netlify 등)</li>
              <li>위에 호스팅 URL 입력</li>
              <li>버튼을 북마크바로 드래그 (또는 코드 복사)</li>
              <li>다른 사이트에서 북마크 클릭 → 자동 추가!</li>
            </ol>
          </div>
          <div className="modal-actions">
            <button className="modal-btn secondary" id="protocol-modal-close">닫기</button>
          </div>
        </div>
      </div>

      {/* 범용 다이얼로그 모달 */}
      <div className="modal-overlay" id="dialog-modal">
        <div className="modal dialog-modal">
          <h2 className="modal-title" id="dialog-title">확인</h2>
          <p className="dialog-message" id="dialog-message">메시지</p>
          <div className="modal-field dialog-input-field" id="dialog-input-field" style={{ display: 'none' }}>
            <input type="text" id="dialog-input" placeholder="" />
          </div>
          <div className="modal-actions">
            <button className="modal-btn secondary" id="dialog-cancel">취소</button>
            <button className="modal-btn primary" id="dialog-confirm">확인</button>
          </div>
        </div>
      </div>
    </>
  );
}
