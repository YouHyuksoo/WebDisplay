/**
 * @file src/components/menu/MenuSubmenus.tsx
 * @description 설정 서브메뉴 (터널 모양 선택, 카드 스타일 선택) + 토스트 + 컨텍스트 메뉴
 *
 * 초보자 가이드:
 * 1. **주요 개념**: 설정 메뉴에서 펼쳐지는 서브메뉴 HTML을 JSX로 변환
 * 2. **사용 방법**: MenuScene에서 import하여 렌더링
 * 3. **중요**: data-shape, data-style 등 data 속성 유지 필수 (JS에서 참조)
 */

'use client';

import { Star, Edit2, Trash2 } from 'lucide-react';
import { useTranslations } from 'next-intl';

/**
 * 터널 서브메뉴 + 카드 스타일 서브메뉴 + 토스트 + 컨텍스트 메뉴
 */
export default function MenuSubmenus() {
  const t = useTranslations('menuUI');

  return (
    <>
      {/* 터널 모양 서브메뉴 */}
      <div id="tunnel-submenu">
        <div className="tunnel-option" data-shape="triangle">
          <span className="shape-icon">&#9651;</span>
          <span>삼각형</span>
        </div>
        <div className="tunnel-option" data-shape="circle">
          <span className="shape-icon">&#9675;</span>
          <span>원형</span>
        </div>
        <div className="tunnel-option" data-shape="square">
          <span className="shape-icon">&#9633;</span>
          <span>사각형</span>
        </div>
        <div className="tunnel-option" data-shape="hexagon">
          <span className="shape-icon">&#11041;</span>
          <span>육각형</span>
        </div>
        <div className="tunnel-option" data-shape="star">
          <span className="shape-icon">&#9734;</span>
          <span>별</span>
        </div>
        <div className="tunnel-option" data-shape="infinity">
          <span className="shape-icon">&#8734;</span>
          <span>무한</span>
        </div>
      </div>

      {/* 카드 스타일 서브메뉴 */}
      <div id="card-style-submenu">
        <div className="card-style-option" data-style="glass">
          <span className="style-preview glass-preview" />
          <span>글래스</span>
        </div>
        <div className="card-style-option" data-style="rainbow">
          <span className="style-preview rainbow-preview" />
          <span>무지개</span>
        </div>
        <div className="card-style-option" data-style="gradient">
          <span className="style-preview gradient-preview" />
          <span>그라데이션</span>
        </div>
        <div className="card-style-option" data-style="dark">
          <span className="style-preview dark-preview" />
          <span>다크</span>
        </div>
        <div className="card-style-option" data-style="neon">
          <span className="style-preview neon-preview" />
          <span>네온</span>
        </div>
        <div className="card-style-option" data-style="hermes">
          <span className="style-preview hermes-preview" />
          <span>헤르메스</span>
        </div>
        <div className="card-style-option" data-style="cyberpunk">
          <span className="style-preview cyberpunk-preview" />
          <span>사이버펑크</span>
        </div>
        <div className="card-style-option" data-style="apple">
          <span className="style-preview apple-preview" />
          <span>애플</span>
        </div>
        <div className="card-style-option" data-style="luxury">
          <span className="style-preview luxury-preview" />
          <span>럭셔리</span>
        </div>
      </div>

      {/* 토스트 알림 */}
      <div id="toast">복사됨!</div>

      {/* 컨텍스트 메뉴 (우클릭) */}
      <div id="context-menu">
        <div className="context-item" id="ctx-fav">
          <Star size={14} style={{ marginRight: '6px' }} />
          <span>{t('favorite')}</span>
        </div>
        <div className="context-item" id="ctx-edit">
          <Edit2 size={14} style={{ marginRight: '6px' }} />
          <span>{t('edit')}</span>
        </div>
        <div className="context-item danger" id="ctx-delete">
          <Trash2 size={14} style={{ marginRight: '6px' }} />
          <span>{t('delete')}</span>
        </div>
      </div>
    </>
  );
}
