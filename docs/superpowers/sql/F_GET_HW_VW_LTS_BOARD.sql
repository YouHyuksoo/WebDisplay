CREATE OR REPLACE FUNCTION F_GET_HW_VW_LTS_BOARD(
    p_line_code   VARCHAR2,
    p_org_id      NUMBER  DEFAULT 1,
    p_base_dt     DATE    DEFAULT SYSDATE
) RETURN NUMBER
/*
 * HW_VW_LTS_BOARD(DBLINK_HANHWA) 에서 당일 주간(A조) 생산 실적을 집계한다.
 *
 * 집계 범위:
 *   F_GET_WORK_ACTUAL_DATE(p_base_dt, 'S')  ~  p_base_dt
 *   'S' 타입 = 당일 주간 시작 시각 (현재 08:00 경계 기준, 반환은 07:30)
 *   08:00 이전 호출 시: 전날 07:30 부터 현재까지 (전날 야간 실적 기준)
 *   08:00 이후 호출 시: 당일 07:30 부터 현재까지 (당일 주간 실적 기준)
 *
 * 매핑 규칙:
 *   IP_PRODUCT_LINE.LINE_NAME_NUM → 한화 시스템 LineNm 'MOBIS N'
 *   예) LINE_CODE='01'(S01, NUM=1) → 'MOBIS 1'
 *       LINE_CODE='02'(S02, NUM=2) → 'MOBIS 2'
 *
 * 집계 방식:
 *   - 동일 기판(BoardSN) 이 라인 내 여러 설비를 경유하여 중복 등장
 *   - 시프트 범위 내 첫 번째 설비(StartDt 기준 가장 이른 EqpNm) 기록만 카운트
 *   - 입구 설비는 기판당 1건이므로 COUNT(*) = COUNT(DISTINCT BoardSN)
 *   - 양면 기판은 Front/Rear 가 다른 바코드 → 각각 별도 카운트
 *
 * 조건:
 *   - LINE_NAME_NUM <= 0 이거나 NULL 이면 DBLINK 호출 없이 즉시 0 반환
 *   - DBLINK 장애·원격 오류 시 EXCEPTION 으로 0 반환 (뷰 전체 실패 방지)
 *
 * 사용 예)
 *   SELECT F_GET_HW_VW_LTS_BOARD('01', 1, SYSDATE) FROM DUAL;  -- S01(MOBIS 1) 당일 주간 실적
 *   SELECT F_GET_HW_VW_LTS_BOARD('02', 1, SYSDATE) FROM DUAL;  -- S02(MOBIS 2) 당일 주간 실적
 *
 * IRPT_PRODUCT_LINE_TARGET_MONITORING 뷰에서:
 *   F_GET_HW_VW_LTS_BOARD(pl.line_code, pl.organization_id) AS actual_qty
 */
IS
    v_line_num      IP_PRODUCT_LINE.LINE_NAME_NUM%TYPE;
    v_hw_line_nm    VARCHAR2(100);
    v_shift_start   DATE;
    v_first_eqp     VARCHAR2(100);
    v_cnt           NUMBER := 0;
BEGIN
    ------------------------------------------------------------
    -- 1. 라인 순번 조회 (IP_PRODUCT_LINE.LINE_NAME_NUM)
    ------------------------------------------------------------
    BEGIN
        SELECT LINE_NAME_NUM
          INTO v_line_num
          FROM IP_PRODUCT_LINE
         WHERE LINE_CODE       = p_line_code
           AND ORGANIZATION_ID = p_org_id;
    EXCEPTION
        WHEN NO_DATA_FOUND THEN
            RETURN 0;
    END;

    ------------------------------------------------------------
    -- 2. LINE_NAME_NUM 이 유효하지 않으면 DBLINK 호출 없이 반환
    ------------------------------------------------------------
    IF v_line_num IS NULL OR v_line_num <= 0 THEN
        RETURN 0;
    END IF;

    -- 한화 시스템 라인명 구성: 'MOBIS N'
    v_hw_line_nm := 'MOBIS ' || TO_CHAR(v_line_num);

    ------------------------------------------------------------
    -- 3. 당일 주간 시작 시각 계산 (F_GET_WORK_ACTUAL_DATE 위임)
    --    'S' = 주간 시작 시각 (SMTWORKTIME 기준 날짜 판단 후 07:30 반환)
    --    08:00 이전: 전날 07:30 / 08:00 이후: 당일 07:30
    ------------------------------------------------------------
    v_shift_start := F_GET_WORK_ACTUAL_DATE(p_base_dt, 'S');

    ------------------------------------------------------------
    -- 4. 시프트 범위 내 첫 번째 설비(EqpNm) 조회 (DBLINK)
    --    시프트 시작 이후 가장 이른 StartDt 기준
    ------------------------------------------------------------
    BEGIN
        SELECT t."EqpNm"
          INTO v_first_eqp
          FROM (
               SELECT b."EqpNm"
                 FROM HW_VW_LTS_BOARD b
                WHERE b."LineNm"   = v_hw_line_nm
                  AND b."StartDt" >= v_shift_start   -- 주간 시작(07:30) 이후
                  AND b."StartDt" <= p_base_dt        -- 현재 시각까지
                ORDER BY b."StartDt" ASC
               ) t
         WHERE ROWNUM = 1;
    EXCEPTION
        WHEN NO_DATA_FOUND THEN
            RETURN 0;  -- 해당 시프트에 데이터 없음
    END;

    ------------------------------------------------------------
    -- 5. 첫 번째 설비 기록만 집계
    --    입구 설비는 기판당 1건이므로 COUNT(*) 사용
    ------------------------------------------------------------
    SELECT COUNT(*)
      INTO v_cnt
      FROM HW_VW_LTS_BOARD b
     WHERE b."LineNm"   = v_hw_line_nm
       AND b."EqpNm"    = v_first_eqp
       AND b."StartDt" >= v_shift_start
       AND b."StartDt" <= p_base_dt;

    RETURN NVL(v_cnt, 0);

EXCEPTION
    WHEN OTHERS THEN
        -- DBLINK 장애 또는 원격 오류 발생 시 0 반환 (뷰 전체 실패 방지)
        RETURN 0;
END F_GET_HW_VW_LTS_BOARD;
