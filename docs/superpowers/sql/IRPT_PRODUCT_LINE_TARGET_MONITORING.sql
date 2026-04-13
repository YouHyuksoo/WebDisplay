CREATE OR REPLACE VIEW IRPT_PRODUCT_LINE_TARGET_MONITORING AS
select
       pl.action_date                       as status_change_date,
       pl.organization_id                   as organization_id,
       pl.line_code                         as line_code ,
       pl.line_name                         as line_name ,
       pl.line_status                       as line_status ,
       pl.model_name                        as model_name ,
       F_GET_MODEL_INFO( pl.model_name , 1 , 'MODEL_SPEC' ) model_spec ,
       f_get_basecode('LINE STATUS',pl.line_status,'E',pl.organization_id) as line_status_name,
       pl.line_status_code     as line_status_code,
       f_get_basecode('LINE STATUS CODE',pl.line_status_code,'E',pl.organization_id) as line_status_code_name,

       rc.run_no             as run_no,
       rc.run_date           as run_date,
       rc.lot_size           as lot_qty,

       F_GET_ASSEMBLY_TARGET_BY_CT( pl.line_code , pl.model_name , pl.pcb_item ) AS TARGET_PLAN ,
       F_GET_HW_ACTUAL_BY_RUNNO( rc.run_no , pl.organization_id )  AS actual_qty ,
       F_GET_MODEL_ST( pl.model_name , pl.line_code , 'S' , pl.organization_id ) AS model_st ,

       rc.product_run_type as product_run_type,
       f_get_basecode('PRODUCT RUN TYPE',rc.product_run_type, 'E', rc.organization_id ) as product_run_type_name,

       pl.pcb_item            as pcb_item ,
       nvl(pl.line_worker_id,'no scan') as line_worker_id

   from ip_product_line     pl,
        ip_product_run_card rc
  where pl.mes_display_yn = 'Y'
    and pl.organization_id= rc.organization_id(+)
    and pl.run_no         = rc.run_no(+)
  order by pl.mes_display_sequence DESC;
