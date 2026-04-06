#!/usr/bin/env python3
import subprocess
import json

# ID* 테이블 (주요 테이블만)
tables = [
    'ID_CUSTOMER_SET_BOM', 'ID_ENG_BOM', 'ID_ENG_BOM_CUSTOMER', 'ID_ENG_BOM_DRAWING',
    'ID_ENG_BOM_ECO_WORKSPACE', 'ID_ENG_BOM_EXCEL', 'ID_ENG_BOM_IMPORT',
    'ID_ENG_BOM_LOOP_CHECK', 'ID_ENG_BOM_MATERIAL_COST', 'ID_ENG_BOM_SMT',
    'ID_ENG_BOM_SMT_BACKUP', 'ID_ENG_BOM_SMT_EXCEL', 'ID_ENG_BOM_SMT_REPLACE',
    'ID_ENG_BOM_TEMP', 'ID_ENG_BOM_UNIT', 'ID_ENG_BOM_WORKSPACE',
    'ID_ITEM', 'ID_ITEM_CLASS', 'ID_ITEM_HISTORY', 'ID_ITEM_IMAGE',
    'ID_ITEM_OTP_MASTER', 'ID_ITEM_REPLACE', 'ID_ITEM_REPLACE_TEMP',
    'ID_MFS_BOM', 'ID_PRODUCT_CLASS', 'ID_USER'
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
