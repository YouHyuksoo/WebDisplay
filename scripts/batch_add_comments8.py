#!/usr/bin/env python3
import subprocess
import json

# 남은 테이블
tables = [
    # IDZ*
    'IDZ_INTERLOCK_NG_HIS_DAY', 'IDZ_INTERLOCK_NG_HIS_LINE', 'IDZ_INTERLOCK_NG_HIS_TOP10', 'IDZ_INTERLOCK_NG_HIS_WORKSTAGE',
    # IF*
    'IF_KEYT_KEYITEM', 'IF_KF_MATERIAL_LIST',
    # INTF*
    'INTF_B_ITEM_BY_PLANT_FR_ERP', 'INTF_B_ITEM_FR_ERP', 'INTF_P_BOM', 'INTF_P_BOM_DETAIL_FR_ERP',
    'INTF_P_BOM_DETAIL_FR_ERP_T', 'INTF_P_BOM_HEADER_FR_ERP', 'INTF_P_PRODUCTION_ORDER_DETAIL_FR_ERP',
    'INTF_P_PRODUCTION_ORDER_HEADER_FR_ERP', 'INTF_P_PRODUCTION_RESULTS_FR_MES',
    # LOG*
    'LOG_ALARM', 'LOG_AOI', 'LOG_COATING1', 'LOG_COATING2', 'LOG_COATINGREVIEW', 'LOG_COATINGVISION',
    'LOG_DOWNLOAD', 'LOG_EOL', 'LOG_ERROR', 'LOG_FCT', 'LOG_ICT', 'LOG_LOWCURRENT', 'LOG_MAOI',
    'LOG_MARKING', 'LOG_MOUNTER', 'LOG_PROCESS', 'LOG_REFLOW_01', 'LOG_REFLOW_02', 'LOG_SELECTIVE',
    'LOG_SPI', 'LOG_SPI_VD', 'LOG_VISION_LEGACY', 'LOG_VISION_NATIVE'
]

total_updated = 0
total_tables = 0
for table in tables:
    result = subprocess.run(
        ['python', 'C:/Users/hsyou/.claude/skills/oracle-db/scripts/add_code_comments.py', table, '--site', 'SVEHICLEPDB'],
        capture_output=True, text=True
    )
    try:
        data = json.loads(result.stdout)
        if data['success'] and data['updated']:
            print(f'{table}: {len(data["updated"])}개 컬럼 업데이트')
            total_updated += len(data['updated'])
            total_tables += 1
    except Exception as e:
        print(f'{table}: 오류 - {e}')

print(f'\n남은 테이블: {total_tables}개 테이블, 총 {total_updated}개 컬럼 업데이트 완료')
