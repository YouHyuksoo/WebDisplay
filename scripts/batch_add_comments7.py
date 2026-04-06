#!/usr/bin/env python3
import subprocess
import json

# IS* 테이블 (시스템/기준정보)
tables = [
    'ISAL_PRODUCT_INVENTORY', 'ISAL_PRODUCT_RECEIPT', 'ISAL_PRODUCT_SHIPPING',
    'ISAL_SHIPPING_LOT_DETAIL', 'ISAL_SHIPPING_LOT_MASTER', 'ISYS_ALERT_MASTER',
    'ISYS_APP_FILES', 'ISYS_AUDIT_MESSAGE', 'ISYS_AUDIT_MESSAGE_CODE',
    'ISYS_AUDIT_MESSAGE_FILTER', 'ISYS_AUDIT_MESSAGE_HISTORY', 'ISYS_BASECODE',
    'ISYS_BASECODE_YTMES', 'ISYS_BATCHJOBERRLOG', 'ISYS_BATCH_JOB_STATUS',
    'ISYS_CODE_MASTER', 'ISYS_COMPANY', 'ISYS_CONFIG', 'ISYS_DATAOBJECT',
    'ISYS_DATA_FILTER', 'ISYS_DEFAULT_12_MONTHS', 'ISYS_DEFAULT_VALUE',
    'ISYS_DEPARTMENT', 'ISYS_DUAL_LANGUAGE', 'ISYS_DUAL_LANGUAGE2',
    'ISYS_DUAL_MESSAGE', 'ISYS_DUAL_MESSAGE_DIRECT', 'ISYS_DWZOOM',
    'ISYS_DYNAMIC_MENU', 'ISYS_DYNAMIC_MENU_SHS', 'ISYS_ERROR',
    'ISYS_ERROR_TRACE', 'ISYS_EXCHANGE_RATE', 'ISYS_HELP_VIDEO',
    'ISYS_INVENTORY_CLOSE_DATE', 'ISYS_JOB_TIMECHECK', 'ISYS_LABEL_FORM',
    'ISYS_MACHINE_MONITORING', 'ISYS_MACHINE_MONITORING_OFF_HIST', 'ISYS_MENU',
    'ISYS_MONITOR', 'ISYS_OBJECT', 'ISYS_OBJECT_SOURCE', 'ISYS_ORGANIZATION',
    'ISYS_PRIVILEGE', 'ISYS_PUB_BOARD', 'ISYS_PUB_WORK_BOARD', 'ISYS_REPORT_MENU',
    'ISYS_REPORT_SOURCE', 'ISYS_REPORT_SOURCE_WHERE', 'ISYS_REPORT_WHERE_CONDITION',
    'ISYS_REPORT_WINDOW_MASTER', 'ISYS_REPORT_WINDOW_PROPERTY', 'ISYS_ROLE',
    'ISYS_SOUND_MENT', 'ISYS_SYSTEM_ACCESS', 'ISYS_SYSTEM_INTERFACE', 'ISYS_USERS',
    'ISYS_USER_WAREHOUSE', 'ISYS_VERSION', 'ISYS_VERSION_HISTORY', 'ISYS_WINDOW',
    'ISYS_WINDOW_ISO_TAG', 'ISYS_WINDOW_PROPERTY', 'ISYS_WINDOW_ROLE',
    'ISYS_WINDOW_SHS', 'ISYS_WORD_DICTIONARY', 'ISYS_WORK_BOARD', 'IS_PRODUCT_SALE_PRICE'
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

print(f'\nIS* 테이블: {total_tables}개 테이블, 총 {total_updated}개 컬럼 업데이트 완료')
