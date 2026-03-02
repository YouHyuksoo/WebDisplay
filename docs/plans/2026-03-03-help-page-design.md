# MES Display 도움말 페이지 설계

## 접근 경로
1. DisplayHeader: ? 아이콘 버튼 → /help (screenId 파라미터로 해당 섹션 스크롤)
2. 3D 메뉴 홈: FAVORITES에 도움말 카드 추가

## 페이지 구조
- 라우트: /help
- 레이아웃: 다크 테마, 좌측 TOC 사이드바 + 우측 콘텐츠
- 목차 클릭 → 스크롤, 스크롤 위치 → 목차 하이라이트

## 목차
1. 시스템 개요
2. 메뉴 시스템 (3D 터널, 카드 레이아웃, 테마/배경)
3. SMD 모니터링 (24, 25, 26, 27)
4. PBA 모니터링 (21)
5. 설비 모니터링 (34, 35)
6. 품질 관리 (29, 30, 31, 37)
7. 설정 & 옵션
8. 키보드 단축키

## 다국어
- next-intl의 help 네임스페이스 사용
- ko/en/es 3개 언어 지원

## 파일 구조
- src/app/(help)/help/page.tsx
- src/app/(help)/layout.tsx
- src/components/help/HelpPage.tsx
- src/components/help/HelpSidebar.tsx
- src/components/help/HelpContent.tsx
- src/components/help/sections/*.tsx (8개)
- i18n/messages/{ko,en,es}.json → help 네임스페이스 추가
