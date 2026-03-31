/**
 * @file generate-manual.js
 * @description PBA 모니터링 사용자 매뉴얼 HTML 생성 스크립트.
 * 스크린샷 이미지를 base64로 임베딩하여 단일 HTML 파일을 생성한다.
 */
const fs = require('fs');
const path = require('path');

const dir = __dirname;
const images = {};
const files = ['menu-pba', 'production-plan', 'product-input', 'product-packing', 'line-select-modal', 'header-icons'];
for (const name of files) {
  const buf = fs.readFileSync(path.join(dir, name + '.png'));
  images[name] = 'data:image/png;base64,' + buf.toString('base64');
}

const html = `<!DOCTYPE html>
<html lang="ko">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>PBA 모니터링 사용자 매뉴얼 / Hướng dẫn sử dụng Giám sát PBA</title>
<style>
  @import url('https://fonts.googleapis.com/css2?family=Noto+Sans+KR:wght@300;400;500;700;900&family=Noto+Sans:wght@300;400;500;700&display=swap');

  :root {
    --primary: #6366f1;
    --primary-light: #818cf8;
    --accent: #10b981;
    --accent-light: #34d399;
    --bg: #0f172a;
    --bg-card: #1e293b;
    --bg-card-hover: #334155;
    --text: #e2e8f0;
    --text-muted: #94a3b8;
    --text-heading: #f1f5f9;
    --border: #334155;
    --danger: #ef4444;
    --warning: #f59e0b;
    --info: #3b82f6;
  }

  * { margin: 0; padding: 0; box-sizing: border-box; }

  body {
    font-family: 'Noto Sans KR', 'Noto Sans', sans-serif;
    background: var(--bg);
    color: var(--text);
    line-height: 1.7;
    scroll-behavior: smooth;
  }

  /* Language Toggle */
  .lang-toggle {
    position: fixed;
    top: 20px;
    right: 20px;
    z-index: 1000;
    display: flex;
    gap: 4px;
    background: var(--bg-card);
    border: 1px solid var(--border);
    border-radius: 12px;
    padding: 4px;
    box-shadow: 0 4px 20px rgba(0,0,0,0.3);
  }
  .lang-toggle button {
    padding: 8px 16px;
    border: none;
    border-radius: 8px;
    cursor: pointer;
    font-size: 14px;
    font-weight: 500;
    transition: all 0.2s;
    background: transparent;
    color: var(--text-muted);
  }
  .lang-toggle button.active {
    background: var(--primary);
    color: white;
  }
  .lang-toggle button:hover:not(.active) {
    background: var(--bg-card-hover);
    color: var(--text);
  }

  .vi { display: none; }
  body.lang-vi .ko { display: none; }
  body.lang-vi .vi { display: block; }
  body.lang-vi span.vi, body.lang-vi em.vi { display: inline; }
  body.lang-vi span.ko, body.lang-vi em.ko { display: none; }

  /* Hero */
  .hero {
    background: linear-gradient(135deg, #1e1b4b 0%, #312e81 30%, #4f46e5 60%, #6366f1 100%);
    padding: 80px 40px 60px;
    text-align: center;
    position: relative;
    overflow: hidden;
  }
  .hero::before {
    content: '';
    position: absolute;
    top: -50%;
    left: -50%;
    width: 200%;
    height: 200%;
    background: radial-gradient(circle at 30% 50%, rgba(99,102,241,0.15) 0%, transparent 50%),
                radial-gradient(circle at 70% 50%, rgba(16,185,129,0.1) 0%, transparent 50%);
    animation: float 20s ease-in-out infinite;
  }
  @keyframes float {
    0%, 100% { transform: translate(0, 0); }
    50% { transform: translate(-20px, -10px); }
  }
  .hero h1 {
    font-size: 2.5rem;
    font-weight: 900;
    color: white;
    position: relative;
    margin-bottom: 12px;
  }
  .hero .subtitle {
    font-size: 1.1rem;
    color: rgba(255,255,255,0.8);
    position: relative;
    font-weight: 300;
  }
  .hero .badge {
    display: inline-block;
    margin-top: 20px;
    padding: 6px 16px;
    background: rgba(255,255,255,0.15);
    border: 1px solid rgba(255,255,255,0.2);
    border-radius: 20px;
    color: rgba(255,255,255,0.9);
    font-size: 13px;
    position: relative;
  }

  /* Container */
  .container {
    max-width: 960px;
    margin: 0 auto;
    padding: 40px 24px;
  }

  /* TOC */
  .toc {
    background: var(--bg-card);
    border: 1px solid var(--border);
    border-radius: 16px;
    padding: 32px;
    margin-bottom: 48px;
  }
  .toc h2 {
    font-size: 1.3rem;
    color: var(--primary-light);
    margin-bottom: 16px;
    display: flex;
    align-items: center;
    gap: 8px;
  }
  .toc ol {
    list-style: none;
    counter-reset: toc;
  }
  .toc ol li {
    counter-increment: toc;
    margin-bottom: 8px;
  }
  .toc ol li a {
    color: var(--text);
    text-decoration: none;
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 8px 12px;
    border-radius: 8px;
    transition: all 0.2s;
  }
  .toc ol li a:hover {
    background: var(--bg-card-hover);
    color: var(--primary-light);
  }
  .toc ol li a::before {
    content: counter(toc);
    display: flex;
    align-items: center;
    justify-content: center;
    width: 28px;
    height: 28px;
    border-radius: 8px;
    background: var(--primary);
    color: white;
    font-size: 13px;
    font-weight: 700;
    flex-shrink: 0;
  }

  /* Section */
  .section {
    margin-bottom: 56px;
  }
  .section-header {
    display: flex;
    align-items: center;
    gap: 16px;
    margin-bottom: 24px;
    padding-bottom: 12px;
    border-bottom: 2px solid var(--border);
  }
  .section-num {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 48px;
    height: 48px;
    border-radius: 14px;
    background: linear-gradient(135deg, var(--primary), var(--primary-light));
    color: white;
    font-size: 1.3rem;
    font-weight: 900;
    flex-shrink: 0;
  }
  .section-header h2 {
    font-size: 1.5rem;
    color: var(--text-heading);
    font-weight: 700;
  }

  /* Screenshot */
  .screenshot {
    margin: 24px 0;
    border-radius: 12px;
    overflow: hidden;
    border: 1px solid var(--border);
    box-shadow: 0 4px 24px rgba(0,0,0,0.3);
  }
  .screenshot img {
    width: 100%;
    display: block;
  }
  .screenshot-caption {
    background: var(--bg-card);
    padding: 12px 16px;
    font-size: 13px;
    color: var(--text-muted);
    text-align: center;
    border-top: 1px solid var(--border);
  }

  /* Callout */
  .callout {
    border-radius: 12px;
    padding: 20px 24px;
    margin: 20px 0;
    display: flex;
    gap: 14px;
    align-items: flex-start;
  }
  .callout-icon {
    font-size: 20px;
    flex-shrink: 0;
    margin-top: 2px;
  }
  .callout-info {
    background: rgba(59,130,246,0.1);
    border: 1px solid rgba(59,130,246,0.3);
  }
  .callout-warning {
    background: rgba(245,158,11,0.1);
    border: 1px solid rgba(245,158,11,0.3);
  }
  .callout-success {
    background: rgba(16,185,129,0.1);
    border: 1px solid rgba(16,185,129,0.3);
  }
  .callout-danger {
    background: rgba(239,68,68,0.1);
    border: 1px solid rgba(239,68,68,0.3);
  }

  /* Steps */
  .steps {
    list-style: none;
    counter-reset: step;
    margin: 20px 0;
  }
  .steps li {
    counter-increment: step;
    padding: 16px 20px 16px 60px;
    position: relative;
    margin-bottom: 12px;
    background: var(--bg-card);
    border-radius: 12px;
    border: 1px solid var(--border);
  }
  .steps li::before {
    content: counter(step);
    position: absolute;
    left: 16px;
    top: 16px;
    width: 32px;
    height: 32px;
    border-radius: 50%;
    background: var(--accent);
    color: white;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 14px;
    font-weight: 700;
  }
  .steps li strong {
    color: var(--accent-light);
  }

  /* Workflow */
  .workflow {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    margin: 32px 0;
    flex-wrap: wrap;
  }
  .workflow-step {
    background: linear-gradient(135deg, var(--bg-card), var(--bg-card-hover));
    border: 1px solid var(--border);
    border-radius: 12px;
    padding: 16px 24px;
    text-align: center;
    min-width: 140px;
  }
  .workflow-step .icon { font-size: 28px; margin-bottom: 6px; }
  .workflow-step .label { font-size: 13px; font-weight: 600; color: var(--text-heading); }
  .workflow-step .sub { font-size: 11px; color: var(--text-muted); margin-top: 2px; }
  .workflow-arrow {
    font-size: 24px;
    color: var(--primary-light);
  }

  /* Table */
  .info-table {
    width: 100%;
    border-collapse: collapse;
    margin: 20px 0;
    border-radius: 12px;
    overflow: hidden;
    border: 1px solid var(--border);
  }
  .info-table th {
    background: var(--primary);
    color: white;
    padding: 12px 16px;
    text-align: left;
    font-size: 14px;
    font-weight: 600;
  }
  .info-table td {
    padding: 12px 16px;
    border-bottom: 1px solid var(--border);
    font-size: 14px;
  }
  .info-table tr:nth-child(even) td {
    background: rgba(255,255,255,0.02);
  }
  .info-table tr:last-child td {
    border-bottom: none;
  }

  /* Change Notice */
  .change-notice {
    background: linear-gradient(135deg, rgba(245,158,11,0.1), rgba(239,68,68,0.05));
    border: 1px solid rgba(245,158,11,0.3);
    border-radius: 16px;
    padding: 28px 32px;
    margin: 32px 0;
  }
  .change-notice h3 {
    color: var(--warning);
    font-size: 1.1rem;
    margin-bottom: 12px;
  }
  .change-arrow {
    display: flex;
    align-items: center;
    gap: 16px;
    margin: 12px 0;
    font-size: 15px;
  }
  .change-old {
    background: rgba(239,68,68,0.2);
    padding: 6px 14px;
    border-radius: 8px;
    text-decoration: line-through;
    color: var(--danger);
  }
  .change-new {
    background: rgba(16,185,129,0.2);
    padding: 6px 14px;
    border-radius: 8px;
    color: var(--accent-light);
    font-weight: 600;
  }

  /* Footer */
  footer {
    text-align: center;
    padding: 40px;
    color: var(--text-muted);
    font-size: 13px;
    border-top: 1px solid var(--border);
  }

  /* Print */
  @media print {
    body { background: white; color: #1e293b; }
    .lang-toggle { display: none; }
    .hero { background: #4f46e5 !important; -webkit-print-color-adjust: exact; }
    .screenshot { box-shadow: none; border: 1px solid #ccc; }
    .section { page-break-inside: avoid; }
  }
</style>
</head>
<body>

<!-- Language Toggle -->
<div class="lang-toggle">
  <button class="active" onclick="setLang('ko')">한국어</button>
  <button onclick="setLang('vi')">Tiếng Việt</button>
</div>

<!-- Hero -->
<div class="hero">
  <h1>
    <span class="ko">PBA 모니터링 사용자 매뉴얼</span>
    <span class="vi">Hướng dẫn sử dụng Giám sát PBA</span>
  </h1>
  <p class="subtitle">
    <span class="ko">생산계획 등록 → 제품투입현황 → 제품포장현황 워크플로우 가이드</span>
    <span class="vi">Hướng dẫn quy trình: Đăng ký kế hoạch sản xuất → Tình trạng nhập sản phẩm → Tình trạng đóng gói</span>
  </p>
  <div class="badge">
    <span class="ko">SOLUM MES Web Display v2.0 — 2026</span>
    <span class="vi">SOLUM MES Web Display v2.0 — 2026</span>
  </div>
</div>

<div class="container">

  <!-- Change Notice -->
  <div class="change-notice">
    <h3>
      <span class="ko">&#9888;&#65039; 시스템 변경 안내</span>
      <span class="vi">&#9888;&#65039; Thông báo thay đổi hệ thống</span>
    </h3>
    <p class="ko">기존 <strong>SOLUM CTQ 프로그램</strong>에서 <strong>웹(Web) 모니터링 시스템</strong>으로 변경되었습니다. 별도 프로그램 설치 없이 웹 브라우저(Chrome 권장)에서 바로 사용할 수 있습니다.</p>
    <p class="vi">Hệ thống đã được chuyển từ <strong>chương trình SOLUM CTQ</strong> sang <strong>hệ thống giám sát Web</strong>. Có thể sử dụng trực tiếp trên trình duyệt web (khuyến nghị Chrome) mà không cần cài đặt phần mềm riêng.</p>
    <div class="change-arrow">
      <span class="change-old">SOLUM CTQ (Windows)</span>
      <span style="color:var(--text-muted)">→</span>
      <span class="change-new">Web Monitoring (Chrome Browser)</span>
    </div>
  </div>

  <!-- TOC -->
  <div class="toc">
    <h2>
      <span class="ko">&#128203; 목차</span>
      <span class="vi">&#128203; Mục lục</span>
    </h2>
    <ol>
      <li><a href="#access">
        <span class="ko">접속 방법 및 메뉴 위치</span>
        <span class="vi">Cách truy cập và vị trí menu</span>
      </a></li>
      <li><a href="#workflow">
        <span class="ko">전체 워크플로우 개요</span>
        <span class="vi">Tổng quan quy trình làm việc</span>
      </a></li>
      <li><a href="#plan">
        <span class="ko">생산계획 등록</span>
        <span class="vi">Đăng ký kế hoạch sản xuất</span>
      </a></li>
      <li><a href="#input">
        <span class="ko">제품투입현황 모니터링</span>
        <span class="vi">Giám sát tình trạng nhập sản phẩm</span>
      </a></li>
      <li><a href="#packing">
        <span class="ko">제품포장현황 모니터링</span>
        <span class="vi">Giám sát tình trạng đóng gói sản phẩm</span>
      </a></li>
      <li><a href="#line">
        <span class="ko">라인 선택 방법</span>
        <span class="vi">Cách chọn dây chuyền</span>
      </a></li>
      <li><a href="#faq">
        <span class="ko">자주 묻는 질문 (FAQ)</span>
        <span class="vi">Câu hỏi thường gặp (FAQ)</span>
      </a></li>
    </ol>
  </div>

  <!-- Section 1: Access -->
  <div class="section" id="access">
    <div class="section-header">
      <div class="section-num">1</div>
      <h2>
        <span class="ko">접속 방법 및 메뉴 위치</span>
        <span class="vi">Cách truy cập và vị trí menu</span>
      </h2>
    </div>

    <p class="ko">웹 브라우저(Chrome 권장)에서 모니터링 시스템 주소에 접속하면 메인 메뉴 화면이 표시됩니다. 화면 <strong>우측</strong>에 카테고리 메뉴가 있으며, <strong>"PBA 모니터링"</strong>을 클릭하면 아래와 같이 PBA 관련 화면 목록이 표시됩니다.</p>
    <p class="vi">Khi truy cập địa chỉ hệ thống giám sát trên trình duyệt web (khuyến nghị Chrome), màn hình menu chính sẽ hiển thị. Menu danh mục nằm ở <strong>bên phải</strong> màn hình. Nhấp vào <strong>"PBA 모니터링"</strong> để hiển thị danh sách các màn hình liên quan đến PBA như bên dưới.</p>

    <div class="screenshot">
      <img src="${images['menu-pba']}" alt="PBA Menu">
      <div class="screenshot-caption">
        <span class="ko">PBA 모니터링 메뉴 — 제품생산현황, 제품투입현황, 제품포장현황, 생산계획등록</span>
        <span class="vi">Menu Giám sát PBA — Tình trạng sản xuất, Nhập sản phẩm, Đóng gói, Đăng ký kế hoạch</span>
      </div>
    </div>

    <table class="info-table">
      <tr>
        <th><span class="ko">메뉴</span><span class="vi">Menu</span></th>
        <th><span class="ko">경로</span><span class="vi">Đường dẫn</span></th>
        <th><span class="ko">용도</span><span class="vi">Mục đích</span></th>
      </tr>
      <tr>
        <td><span class="ko">생산계획등록</span><span class="vi">Đăng ký KH sản xuất</span></td>
        <td>/display/20</td>
        <td><span class="ko">일일 생산계획 등록 (선행 필수)</span><span class="vi">Đăng ký kế hoạch sản xuất hàng ngày (bắt buộc)</span></td>
      </tr>
      <tr>
        <td><span class="ko">제품투입현황</span><span class="vi">Tình trạng nhập SP</span></td>
        <td>/display/22</td>
        <td><span class="ko">라인 투입구 모니터링</span><span class="vi">Giám sát đầu vào dây chuyền</span></td>
      </tr>
      <tr>
        <td><span class="ko">제품포장현황</span><span class="vi">Tình trạng đóng gói</span></td>
        <td>/display/23</td>
        <td><span class="ko">라인 출구(포장) 모니터링</span><span class="vi">Giám sát đầu ra (đóng gói)</span></td>
      </tr>
      <tr>
        <td><span class="ko">제품생산현황</span><span class="vi">Tình trạng sản xuất</span></td>
        <td>/display/21</td>
        <td><span class="ko">전체 라인 생산 종합현황</span><span class="vi">Tổng hợp sản xuất tất cả dây chuyền</span></td>
      </tr>
    </table>
  </div>

  <!-- Section 2: Workflow -->
  <div class="section" id="workflow">
    <div class="section-header">
      <div class="section-num">2</div>
      <h2>
        <span class="ko">전체 워크플로우 개요</span>
        <span class="vi">Tổng quan quy trình làm việc</span>
      </h2>
    </div>

    <p class="ko">PBA 모니터링은 <strong>3단계</strong>로 진행됩니다. 반드시 생산계획을 먼저 등록해야 투입/포장 모니터링 화면에 데이터가 표시됩니다.</p>
    <p class="vi">Giám sát PBA được thực hiện qua <strong>3 bước</strong>. Phải đăng ký kế hoạch sản xuất trước thì dữ liệu mới hiển thị trên màn hình giám sát nhập/đóng gói.</p>

    <div class="workflow">
      <div class="workflow-step" style="border-color: var(--primary-light);">
        <div class="icon">&#128221;</div>
        <div class="label"><span class="ko">STEP 1</span><span class="vi">BƯỚC 1</span></div>
        <div class="sub"><span class="ko">생산계획 등록</span><span class="vi">Đăng ký KH sản xuất</span></div>
      </div>
      <div class="workflow-arrow">&#10132;</div>
      <div class="workflow-step" style="border-color: var(--accent);">
        <div class="icon">&#128230;</div>
        <div class="label"><span class="ko">STEP 2</span><span class="vi">BƯỚC 2</span></div>
        <div class="sub"><span class="ko">제품투입현황</span><span class="vi">Giám sát nhập SP</span></div>
      </div>
      <div class="workflow-arrow">&#10132;</div>
      <div class="workflow-step" style="border-color: var(--warning);">
        <div class="icon">&#128666;</div>
        <div class="label"><span class="ko">STEP 3</span><span class="vi">BƯỚC 3</span></div>
        <div class="sub"><span class="ko">제품포장현황</span><span class="vi">Giám sát đóng gói</span></div>
      </div>
    </div>

    <div class="callout callout-warning">
      <span class="callout-icon">&#9888;&#65039;</span>
      <div>
        <p class="ko"><strong>중요:</strong> 생산계획이 등록되지 않으면 투입/포장 모니터링에 Target(목표) 수량이 표시되지 않습니다. 반드시 <strong>작업 시작 전에 생산계획을 등록</strong>해 주세요.</p>
        <p class="vi"><strong>Quan trọng:</strong> Nếu kế hoạch sản xuất chưa được đăng ký, số lượng Target (mục tiêu) sẽ không hiển thị trên màn hình giám sát. Hãy <strong>đăng ký kế hoạch sản xuất trước khi bắt đầu</strong>.</p>
      </div>
    </div>

    <div class="callout callout-success">
      <span class="callout-icon">&#127981;</span>
      <div>
        <p class="ko"><strong>설치 위치 가이드:</strong></p>
        <p class="vi"><strong>Hướng dẫn vị trí lắp đặt:</strong></p>
        <ul style="margin-top:8px; padding-left: 20px;">
          <li class="ko"><strong>제품투입현황:</strong> 라인 <em>투입구(시작점)</em>에 모니터를 설치하여 투입 상황을 실시간 확인</li>
          <li class="vi"><strong>Nhập sản phẩm:</strong> Lắp màn hình tại <em>đầu vào (điểm bắt đầu)</em> dây chuyền để theo dõi tình trạng nhập theo thời gian thực</li>
          <li class="ko"><strong>제품포장현황:</strong> 라인 <em>출구(끝점, 포장 구역)</em>에 모니터를 설치하여 완성품 포장 현황을 실시간 확인</li>
          <li class="vi"><strong>Đóng gói:</strong> Lắp màn hình tại <em>đầu ra (điểm kết thúc, khu vực đóng gói)</em> để theo dõi tình trạng đóng gói thành phẩm</li>
        </ul>
      </div>
    </div>
  </div>

  <!-- Section 3: Production Plan -->
  <div class="section" id="plan">
    <div class="section-header">
      <div class="section-num">3</div>
      <h2>
        <span class="ko">생산계획 등록 (STEP 1)</span>
        <span class="vi">Đăng ký kế hoạch sản xuất (BƯỚC 1)</span>
      </h2>
    </div>

    <p class="ko">모니터링의 <strong>첫 번째 단계</strong>입니다. 매일 생산 시작 전에 해당 라인의 계획을 등록합니다.</p>
    <p class="vi">Đây là <strong>bước đầu tiên</strong> của giám sát. Đăng ký kế hoạch cho dây chuyền tương ứng trước khi bắt đầu sản xuất mỗi ngày.</p>

    <div class="screenshot">
      <img src="${images['production-plan']}" alt="Production Plan Registration">
      <div class="screenshot-caption">
        <span class="ko">생산계획등록 화면 (/display/20)</span>
        <span class="vi">Màn hình đăng ký kế hoạch sản xuất (/display/20)</span>
      </div>
    </div>

    <h3 style="color:var(--accent-light); margin: 24px 0 16px;">
      <span class="ko">&#9997;&#65039; 등록 방법</span>
      <span class="vi">&#9997;&#65039; Cách đăng ký</span>
    </h3>

    <ol class="steps">
      <li>
        <span class="ko"><strong>계획일자</strong>를 선택합니다. (기본값: 오늘 날짜)</span>
        <span class="vi">Chọn <strong>ngày kế hoạch</strong>. (Mặc định: ngày hôm nay)</span>
      </li>
      <li>
        <span class="ko"><strong>라인코드</strong> 드롭다운에서 해당 생산 라인을 선택합니다. (예: SMPS-1, SMPS-2 등)</span>
        <span class="vi">Chọn dây chuyền sản xuất từ dropdown <strong>Mã dây chuyền</strong>. (Ví dụ: SMPS-1, SMPS-2, v.v.)</span>
      </li>
      <li>
        <span class="ko"><strong>Shift</strong>를 선택합니다. (A조 = 주간, B조 = 야간)</span>
        <span class="vi">Chọn <strong>Shift</strong>. (Ca A = Ban ngày, Ca B = Ban đêm)</span>
      </li>
      <li>
        <span class="ko"><strong>모델명</strong>을 입력하거나 검색 버튼을 눌러 런카드에서 모델을 조회합니다.</span>
        <span class="vi">Nhập <strong>tên model</strong> hoặc nhấn nút tìm kiếm để tra cứu model từ Run Card.</span>
      </li>
      <li>
        <span class="ko"><strong>제품코드, UPH, 계획수량, 작업인원</strong> 등 상세 정보를 입력합니다.</span>
        <span class="vi">Nhập thông tin chi tiết: <strong>Mã sản phẩm, UPH, Số lượng kế hoạch, Số nhân công</strong>.</span>
      </li>
      <li>
        <span class="ko"><strong>리더 ID, 부리더 ID</strong>를 입력하고 필요 시 NOTICE를 작성합니다.</span>
        <span class="vi">Nhập <strong>ID trưởng nhóm, ID phó nhóm</strong> và viết NOTICE nếu cần.</span>
      </li>
      <li>
        <span class="ko"><strong>저장</strong> 버튼을 클릭하여 계획을 등록합니다.</span>
        <span class="vi">Nhấn nút <strong>Lưu</strong> để đăng ký kế hoạch.</span>
      </li>
    </ol>

    <div class="callout callout-info">
      <span class="callout-icon">&#128161;</span>
      <div>
        <p class="ko"><strong>TIP:</strong> 하단 테이블에서 해당 날짜의 등록된 모든 계획을 확인할 수 있습니다. 이미 등록된 항목을 선택하면 수정이 가능합니다.</p>
        <p class="vi"><strong>MẸO:</strong> Bạn có thể xem tất cả kế hoạch đã đăng ký cho ngày đó trong bảng bên dưới. Chọn một mục đã đăng ký để chỉnh sửa.</p>
      </div>
    </div>
  </div>

  <!-- Section 4: Product Input -->
  <div class="section" id="input">
    <div class="section-header">
      <div class="section-num">4</div>
      <h2>
        <span class="ko">제품투입현황 모니터링 (STEP 2)</span>
        <span class="vi">Giám sát tình trạng nhập sản phẩm (BƯỚC 2)</span>
      </h2>
    </div>

    <p class="ko">생산 라인의 <strong>투입구(시작점)</strong>에 설치된 모니터에서 실시간으로 투입 현황을 확인합니다. 생산계획 대비 실적을 시간대별로 보여줍니다.</p>
    <p class="vi">Theo dõi tình trạng nhập sản phẩm theo thời gian thực trên màn hình được lắp đặt tại <strong>đầu vào (điểm bắt đầu)</strong> dây chuyền. Hiển thị kết quả thực tế so với kế hoạch theo từng khung giờ.</p>

    <div class="screenshot">
      <img src="${images['product-input']}" alt="Product Input Status">
      <div class="screenshot-caption">
        <span class="ko">제품투입현황 화면 (/display/22) — 라인별 시간대별 투입 실적</span>
        <span class="vi">Màn hình tình trạng nhập SP (/display/22) — Kết quả nhập theo dây chuyền và khung giờ</span>
      </div>
    </div>

    <h3 style="color:var(--accent-light); margin: 24px 0 16px;">
      <span class="ko">&#128202; 화면 구성 설명</span>
      <span class="vi">&#128202; Giải thích cấu trúc màn hình</span>
    </h3>

    <table class="info-table">
      <tr>
        <th><span class="ko">항목</span><span class="vi">Mục</span></th>
        <th><span class="ko">설명</span><span class="vi">Giải thích</span></th>
      </tr>
      <tr>
        <td><strong style="color:#00bcd4;">Target</strong></td>
        <td><span class="ko">생산계획에서 등록한 시간대별 목표 수량</span><span class="vi">Số lượng mục tiêu theo khung giờ từ kế hoạch sản xuất</span></td>
      </tr>
      <tr>
        <td><strong style="color:#4caf50;">Actual</strong></td>
        <td><span class="ko">실제 투입 완료된 수량 (실시간 갱신)</span><span class="vi">Số lượng thực tế đã nhập (cập nhật thời gian thực)</span></td>
      </tr>
      <tr>
        <td><strong style="color:#f44336;">Shortage</strong></td>
        <td><span class="ko">목표 대비 초과/부족 수량 (Actual - Target)</span><span class="vi">Số lượng vượt/thiếu so với mục tiêu</span></td>
      </tr>
      <tr>
        <td><strong style="color:#00bcd4;">% Rate</strong></td>
        <td><span class="ko">달성률 (Actual / Target × 100%)</span><span class="vi">Tỷ lệ đạt (Actual / Target × 100%)</span></td>
      </tr>
      <tr>
        <td><strong>A ~ E</strong></td>
        <td><span class="ko">시간대별 구간 (예: A=20:00~22:00, B=22:10~00:00 ...)</span><span class="vi">Khung giờ (Ví dụ: A=20:00~22:00, B=22:10~00:00 ...)</span></td>
      </tr>
      <tr>
        <td><strong style="color:#ff9800;">Total</strong></td>
        <td><span class="ko">전체 합계 (모든 시간대의 누적)</span><span class="vi">Tổng cộng (tích lũy tất cả khung giờ)</span></td>
      </tr>
      <tr>
        <td><strong>Leader / Sub Leader</strong></td>
        <td><span class="ko">생산계획에 등록된 리더/부리더 정보</span><span class="vi">Thông tin trưởng/phó nhóm đã đăng ký trong kế hoạch</span></td>
      </tr>
    </table>

    <div class="callout callout-success">
      <span class="callout-icon">&#127916;</span>
      <div>
        <p class="ko"><strong>자동 갱신:</strong> 화면은 90초마다 자동으로 데이터를 갱신합니다. 여러 라인이 등록된 경우 15초 간격으로 라인이 자동 전환됩니다.</p>
        <p class="vi"><strong>Tự động cập nhật:</strong> Màn hình tự động cập nhật dữ liệu mỗi 90 giây. Nếu nhiều dây chuyền được đăng ký, các dây chuyền sẽ tự động chuyển đổi mỗi 15 giây.</p>
      </div>
    </div>
  </div>

  <!-- Section 5: Product Packing -->
  <div class="section" id="packing">
    <div class="section-header">
      <div class="section-num">5</div>
      <h2>
        <span class="ko">제품포장현황 모니터링 (STEP 3)</span>
        <span class="vi">Giám sát tình trạng đóng gói sản phẩm (BƯỚC 3)</span>
      </h2>
    </div>

    <p class="ko">생산 라인의 <strong>출구(끝점, 포장 구역)</strong>에 설치된 모니터에서 포장 완료 현황을 실시간으로 확인합니다. 화면 구성은 제품투입현황과 동일하지만, <strong>포장 완료 수량</strong>을 기준으로 집계합니다.</p>
    <p class="vi">Theo dõi tình trạng đóng gói thành phẩm theo thời gian thực trên màn hình được lắp đặt tại <strong>đầu ra (điểm kết thúc, khu vực đóng gói)</strong>. Cấu trúc màn hình giống với nhập sản phẩm, nhưng tổng hợp theo <strong>số lượng đã đóng gói</strong>.</p>

    <div class="screenshot">
      <img src="${images['product-packing']}" alt="Product Packing Status">
      <div class="screenshot-caption">
        <span class="ko">제품포장현황 화면 (/display/23) — 포장 완료 실적</span>
        <span class="vi">Màn hình tình trạng đóng gói (/display/23) — Kết quả đóng gói hoàn thành</span>
      </div>
    </div>

    <div class="callout callout-info">
      <span class="callout-icon">&#128205;</span>
      <div>
        <p class="ko"><strong>설치 위치:</strong> 제품포장현황 모니터는 생산이 끝나는 곳(포장 구역)에 설치합니다. 작업자가 포장 작업을 하면서 실시간으로 목표 대비 진행률을 확인할 수 있습니다.</p>
        <p class="vi"><strong>Vị trí lắp đặt:</strong> Màn hình giám sát đóng gói được lắp đặt tại nơi kết thúc sản xuất (khu vực đóng gói). Công nhân có thể kiểm tra tiến độ so với mục tiêu theo thời gian thực trong khi đóng gói.</p>
      </div>
    </div>

    <div class="callout callout-warning">
      <span class="callout-icon">&#128260;</span>
      <div>
        <p class="ko"><strong>투입 vs 포장의 차이:</strong> 투입현황은 라인에 들어가는 수량, 포장현황은 라인에서 나오는 수량을 카운트합니다. 따라서 투입 수량이 항상 포장 수량보다 같거나 많습니다.</p>
        <p class="vi"><strong>Sự khác biệt giữa Nhập và Đóng gói:</strong> Tình trạng nhập đếm số lượng đưa vào dây chuyền, đóng gói đếm số lượng ra khỏi dây chuyền. Do đó, số lượng nhập luôn bằng hoặc nhiều hơn số lượng đóng gói.</p>
      </div>
    </div>
  </div>

  <!-- Section 6: Line Selection -->
  <div class="section" id="line">
    <div class="section-header">
      <div class="section-num">6</div>
      <h2>
        <span class="ko">라인 선택 방법</span>
        <span class="vi">Cách chọn dây chuyền</span>
      </h2>
    </div>

    <p class="ko">제품투입현황과 제품포장현황 화면에서 모니터링할 라인을 선택하려면, 상단 헤더의 <strong>설정(⚙️) 아이콘</strong>을 클릭합니다.</p>
    <p class="vi">Để chọn dây chuyền giám sát trên màn hình nhập sản phẩm và đóng gói, hãy nhấp vào <strong>biểu tượng cài đặt (⚙️)</strong> trên thanh header phía trên.</p>

    <h3 style="color:var(--accent-light); margin: 24px 0 16px;">
      <span class="ko">&#9881;&#65039; 상단 아이콘 설명</span>
      <span class="vi">&#9881;&#65039; Giải thích biểu tượng phía trên</span>
    </h3>

    <div class="screenshot">
      <img src="${images['header-icons']}" alt="Header Icons" style="image-rendering: pixelated; max-width: 500px; margin: 0 auto; display: block;">
      <div class="screenshot-caption">
        <span class="ko">상단 헤더 아이콘 (왼쪽부터: 언어변경, 테마전환, <strong style="color:var(--warning);">라인선택(⚙️)</strong>, SQL보기, 도움말, 메뉴이동)</span>
        <span class="vi">Biểu tượng header (từ trái: Ngôn ngữ, Giao diện, <strong style="color:var(--warning);">Chọn dây chuyền(⚙️)</strong>, Xem SQL, Trợ giúp, Menu)</span>
      </div>
    </div>

    <div class="callout callout-warning">
      <span class="callout-icon">&#128161;</span>
      <div>
        <p class="ko"><strong>⚙️ 아이콘(왼쪽에서 3번째)</strong>을 클릭하면 아래와 같은 <strong>"모니터링 라인 선택"</strong> 모달이 열립니다.</p>
        <p class="vi">Nhấp vào <strong>biểu tượng ⚙️ (thứ 3 từ trái)</strong> để mở modal <strong>"Chọn dây chuyền giám sát"</strong> như bên dưới.</p>
      </div>
    </div>

    <div class="screenshot">
      <img src="${images['line-select-modal']}" alt="Line Selection Modal">
      <div class="screenshot-caption">
        <span class="ko">모니터링 라인 선택 모달 — 라인을 <strong>1개만</strong> 선택 후 "적용" 클릭</span>
        <span class="vi">Modal chọn dây chuyền giám sát — Chọn <strong>chỉ 1</strong> dây chuyền rồi nhấn "Áp dụng"</span>
      </div>
    </div>

    <h3 style="color:var(--accent-light); margin: 24px 0 16px;">
      <span class="ko">&#128203; 라인 선택 방법</span>
      <span class="vi">&#128203; Cách chọn dây chuyền</span>
    </h3>

    <ol class="steps">
      <li>
        <span class="ko">제품투입현황 또는 제품포장현황 화면에서 상단 <strong>⚙️ 아이콘</strong>을 클릭합니다.</span>
        <span class="vi">Trên màn hình nhập sản phẩm hoặc đóng gói, nhấp vào <strong>biểu tượng ⚙️</strong> phía trên.</span>
      </li>
      <li>
        <span class="ko"><strong>"모니터링 라인 선택"</strong> 모달이 열리면, 모니터링할 라인을 <strong>1개만</strong> 선택합니다. (체크박스 클릭)</span>
        <span class="vi">Khi modal <strong>"Chọn dây chuyền giám sát"</strong> mở, chọn <strong>chỉ 1</strong> dây chuyền để giám sát. (Nhấp vào checkbox)</span>
      </li>
      <li>
        <span class="ko">필요 시 <strong>타이밍 설정</strong>에서 새로고침 간격(기본 90초)과 스크롤 전환 간격(기본 15초)을 조정할 수 있습니다.</span>
        <span class="vi">Nếu cần, có thể điều chỉnh <strong>cài đặt thời gian</strong>: khoảng cách làm mới (mặc định 90 giây) và chuyển đổi cuộn (mặc định 15 giây).</span>
      </li>
      <li>
        <span class="ko">하단의 <strong>"적용"</strong> 버튼을 클릭하면 선택한 라인의 모니터링이 시작됩니다.</span>
        <span class="vi">Nhấn nút <strong>"Áp dụng"</strong> ở phía dưới để bắt đầu giám sát dây chuyền đã chọn.</span>
      </li>
    </ol>

    <div class="callout callout-danger">
      <span class="callout-icon">&#10060;</span>
      <div>
        <p class="ko"><strong>주의:</strong> 라인은 반드시 <strong>1개만</strong> 선택해야 합니다. 여러 라인을 선택하면 화면이 자동 전환되어 모니터링이 어려울 수 있습니다. 또한 생산계획이 등록되지 않은 라인은 데이터가 표시되지 않습니다.</p>
        <p class="vi"><strong>Chú ý:</strong> Phải chọn <strong>chỉ 1</strong> dây chuyền. Nếu chọn nhiều dây chuyền, màn hình sẽ tự động chuyển đổi khiến khó giám sát. Ngoài ra, dây chuyền chưa đăng ký kế hoạch sản xuất sẽ không hiển thị dữ liệu.</p>
      </div>
    </div>
  </div>

  <!-- Section 7: FAQ -->
  <div class="section" id="faq">
    <div class="section-header">
      <div class="section-num">7</div>
      <h2>
        <span class="ko">자주 묻는 질문 (FAQ)</span>
        <span class="vi">Câu hỏi thường gặp (FAQ)</span>
      </h2>
    </div>

    <div style="margin-bottom: 20px;">
      <div style="background:var(--bg-card); border:1px solid var(--border); border-radius:12px; padding:20px; margin-bottom:12px;">
        <p style="color:var(--primary-light); font-weight:700; margin-bottom:8px;">
          <span class="ko">Q. 모니터링 화면에 "로딩 중..."만 표시됩니다.</span>
          <span class="vi">Q. Màn hình giám sát chỉ hiển thị "Đang tải...".</span>
        </p>
        <p>
          <span class="ko">A. DB 연결을 확인해 주세요. 옵션 설정(/display/18)에서 활성 DB 프로필이 올바른지, 연결 테스트가 성공하는지 확인합니다.</span>
          <span class="vi">A. Hãy kiểm tra kết nối DB. Trong cài đặt tùy chọn (/display/18), kiểm tra xem hồ sơ DB đang hoạt động có đúng không và kết nối thử nghiệm có thành công không.</span>
        </p>
      </div>

      <div style="background:var(--bg-card); border:1px solid var(--border); border-radius:12px; padding:20px; margin-bottom:12px;">
        <p style="color:var(--primary-light); font-weight:700; margin-bottom:8px;">
          <span class="ko">Q. Target(목표) 수량이 0으로 표시됩니다.</span>
          <span class="vi">Q. Số lượng Target (mục tiêu) hiển thị là 0.</span>
        </p>
        <p>
          <span class="ko">A. 생산계획이 등록되지 않았습니다. /display/20에서 해당 날짜, 라인, Shift의 계획을 먼저 등록해 주세요.</span>
          <span class="vi">A. Kế hoạch sản xuất chưa được đăng ký. Hãy đăng ký kế hoạch cho ngày, dây chuyền và shift tương ứng tại /display/20.</span>
        </p>
      </div>

      <div style="background:var(--bg-card); border:1px solid var(--border); border-radius:12px; padding:20px; margin-bottom:12px;">
        <p style="color:var(--primary-light); font-weight:700; margin-bottom:8px;">
          <span class="ko">Q. 라인이 자동 전환되지 않습니다.</span>
          <span class="vi">Q. Dây chuyền không tự động chuyển đổi.</span>
        </p>
        <p>
          <span class="ko">A. 해당 날짜에 한 개의 라인만 등록되어 있으면 전환 없이 고정 표시됩니다. 여러 라인을 등록하면 자동 전환됩니다.</span>
          <span class="vi">A. Nếu chỉ có một dây chuyền được đăng ký cho ngày đó, nó sẽ hiển thị cố định. Đăng ký nhiều dây chuyền để tự động chuyển đổi.</span>
        </p>
      </div>

      <div style="background:var(--bg-card); border:1px solid var(--border); border-radius:12px; padding:20px; margin-bottom:12px;">
        <p style="color:var(--primary-light); font-weight:700; margin-bottom:8px;">
          <span class="ko">Q. SOLUM CTQ 프로그램과 무엇이 다른가요?</span>
          <span class="vi">Q. Có gì khác so với chương trình SOLUM CTQ?</span>
        </p>
        <p>
          <span class="ko">A. 기능은 동일하지만 웹 기반으로 변경되어 별도 설치 없이 브라우저에서 바로 사용할 수 있습니다. 다국어(한국어/영어/베트남어/스페인어) 지원과 다크 모드가 추가되었습니다.</span>
          <span class="vi">A. Chức năng tương tự nhưng đã chuyển sang nền tảng web, có thể sử dụng trực tiếp trên trình duyệt mà không cần cài đặt. Đã thêm hỗ trợ đa ngôn ngữ (Hàn/Anh/Việt/Tây Ban Nha) và chế độ tối.</span>
        </p>
      </div>

      <div style="background:var(--bg-card); border:1px solid var(--border); border-radius:12px; padding:20px;">
        <p style="color:var(--primary-light); font-weight:700; margin-bottom:8px;">
          <span class="ko">Q. 다크 모드 / 라이트 모드를 변경하고 싶습니다.</span>
          <span class="vi">Q. Tôi muốn thay đổi chế độ tối / sáng.</span>
        </p>
        <p>
          <span class="ko">A. 화면 상단 헤더바의 달(🌙) 아이콘을 클릭하면 테마가 전환됩니다.</span>
          <span class="vi">A. Nhấp vào biểu tượng mặt trăng (🌙) trên thanh header phía trên để chuyển đổi giao diện.</span>
        </p>
      </div>
    </div>
  </div>

</div>

<!-- Footer -->
<footer>
  <p>SOLUM MES Web Display — PBA Monitoring User Manual</p>
  <p style="margin-top:4px; opacity:0.6;">Generated 2026-03-30 | Version 2.0</p>
</footer>

<script>
function setLang(lang) {
  document.body.className = lang === 'vi' ? 'lang-vi' : '';
  document.querySelectorAll('.lang-toggle button').forEach(btn => {
    btn.classList.toggle('active',
      (lang === 'ko' && btn.textContent === '한국어') ||
      (lang === 'vi' && btn.textContent === 'Tiếng Việt')
    );
  });
}
</script>
</body>
</html>`;

fs.writeFileSync(path.join(dir, '..', '..', 'pba-monitoring-manual.html'), html, 'utf-8');
console.log('Manual HTML generated: pba-monitoring-manual.html');
