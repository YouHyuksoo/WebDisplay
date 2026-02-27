# PowerBuilder 소스 분석 - Window ↔ DataWindow 연결 관계

## 메뉴 구조

`w_main_menu2.srw`가 실제 메인 메뉴 (3개 패널 가로 배치)

| 패널 | 소스 | 카테고리 | 메뉴 ID 범위 |
|------|------|----------|-------------|
| uo_1 | `u_main_menu_main.sru` | 관리설정 (Management) | 11~18 |
| uo_2 | `u_main_menu_monitoring.sru` | 모니터링 (Monitoring) | 21~28 |
| uo_3 | `u_main_menu_mold.sru` | 품질관리 | 31~38 |

---

## 활성 화면 - DataWindow 연결 매핑

### 1. 조립 생산 현황 (메뉴 12)
- **Window**: `w_display_assy_production_status.srw`
- **타이틀**: "Production Status (ASS'Y)"
- **DataWindows**:
  - `dw_1` → `d_display_assy_product_status_lst2` (메인 목록)
- **팝업**: `w_line_multi_select_flat` (라인 다중 선택)
- **설정 참조**: `DISPLAY.INI > LINEINFO > LINE_CODE`
- **자동갱신**: Timer 기반 스크롤 + 페이지 전환

### 2. Processing Error 목록 (메뉴 16)
- **Window**: `w_display_machine_log_gather_error_list.srw`
- **타이틀**: "Machine Log Processing Error List"
- **DataWindows**:
  - `dw_1` → `d_display_machine_log_gather_list_error` (에러 목록)
  - `dw_2` → `d_display_solder_waring_ng_count2` (NG 카운트, hidden)
- **자동갱신**: Timer 기반 페이지 스크롤

### 3. Display 옵션 설정 (메뉴 18)
- **Window**: `w_display_option.srw` (68KB, 가장 큰 화면)
- **타이틀**: 설정 화면 (타이머/색상/폰트/듀얼모니터 등)
- **DataWindows**: 없음 (설정 UI만)
- **팝업**: `w_connect_popup`, `w_remocon_test_flat`
- **역할**: DISPLAY.INI, SYSTEM.INI 설정값 변경

### 4. SMT 픽업률 (메뉴 21)
- **Window**: `w_display_smt_pickup_rate.srw`
- **타이틀**: "SMT Pickup Rate"
- **DataWindows**:
  - `dw_1` → `d_display_smt_pickup_rate_lst2` (픽업률 목록)
  - `dw_2` → `d_display_smt_pickup_rate_ng_count_ys` (NG 카운트, hidden)
- **팝업**: `w_line_select_flat` (단일), `w_line_multi_select_flat` (다중)
- **설정 참조**: `DISPLAY.INI > SMD_LINEINFO > SMD_LINE_CODE`

### 5. 온도/습도 현황 (메뉴 22)
- **Window**: `w_display_temparture_status_ye.srw`
- **타이틀**: "Temprature Status"
- **DataWindows**:
  - `dw_1` → `d_display_temperature_status_ye_img` (온도 현황 + 이미지)
  - `dw_2` → `d_display_temperature_ng_count` (NG 카운트, hidden, 경고음)
- **팝업**: `w_machine_type_select_flat`, `w_machine_multi_select_flat`
- **클릭 액션**: MACHINE_NAME 클릭 시 `w_display_machine_status_detail_popup` 오픈
- **경고음**: NG 발생 시 `temparture.wav` 재생
- **설정 참조**: `DISPLAY.INI > MACHINEINFO > MACHINE_CODE`

### 6. Foolproof 상태 (메뉴 23)
- **Window**: `w_display_machine_foolproof_status.srw`
- **타이틀**: "Foolproof Status"
- **DataWindows**:
  - `dw_1` → `d_display_machine_foolproof_status_check_items` (상태 체크 항목)
- **팝업**: `w_line_multi_select_flat` (라인 다중 선택)
- **설정 참조**: `DISPLAY.INI > LINEINFO > LINE_CODE`
- **다국어**: `f_dual_lang_change_dwtext_dynamic()` 호출

### 7. SMD 기계 상태 (메뉴 24)
- **Window**: `w_display_machine_status_smd.srw`
- **타이틀**: SMD 라인별 기계 상태
- **DataWindows**:
  - `dw_1` → `d_display_machine_status_check_items_smd` (SMD 체크 항목)
  - `dw_2` → `d_display_machine_status_es` (기계 상태 요약, hidden)
- **팝업**: `w_line_multi_select_flat_smd` (SMD 라인 선택)

### 8. 생산 현황 (메뉴 25)
- **Window**: `w_display_machine_production_status.srw`
- **타이틀**: 생산 현황
- **DataWindows**:
  - `dw_1` → `d_display_machine_status_check_items_imd` (IMD 체크 항목)
- **팝업**: `w_line_multi_select_flat` (라인 다중 선택)

### 9. SMD 단일라인 상태 (메뉴 26)
- **Window**: `w_display_machine_status_single_smd.srw`
- **타이틀**: SMD 단일라인 상세
- **DataWindows**:
  - `dw_1` → `d_display_machine_status_check_items_single_smd` (단일 라인 체크)
  - `dw_2` → `d_display_machine_status_single` (기계 상태 단일, hidden)
- **팝업**: `w_line_multi_select_flat_smd_single` (SMD 단일라인 선택)

### 10. 수리 상태 그래프 (메뉴 27)
- **Window**: `w_display_repair_status_graph.srw`
- **타이틀**: 수리 상태
- **DataWindows**:
  - `dw_1` → `d_display_repair_status_raw` (수리 데이터)

### 11. 납땜 경고 목록 (메뉴 28)
- **Window**: `w_display_solder_warning_list.srw`
- **타이틀**: Solder Paste 경고
- **DataWindows**:
  - `dw_1` → `d_display_solder_waring_list_duckil3` (납땜 경고 목록)
  - `dw_2` → `d_display_solder_waring_ng_count2` (NG 카운트, hidden)

### 12. 장기재고 목록 (메뉴 31)
- **Window**: `w_display_product_marking_passed_list.srw`
- **타이틀**: Long Term Inventory
- **DataWindows**:
  - `dw_1` → `d_display_product_marking_passed_list` (마킹 합격 목록)
- **팝업**: `w_line_select_flat`, `w_line_multi_select_flat`

### 13. SMT 픽업률 Head (메뉴 35)
- **Window**: `w_display_smt_pickup_rate_head.srw`
- **타이틀**: SMT Pickup Rate (Head)
- **DataWindows**:
  - `dw_1` → `d_display_smt_pickup_rate_lst2_head` (Head 픽업률)
  - `dw_2` → `d_display_smt_pickup_rate_ng_count_ys_head` (NG 카운트, hidden)
- **팝업**: `w_line_select_flat`, `w_line_multi_select_flat`

### 14. SMT 픽업률 Base (메뉴 36)
- **Window**: `w_display_smt_pickup_rate_base.srw`
- **타이틀**: SMT Pickup Rate (Base)
- **DataWindows**:
  - `dw_1` → `d_display_smt_pickup_rate_lst2_base` (Base 픽업률)
  - `dw_2` → `d_display_smt_pickup_rate_ng_count_ys_base` (NG 카운트, hidden)
- **팝업**: `w_line_select_flat`, `w_line_multi_select_flat`

### 15. MSL 경고 - 자재 (메뉴 37)
- **Window**: `w_display_msl_warning_list.srw`
- **타이틀**: MSL Warning (자재)
- **DataWindows**:
  - `dw_1` → `d_display_msl_waring_list` (MSL 경고 목록)
  - `dw_2` → `d_display_msl_waring_ng_count` (NG 카운트, hidden)
- **팝업**: `w_line_select_flat`, `w_line_multi_select_flat`

### 16. MSL 경고 - 이슈 (메뉴 38)
- **Window**: `w_display_msl_warning_list_issue_item.srw`
- **타이틀**: MSL Warning (이슈 아이템)
- **DataWindows**:
  - `dw_1` → `d_display_msl_waring_list_issue_item` (이슈 목록)
  - `dw_2` → `d_display_msl_waring_ng_count_issue_item` (NG 카운트, hidden)

---

## 비활성이지만 존재하는 화면 (참고용)

| Window | DataWindows | 비고 |
|--------|-------------|------|
| `w_display_machine_status` | `d_display_machine_status_check_items`, `d_display_machine_status` | 기본 기계 상태 |
| `w_display_machine_status_imd` | `d_display_machine_status_check_items_imd`, `d_display_machine_status` | IMD 기계 상태 |
| `w_display_machine_status_complex` | `d_display_product_target_complex`, `d_display_product_ng_complex_graph`, `d_display_machine_status_complex_top1`, `d_display_machine_status_complex_top2` | 복합 화면 |
| `w_display_machine_pba_status` | `d_display_machine_pba_status` | PBA 상태 |
| `w_display_product_kpi_status` | `d_display_line_kpi_status` | KPI (차트 팝업 다수) |
| `w_display_qc_notify_list` | `d_display_qc_notify_list` | QC 알림 |
| `w_display_smt_pickup_rate_ys` | `d_display_smt_pickup_rate_lst_ys`, `d_display_smt_pickup_rate_ng_count_ys` | YS 픽업률 |
| `w_display_smt_status` | (확인 필요) | SMT 현황 |

---

## 공통 패턴

### 화면 구조 (모든 활성 화면 공통)
```
┌─────────────────────────────────────┐
│ [Exit] st_title           em_clock  │  ← 헤더 (타이틀 + 시계)
├─────────────────────────────────────┤
│                                     │
│              dw_1                    │  ← 메인 DataWindow (전체 영역)
│         (메인 데이터 표시)            │
│                                     │
├─────────────────────────────────────┤
│ st_message                          │  ← 하단 메시지바 (조직명)
└─────────────────────────────────────┘
  dw_2 (hidden) - NG 카운트/경고용
```

### Timer 기반 자동 갱신
- 모든 화면: `Gvi_scroll_timer` 간격으로 Timer 이벤트 발생
- 데이터가 한 페이지 이내 → `wf_retrieve()` 재조회
- 데이터가 페이지 초과 → `scrollnextpage()` 자동 스크롤
- 마지막 페이지 → 처음으로 돌아가 재조회

### 자동 리사이즈
- `wf_size_it()` / `wf_resize_it()` 함수로 윈도우 리사이즈 시 모든 컨트롤 비율 유지
- DataWindow은 zoom 속성으로 확대/축소
- `maximized` 팝업 윈도우로 전체화면 표시

### 라인/기계 필터링
- `Key0!` → 단일 선택 팝업 (`w_line_select_flat`)
- `KeyEqual!` → 다중 선택 팝업 (`w_line_multi_select_flat` 계열)
- 선택된 코드는 `DISPLAY.INI`에 저장/로드
- 글로벌 배열 `Gvs_multi_line_code[]`, `Gvs_multi_machine_code[]` 로 전달

### 듀얼 모니터
- `Gvs_monitor_type = 'E'` → 확장 모니터 위치(`Gvl_dual_monitor_x`)로 이동

### 다국어 지원
- `f_dual_lang_change_dwtext_dynamic(dw, language)` 로 DW 텍스트 동적 변환
- `gvs_language` 글로벌 변수 (KR/EN/CN)

### 경고음 시스템
- 온도: `temparture.wav` (dw_2 NG 카운트 > 0)
- MSL: `msl.wav` (주석 처리된 코드에서 확인)

---

## DataWindow → srd 파일 매핑 (활성 화면용)

| DataWindow 이름 | srd 파일 | 용도 |
|-----------------|----------|------|
| `d_display_assy_product_status_lst2` | `d_display_assy_product_status_lst2.srd` (61KB) | 조립 생산 현황 |
| `d_display_machine_log_gather_list_error` | `d_display_machine_log_gather_list_error.srd` | Processing Error |
| `d_display_smt_pickup_rate_lst2` | `d_display_smt_pickup_rate_lst2.srd` | SMT 픽업률 |
| `d_display_smt_pickup_rate_ng_count_ys` | `d_display_smt_pickup_rate_ng_count_ys.srd` | SMT NG 카운트 |
| `d_display_temperature_status_ye_img` | `d_display_temperature_status_ye_img.srd` (28KB) | 온도 현황 |
| `d_display_temperature_ng_count` | `d_display_temperature_ng_count.srd` | 온도 NG 카운트 |
| `d_display_machine_foolproof_status_check_items` | `d_display_machine_foolproof_status_check_items.srd` (68KB) | Foolproof 체크 |
| `d_display_machine_status_check_items_smd` | `d_display_machine_status_check_items_smd.srd` (68KB) | SMD 체크 항목 |
| `d_display_machine_status_es` | `d_display_machine_status_es.srd` (46KB) | 기계 상태 요약 |
| `d_display_machine_status_check_items_imd` | `d_display_machine_status_check_items_imd.srd` (40KB) | IMD 체크 항목 |
| `d_display_machine_status_check_items_single_smd` | `d_display_machine_status_check_items_single_smd.srd` (35KB) | 단일 SMD 체크 |
| `d_display_machine_status_single` | `d_display_machine_status_single.srd` (47KB) | 기계 상태 단일 |
| `d_display_repair_status_raw` | `d_display_repair_status_raw.srd` | 수리 데이터 |
| `d_display_solder_waring_list_duckil3` | `d_display_solder_waring_list_duckil3.srd` | 납땜 경고 |
| `d_display_solder_waring_ng_count2` | `d_display_solder_waring_ng_count2.srd` | 납땜 NG 카운트 |
| `d_display_product_marking_passed_list` | `d_display_product_marking_passed_list.srd` | 마킹 합격 |
| `d_display_smt_pickup_rate_lst2_head` | `d_display_smt_pickup_rate_lst2_head.srd` | Head 픽업률 |
| `d_display_smt_pickup_rate_ng_count_ys_head` | `d_display_smt_pickup_rate_ng_count_ys_head.srd` | Head NG 카운트 |
| `d_display_smt_pickup_rate_lst2_base` | `d_display_smt_pickup_rate_lst2_base.srd` | Base 픽업률 |
| `d_display_smt_pickup_rate_ng_count_ys_base` | `d_display_smt_pickup_rate_ng_count_ys_base.srd` | Base NG 카운트 |
| `d_display_msl_waring_list` | `d_display_msl_waring_list.srd` | MSL 경고 자재 |
| `d_display_msl_waring_ng_count` | `d_display_msl_waring_ng_count.srd` | MSL NG 카운트 |
| `d_display_msl_waring_list_issue_item` | `d_display_msl_waring_list_issue_item.srd` | MSL 이슈 |
| `d_display_msl_waring_ng_count_issue_item` | `d_display_msl_waring_ng_count_issue_item.srd` | MSL 이슈 NG |

---

## 선택 팝업 윈도우 (공용 컴포넌트)

| 팝업 Window | 용도 | 호출하는 화면 |
|-------------|------|-------------|
| `w_line_select_flat` | 라인 단일 선택 | SMT픽업률, 장기재고, MSL, SMT Head/Base, QC |
| `w_line_multi_select_flat` | 라인 다중 선택 | 조립생산, Foolproof, 생산현황, 장기재고, MSL, SMT Head/Base, QC |
| `w_line_multi_select_flat_smd` | SMD 라인 선택 | SMD 기계 상태 |
| `w_line_multi_select_flat_smd_single` | SMD 단일라인 선택 | SMD 단일라인 |
| `w_line_multi_select_flat_imd` | IMD 라인 선택 | IMD 기계 상태 |
| `w_machine_type_select_flat` | 기계 유형 선택 | 온도현황 |
| `w_machine_multi_select_flat` | 기계 다중 선택 | 온도현황 |
| `w_channel_flat` | 채널 선택 (리모컨) | 메인 메뉴 |

---

## 글로벌 변수 (주요)

| 변수 | 타입 | 용도 |
|------|------|------|
| `Gvi_organization_id` | integer | 조직 ID |
| `Gvs_organization_name` | string | 조직명 |
| `Gvs_language` | string | 언어 (KR/EN/CN) |
| `Gvs_monitor_type` | string | 모니터 타입 (E=확장) |
| `Gvl_dual_monitor_x` | long | 듀얼 모니터 X 위치 |
| `Gvi_scroll_timer` | integer | 스크롤 타이머 간격 |
| `Gvi_menu_change_interval` | integer | 메뉴 자동 전환 간격 |
| `Gvs_selected_menu` | string | 현재 선택된 메뉴 번호 |
| `Gvs_selected_menu_value[]` | string[] | 자동 전환 메뉴 목록 |
| `Gvs_multi_line_code[]` | string[] | 선택된 라인 코드 배열 |
| `Gvs_multi_machine_code[]` | string[] | 선택된 기계 코드 배열 |
| `Gvi_db_status` | integer | DB 연결 상태 (1=정상) |
| `Gvl_title_text_color` | long | 타이틀 텍스트 색상 |
| `Gvl_title_back_color` | long | 타이틀 배경 색상 |
| `Gvl_dw_background_color` | long | DW 배경색 |
| `Gvl_dw_background_color_odd` | long | DW 홀수행 배경색 |
