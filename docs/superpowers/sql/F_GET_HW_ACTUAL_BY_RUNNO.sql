CREATE OR REPLACE FUNCTION F_GET_HW_ACTUAL_BY_RUNNO(
    p_run_no  VARCHAR2,
    p_org_id  NUMBER DEFAULT 1
) RETURN NUMBER
/*
 * IP_PRODUCT_2D_BARCODE(로컬)의 RUN_NO 기준 SERIAL_NO 목록 중
 * HW_VW_LTS_BOARD(DBLINK_HANHWA)에 BoardSN 으로 등록된 수량을 COUNT한다.
 *
 * 집계 방식:
 *   1. 로컬 IP_PRODUCT_2D_BARCODE 에서 RUN_NO = p_run_no 인 행을 outer query 로 조회
 *   2. 각 SERIAL_NO 가 HW_VW_LTS_BOARD."BoardSN" 에 존재하면 카운트
 *   3. DBLINK 를 EXISTS 서브쿼리로 사용 — Oracle 이 로컬 행마다 원격 조회
 *
 * 조건:
 *   - p_run_no 가 NULL 이면 즉시 0 반환
 *   - DBLINK 장애 시 EXCEPTION 으로 0 반환 (뷰 전체 실패 방지)
 *
 * 사용 예)
 *   SELECT F_GET_HW_ACTUAL_BY_RUNNO('RC2026041200001', 1) FROM DUAL;
 *
 * IRPT_PRODUCT_LINE_TARGET_MONITORING 뷰에서:
 *   F_GET_HW_ACTUAL_BY_RUNNO(rc.run_no, pl.organization_id) AS actual_qty
 */
IS
    v_cnt  NUMBER := 0;
BEGIN
    ------------------------------------------------------------
    -- 1. RUN_NO 없으면 DBLINK 호출 없이 즉시 반환
    ------------------------------------------------------------
    IF p_run_no IS NULL THEN
        RETURN 0;
    END IF;

    ------------------------------------------------------------
    -- 2. 로컬 바코드 목록 중 DBLINK 에 존재하는 수량 COUNT
    --    EXISTS 방향: 로컬(outer) → DBLINK(exists) 로 실행됨
    ------------------------------------------------------------
    SELECT COUNT(*)
      INTO v_cnt
      FROM IP_PRODUCT_2D_BARCODE bc
     WHERE bc.RUN_NO          = p_run_no
       AND bc.ORGANIZATION_ID = p_org_id
       AND EXISTS (
               SELECT 1
                 FROM HW_VW_LTS_BOARD b
                WHERE b."BoardSN" = bc.SERIAL_NO
           );

    RETURN NVL(v_cnt, 0);

EXCEPTION
    WHEN OTHERS THEN
        -- DBLINK 장애 또는 원격 오류 발생 시 0 반환 (뷰 전체 실패 방지)
        RETURN 0;
END F_GET_HW_ACTUAL_BY_RUNNO;
