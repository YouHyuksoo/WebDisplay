#!/usr/bin/env python3
import subprocess
import json

# ICOM* 테이블
tables = [
    'ICOM_CUSTOMER', 'ICOM_CUSTOMER_COMPLAINTS', 'ICOM_CUSTOMER_DOCUMENT',
    'ICOM_DISPLAY_MESSAGE', 'ICOM_DOCUMENT', 'ICOM_EMPLOYEE_ATTENDANCE',
    'ICOM_EMPLOYEE_MASTER', 'ICOM_EXCEL', 'ICOM_EXCHANGE_RATE',
    'ICOM_GATHERING_STATUS', 'ICOM_GATHERING_STATUS_HIST', 'ICOM_INVENTORY_LOCATION',
    'ICOM_MACHINE_INSERT_LOG', 'ICOM_MES_MOVIE', 'ICOM_MOUNTER_EVENT_UPLOAD',
    'ICOM_PBA_ACTUAL_RESULT', 'ICOM_SUPPLIER', 'ICOM_SUPPLIER_BARCODE',
    'ICOM_SUPPLIER_DATA', 'ICOM_SUPPLIER_DOCUMENT', 'ICOM_SYSTEM_ANALYSIS',
    'ICOM_TEMPERATURE_DATA', 'ICOM_TEMPERATURE_RAW', 'ICOM_WEB_MOBIS_PARM_HIST',
    'ICOM_WEB_SERVICE_LOG', 'ICOM_WORKTIME_RANGES'
]

total_updated = 0
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
    except Exception as e:
        print(f'{table}: 오류 - {e}')

print(f'\n총 {total_updated}개 컬럼 업데이트 완료')
