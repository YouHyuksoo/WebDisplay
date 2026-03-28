// 빈 서비스 워커 — 이전 등록 해제용
// 브라우저에 캐시된 서비스 워커 등록을 정리한다
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', () => self.clients.claim());
