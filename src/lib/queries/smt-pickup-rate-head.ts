/**
 * @file smt-pickup-rate-head.ts
 * @description SMT 픽업률현황(HEAD) 화면(메뉴 35) SQL 쿼리.
 * 초보자 가이드: PowerBuilder 원본 d_display_smt_pickup_rate_lst2_head.srd에서 추출한 SQL.
 * IQ_MACHINE_INSPECT_PICKUP_RATE 테이블에서 HEAD 아이템만 필터하여 라인별 픽업률을 조회한다.
 * BASE 화면과 동일한 구조이나, ITEM_CODE = 'HEAD' 조건으로 HEAD 부품만 대상.
 *
 * 원본 PB 컬럼 순서: Line Name → Takeup Count → Miss Count → Realize Count
 *                    → Pickup Rate(%) → PPM → Ng Position
 * 경고 로직: LINE_WARNING_SIGN 'W' = 99.00~99.50%, 'S' = <=99.00%
 *           ITEM_WARNING_SIGN 'S' = 개별 위치 NG (T_CNT>500 & miss+realize>=1%)
 *
 * [최적화] ngCount는 list 결과의 ITEM_WARNING_SIGN='S' 행 수로 앱에서 계산.
 *          별도 ngCount SQL을 DB에 보내지 않아 DB 부하를 절반으로 줄임.
 */

/**
 * 픽업률(HEAD) 메인 리스트 조회 (d_display_smt_pickup_rate_lst2_head).
 * BASE와 동일 구조, ITEM_CODE = 'HEAD' 필터 적용.
 *
 * 반환 컬럼 중 ITEM_WARNING_SIGN이 'S'인 행의 수가 곧 ngCount.
 * API route에서 앱 레벨로 계산하므로 별도 ngCount 쿼리 불필요.
 */
export function sqlSmtPickupRateHeadList(): string {
  return `
SELECT M.LINE_NAME,
       M.T_CNT,
       M.M_CNT,
       M.R_CNT,
       M.GOOD_RATE,
       M.PPM,
       D.NG_POSITION,
       M.LINE_WARNING_SIGN,
       D.ITEM_WARNING_SIGN
  FROM (
        SELECT LINE_CODE,
               F_GET_LINE_NAME(LINE_CODE, 1) LINE_NAME,
               T_CNT,
               M_CNT,
               R_CNT,
               DECODE(T_CNT, 0, NULL, ROUND((100 - (M_CNT + R_CNT) / T_CNT * 100), 2)) GOOD_RATE,
               DECODE(T_CNT, 0, NULL, ROUND((M_CNT + R_CNT) / T_CNT * 1000000))         PPM,
               CASE WHEN (
                           DECODE(T_CNT, 0, NULL, ROUND((100 - (M_CNT + R_CNT) / T_CNT * 100), 2)) < 99.50 AND
                           DECODE(T_CNT, 0, NULL, ROUND((100 - (M_CNT + R_CNT) / T_CNT * 100), 2)) > 99.00
                         ) THEN 'W'
                    WHEN (
                           DECODE(T_CNT, 0, NULL, ROUND((100 - (M_CNT + R_CNT) / T_CNT * 100), 2)) <= 99.00
                         ) THEN 'S'
               END LINE_WARNING_SIGN
          FROM (
                SELECT LINE_CODE,
                       SUM(T_CNT) T_CNT,
                       SUM(M_CNT) M_CNT,
                       SUM(R_CNT) R_CNT
                  FROM (
                        SELECT LINE_CODE,
                               SUM(DECODE(DATA_TYPE, 'T', DECODE(SIGN(SIM_COUNT), -1, HEAD_SUM, NVL(SIM_COUNT, HEAD_SUM)))) T_CNT,
                               SUM(DECODE(DATA_TYPE, 'M', DECODE(SIGN(SIM_COUNT), -1, HEAD_SUM, NVL(SIM_COUNT, HEAD_SUM)))) M_CNT,
                               SUM(DECODE(DATA_TYPE, 'R', DECODE(SIGN(SIM_COUNT), -1, HEAD_SUM, NVL(SIM_COUNT, HEAD_SUM)))) R_CNT
                          FROM (
                                SELECT T.LINE_CODE,
                                       T.ACTUAL_DATE,
                                       T.ACTUAL_TIME,
                                       T.MACHINE_CODE,
                                       T.PROGRAM_NAME,
                                       T.ADDRESS,
                                       T.SUB_ADDRESS,
                                       T.ITEM_CODE,
                                       T.DATA_TYPE,
                                       T.HEAD_SUM,
                                       DECODE(NVL(MACHINE_TYPE, 'CM'), 'NPM', T.HEAD_SUM,
                                         HEAD_SUM - LAG(HEAD_SUM) OVER (
                                           PARTITION BY LINE_CODE, MACHINE_CODE, PROGRAM_NAME,
                                                        ADDRESS, SUB_ADDRESS, ITEM_CODE, DATA_TYPE
                                               ORDER BY LINE_CODE, MACHINE_CODE, PROGRAM_NAME,
                                                        ADDRESS, SUB_ADDRESS, ITEM_CODE, DATA_TYPE,
                                                        ACTUAL_DATE, ACTUAL_TIME
                                         )
                                       ) SIM_COUNT
                                  FROM IQ_MACHINE_INSPECT_PICKUP_RATE T
                                 WHERE (
                                         (ACTUAL_DATE = TRUNC(SYSDATE))
                                         OR (ACTUAL_DATE = TRUNC(SYSDATE - 1) AND ACTUAL_TIME = 'J')
                                       )
                                   AND ITEM_CODE = 'HEAD'
                               )
                         WHERE ACTUAL_DATE = TRUNC(SYSDATE)
                         GROUP BY LINE_CODE
                       )
                 GROUP BY LINE_CODE
               )
       ) M,
       (
         SELECT LINE_CODE,
                LISTAGG(
                  '[' || MACHINE_CODE || '-' || ADDRESS || '-' || SUB_ADDRESS || ' : ' || TO_CHAR(M_CNT + R_CNT) || ']'
                ) WITHIN GROUP (
                  ORDER BY MACHINE_CODE || '-' || ADDRESS || '-' || SUB_ADDRESS || TO_CHAR(M_CNT + R_CNT)
                ) NG_POSITION,
                'S' ITEM_WARNING_SIGN
           FROM (
                 SELECT LINE_CODE,
                        MACHINE_CODE,
                        ADDRESS,
                        SUB_ADDRESS,
                        ITEM_CODE,
                        SUM(DECODE(DATA_TYPE, 'T', DECODE(SIGN(SIM_COUNT), -1, HEAD_SUM, NVL(SIM_COUNT, HEAD_SUM)), 0)) T_CNT,
                        SUM(DECODE(DATA_TYPE, 'M', DECODE(SIGN(SIM_COUNT), -1, HEAD_SUM, NVL(SIM_COUNT, HEAD_SUM)), 0)) M_CNT,
                        SUM(DECODE(DATA_TYPE, 'R', DECODE(SIGN(SIM_COUNT), -1, HEAD_SUM, NVL(SIM_COUNT, HEAD_SUM)), 0)) R_CNT
                   FROM (
                         SELECT T.LINE_CODE,
                                T.ACTUAL_DATE,
                                T.ACTUAL_TIME,
                                T.MACHINE_CODE,
                                T.PROGRAM_NAME,
                                T.ADDRESS,
                                T.SUB_ADDRESS,
                                T.ITEM_CODE,
                                T.DATA_TYPE,
                                T.HEAD_SUM,
                                DECODE(NVL(MACHINE_TYPE, 'CM'), 'NPM', T.HEAD_SUM,
                                  HEAD_SUM - LAG(HEAD_SUM) OVER (
                                    PARTITION BY LINE_CODE, MACHINE_CODE, PROGRAM_NAME,
                                                 ADDRESS, SUB_ADDRESS, ITEM_CODE, DATA_TYPE
                                        ORDER BY LINE_CODE, MACHINE_CODE, PROGRAM_NAME,
                                                 ADDRESS, SUB_ADDRESS, ITEM_CODE, DATA_TYPE,
                                                 ACTUAL_DATE, ACTUAL_TIME
                                  )
                                ) SIM_COUNT
                           FROM IQ_MACHINE_INSPECT_PICKUP_RATE T
                          WHERE (
                                  (ACTUAL_DATE = TRUNC(SYSDATE))
                                  OR (ACTUAL_DATE = TRUNC(SYSDATE - 1) AND ACTUAL_TIME = 'J')
                                )
                            AND ITEM_CODE = 'HEAD'
                        )
                  WHERE ACTUAL_DATE = TRUNC(SYSDATE)
                  GROUP BY LINE_CODE, MACHINE_CODE, ADDRESS, SUB_ADDRESS, ITEM_CODE
                )
          WHERE T_CNT > 500
            AND DECODE(T_CNT, 0, NULL, (M_CNT + R_CNT) / T_CNT) >= 0.01
          GROUP BY LINE_CODE
       ) D
 WHERE M.LINE_CODE = D.LINE_CODE(+)
 ORDER BY M.LINE_NAME
`;
}

/**
 * 픽업률(HEAD) NG 건수 조회 (d_display_smt_pickup_rate_ng_count_ys_head).
 * ITEM_WARNING_SIGN = 'S'인 라인 수를 반환.
 * NG > 0이면 화면 상단에 경고 배너를 표시한다.
 *
 * @deprecated API route에서 더 이상 호출하지 않음.
 * list 결과의 ITEM_WARNING_SIGN='S' 행 수로 앱에서 계산하여 DB 부하 절감.
 * 향후 직접 DB 쿼리가 필요한 경우를 위해 함수는 유지.
 */
export function sqlSmtPickupRateHeadNgCount(): string {
  return `
SELECT NVL(SUM(1), 0) AS NG_COUNT
  FROM (
        SELECT LINE_CODE,
               F_GET_LINE_NAME(LINE_CODE, 1) LINE_NAME,
               T_CNT,
               M_CNT,
               R_CNT,
               DECODE(T_CNT, 0, NULL, ROUND((100 - (M_CNT + R_CNT) / T_CNT * 100), 2)) GOOD_RATE,
               CASE WHEN (
                           DECODE(T_CNT, 0, NULL, ROUND((100 - (M_CNT + R_CNT) / T_CNT * 100), 2)) < 99.50 AND
                           DECODE(T_CNT, 0, NULL, ROUND((100 - (M_CNT + R_CNT) / T_CNT * 100), 2)) > 99.00
                         ) THEN 'W'
                    WHEN (
                           DECODE(T_CNT, 0, NULL, ROUND((100 - (M_CNT + R_CNT) / T_CNT * 100), 2)) <= 99.00
                         ) THEN 'S'
               END LINE_WARNING_SIGN
          FROM (
                SELECT LINE_CODE,
                       SUM(T_CNT) T_CNT,
                       SUM(M_CNT) M_CNT,
                       SUM(R_CNT) R_CNT
                  FROM (
                        SELECT LINE_CODE,
                               SUM(DECODE(DATA_TYPE, 'T', DECODE(SIGN(SIM_COUNT), -1, HEAD_SUM, NVL(SIM_COUNT, HEAD_SUM)))) T_CNT,
                               SUM(DECODE(DATA_TYPE, 'M', DECODE(SIGN(SIM_COUNT), -1, HEAD_SUM, NVL(SIM_COUNT, HEAD_SUM)))) M_CNT,
                               SUM(DECODE(DATA_TYPE, 'R', DECODE(SIGN(SIM_COUNT), -1, HEAD_SUM, NVL(SIM_COUNT, HEAD_SUM)))) R_CNT
                          FROM (
                                SELECT T.LINE_CODE,
                                       T.ACTUAL_DATE,
                                       T.ACTUAL_TIME,
                                       T.MACHINE_CODE,
                                       T.PROGRAM_NAME,
                                       T.ADDRESS,
                                       T.SUB_ADDRESS,
                                       T.ITEM_CODE,
                                       T.DATA_TYPE,
                                       T.HEAD_SUM,
                                       DECODE(NVL(MACHINE_TYPE, 'CM'), 'NPM', T.HEAD_SUM,
                                         HEAD_SUM - LAG(HEAD_SUM) OVER (
                                           PARTITION BY LINE_CODE, MACHINE_CODE, PROGRAM_NAME,
                                                        ADDRESS, SUB_ADDRESS, ITEM_CODE, DATA_TYPE
                                               ORDER BY LINE_CODE, MACHINE_CODE, PROGRAM_NAME,
                                                        ADDRESS, SUB_ADDRESS, ITEM_CODE, DATA_TYPE,
                                                        ACTUAL_DATE, ACTUAL_TIME
                                         )
                                       ) SIM_COUNT
                                  FROM IQ_MACHINE_INSPECT_PICKUP_RATE T
                                 WHERE (
                                         (ACTUAL_DATE = TRUNC(SYSDATE))
                                         OR (ACTUAL_DATE = TRUNC(SYSDATE - 1) AND ACTUAL_TIME = 'J')
                                       )
                                   AND ITEM_CODE = 'HEAD'
                               )
                         WHERE ACTUAL_DATE = TRUNC(SYSDATE)
                         GROUP BY LINE_CODE
                       )
                 GROUP BY LINE_CODE
               )
       ) M,
       (
         SELECT LINE_CODE,
                'S' ITEM_WARNING_SIGN
           FROM (
                 SELECT LINE_CODE,
                        MACHINE_CODE,
                        ADDRESS,
                        SUB_ADDRESS,
                        ITEM_CODE,
                        SUM(DECODE(DATA_TYPE, 'T', DECODE(SIGN(SIM_COUNT), -1, HEAD_SUM, NVL(SIM_COUNT, HEAD_SUM)), 0)) T_CNT,
                        SUM(DECODE(DATA_TYPE, 'M', DECODE(SIGN(SIM_COUNT), -1, HEAD_SUM, NVL(SIM_COUNT, HEAD_SUM)), 0)) M_CNT,
                        SUM(DECODE(DATA_TYPE, 'R', DECODE(SIGN(SIM_COUNT), -1, HEAD_SUM, NVL(SIM_COUNT, HEAD_SUM)), 0)) R_CNT
                   FROM (
                         SELECT T.LINE_CODE,
                                T.ACTUAL_DATE,
                                T.ACTUAL_TIME,
                                T.MACHINE_CODE,
                                T.PROGRAM_NAME,
                                T.ADDRESS,
                                T.SUB_ADDRESS,
                                T.ITEM_CODE,
                                T.DATA_TYPE,
                                T.HEAD_SUM,
                                DECODE(NVL(MACHINE_TYPE, 'CM'), 'NPM', T.HEAD_SUM,
                                  HEAD_SUM - LAG(HEAD_SUM) OVER (
                                    PARTITION BY LINE_CODE, MACHINE_CODE, PROGRAM_NAME,
                                                 ADDRESS, SUB_ADDRESS, ITEM_CODE, DATA_TYPE
                                        ORDER BY LINE_CODE, MACHINE_CODE, PROGRAM_NAME,
                                                 ADDRESS, SUB_ADDRESS, ITEM_CODE, DATA_TYPE,
                                                 ACTUAL_DATE, ACTUAL_TIME
                                  )
                                ) SIM_COUNT
                           FROM IQ_MACHINE_INSPECT_PICKUP_RATE T
                          WHERE (
                                  (ACTUAL_DATE = TRUNC(SYSDATE))
                                  OR (ACTUAL_DATE = TRUNC(SYSDATE - 1) AND ACTUAL_TIME = 'J')
                                )
                            AND ITEM_CODE = 'HEAD'
                        )
                  WHERE ACTUAL_DATE = TRUNC(SYSDATE)
                  GROUP BY LINE_CODE, MACHINE_CODE, ADDRESS, SUB_ADDRESS, ITEM_CODE
                )
          WHERE T_CNT > 500
            AND DECODE(T_CNT, 0, NULL, (M_CNT + R_CNT) / T_CNT) >= 0.01
          GROUP BY LINE_CODE
       ) D
 WHERE M.LINE_CODE = D.LINE_CODE(+)
   AND D.ITEM_WARNING_SIGN = 'S'
`;
}
