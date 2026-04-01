CREATE OR REPLACE procedure                  P_LINE_STATUS_IDLE_TIME_DAILY ( p_org number) is
  /************************************************
   * 종료된 무작업 대하여 무작업 History 생성 한다.
   * 작업시간에 포함된 유효한 작업 시간만을 생성 하고
   * 종료되지 않은 무작업에 대해서는 처리를 하지 않고 종료를 기다린다.
   * 10분 1회 생성 계속 업데이트 한다 SYSDATE 기준
   * [FIX] 이미 종결된 건(END_DATE_ORIGIN NOT NULL)은 UPDATE 제외
   ************************************************/
begin
  --종료된 무작업 대해 08시 기준의 무작업 History 생성
  FOR C01 IN (

         with y as (
           select f_get_work_actual_date(sysdate,'S') start_date,
                  f_get_work_actual_date(sysdate,'E') end_date,
                  f_get_work_actual_date(sysdate,'A') actual_date
             from dual

           union all

           select f_get_work_actual_date(sysdate - 1,'S') start_date,
                  f_get_work_actual_date(sysdate - 1,'E') end_date,
                  f_get_work_actual_date(sysdate - 1,'A') actual_date
             from dual
         )
         select line_code,
                line_status_code,
                y.actual_date,
                x.line_operation_sequence,
                decode( sign( x.start_time - y.start_date ) , -1, y.start_date, x.start_time ) as start_date,
                decode( sign( y.end_date - nvl(x.end_time,sysdate) ), -1 , y.end_date, nvl(x.end_time,sysdate)) as end_date,
                start_time start_time_origin,
                end_time end_time_origin,
                x.enter_by   enter_by,
                x.organization_id as organization_id,
                decode(end_time,null,'N','Y') as check_complete ,
                workstage_code as workstage_code
           from ip_line_daily_operation  x,
                y
          where start_time              <= y.end_date
            and nvl(end_time,sysdate)   >= y.start_date
            and nvl(history_flag,'N')    = 'N'

  ) LOOP
    MERGE INTO IP_LINE_DAILY_OPERATION_HIST X
    USING DUAL
    ON ( X.ACTUAL_DATE               = C01.ACTUAL_DATE               AND
         X.LINE_CODE                 = C01.LINE_CODE                 AND
         NVL(X.WORKSTAGE_CODE, '*')   = NVL(C01.WORKSTAGE_CODE, '*')       AND

         X.LINE_STATUS_CODE          = C01.LINE_STATUS_CODE          AND
         X.line_operation_sequence   = C01.line_operation_sequence   AND      --여러건일수도 있음.
         X.ORGANIZATION_ID           = C01.ORGANIZATION_ID
        )
    WHEN MATCHED THEN
      UPDATE SET END_DATE            = C01.END_DATE,
                 END_DATE_ORIGIN     = C01.END_TIME_ORIGIN ,
                 LAST_MODIFY_DATE    = SYSDATE  ,
                 LAST_MODIFY_BY      = 'UPDATOR'
       WHERE X.END_DATE_ORIGIN IS NULL
    WHEN NOT MATCHED THEN
      INSERT  (
          line_code,
          line_status_code,
          actual_date,
          line_operation_sequence,
          start_date,
          end_date,
          start_date_origin,
          end_date_origin,
          enter_by,
          enter_date,
          last_modify_by,
          last_modify_date,
          workstage_code ,
          organization_id
      )  VALUES (
          C01.LINE_CODE,
          C01.LINE_STATUS_CODE,
          C01.ACTUAL_DATE,
          C01.LINE_OPERATION_SEQUENCE,
          C01.Start_Date,
          C01.End_Date,
          c01.start_time_origin,
          c01.end_time_origin,
          c01.enter_by,
          sysdate,
          c01.enter_by,
          sysdate,
          c01.workstage_code,
          c01.organization_id
      ) ;

  END LOOP ;

  COMMIT ;

  UPDATE IP_LINE_DAILY_OPERATION_HIST H
     SET h.end_date_origin = ( select x.end_time
                                 from IP_LINE_DAILY_OPERATION x
                                where x.line_operation_sequence = h.line_operation_sequence )

   WHERE h.line_operation_sequence IN (
         SELECT line_operation_sequence
           FROM IP_LINE_DAILY_OPERATION
          WHERE HISTORY_FLAG = 'N'
            AND END_TIME  IS NOT NULL
            AND START_TIME <= f_get_work_actual_date(sysdate,'E')
        )
     AND end_date_origin is null ;

  UPDATE IP_LINE_DAILY_OPERATION T
     SET T.HISTORY_FLAG = 'Y'
   WHERE T.HISTORY_FLAG = 'N'
     AND T.END_TIME  IS NOT NULL
     AND T.START_TIME <= f_get_work_actual_date(sysdate,'E')
  ;

  COMMIT;
exception
  when others then

    ps_job_errorlog(123,p_org,'P_LINE_STATUS_IDLE_TIME_DAILY','P_LINE_STATUS_IDLE_TIME_DAILY',substr(sqlerrm,1,300),'NG');
    rollback ;

end P_LINE_STATUS_IDLE_TIME_DAILY;
