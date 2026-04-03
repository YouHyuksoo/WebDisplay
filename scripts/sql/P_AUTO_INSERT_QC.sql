CREATE OR REPLACE PROCEDURE P_AUTO_INSERT_QC (
  p_barcode       IN VARCHAR2,
  p_log_id        IN VARCHAR2,
  p_equipment_id  IN VARCHAR2,
  p_workstage_code IN VARCHAR2
)
IS
  v_line_code   VARCHAR2(10);
  v_model_name  VARCHAR2(50);
  v_item_code   VARCHAR2(20);
  v_shift_code  VARCHAR2(2);
BEGIN
  -- SHIFT_CODE: 08:00~20:00 = '1'(주간), 20:00~08:00 = '2'(야간)
  IF TO_NUMBER(TO_CHAR(SYSDATE, 'HH24')) >= 8
     AND TO_NUMBER(TO_CHAR(SYSDATE, 'HH24')) < 20 THEN
    v_shift_code := '1';
  ELSE
    v_shift_code := '2';
  END IF;
  -- IP_PRODUCT_2D_BARCODE에서 LINE_CODE, MODEL_NAME, ITEM_CODE 조회
  BEGIN
    SELECT LINE_CODE, MODEL_NAME, ITEM_CODE
    INTO v_line_code, v_model_name, v_item_code
    FROM IP_PRODUCT_2D_BARCODE
    WHERE SERIAL_NO = p_barcode
      AND ROWNUM = 1;
  EXCEPTION
    WHEN NO_DATA_FOUND THEN
      v_line_code  := NULL;
      v_model_name := '*';
      v_item_code  := NULL;
  END;

  -- IP_PRODUCT_WORK_QC INSERT (시퀀스: SEQ_QC_REPAIR_SEQUENCE)
  INSERT INTO IP_PRODUCT_WORK_QC (
    SERIAL_NO,
    ITEM_CODE,
    LOG_ID,
    QC_DATE,
    QC_SEQUENCE,
    QC_RESULT,
    RECEIPT_DEFICIT,
    QC_INSPECT_HANDLING,
    BAD_REASON_CODE,
    REPAIR_DIVISION,
    REPAIR_RESULT_CODE,
    WORKSTAGE_CODE,
    LINE_CODE,
    MACHINE_CODE,
    MODEL_NAME,
    SHIFT_CODE,
    ORGANIZATION_ID,
    DEFECT_QTY,
    BAD_QTY,
    ENTER_BY,
    ENTER_DATE,
    LAST_MODIFY_BY,
    LAST_MODIFY_DATE
  ) VALUES (
    p_barcode,
    v_item_code,
    p_log_id,
    SYSDATE,
    SEQ_QC_REPAIR_SEQUENCE.NEXTVAL,
    'O',           -- QC RESULT: 가성
    '1',           -- RECEIPT DEFICIT: 1입고
    'W',           -- QC INSPECT HANDLING: 대기
    'B',           -- BAD REASON CODE: 기능불량
    'P',           -- REPAIR DIVISION: PBA
    'W',           -- REPAIR RESULT CODE: 대기
    p_workstage_code,
    v_line_code,
    p_equipment_id,
    v_model_name,
    v_shift_code,
    1,             -- ORGANIZATION_ID
    1,             -- DEFECT_QTY
    1,             -- BAD_QTY
    'AUTO_QC',     -- ENTER_BY
    SYSDATE,       -- ENTER_DATE
    'AUTO_QC',     -- LAST_MODIFY_BY
    SYSDATE        -- LAST_MODIFY_DATE
  );

EXCEPTION
  WHEN OTHERS THEN
    -- 자동 등록 실패 시 원본 LOG INSERT는 영향 없도록 예외 무시
    NULL;
END P_AUTO_INSERT_QC;
/
