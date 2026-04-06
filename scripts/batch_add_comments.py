#!/usr/bin/env python3
import subprocess
import json

# 테이블 목록 (IB* ~ IS* 까지 주요 테이블만)
tables = [
    'IB_MNT_AI_CSV', 'IB_MNT_BLOCKDATA', 'IB_MNT_CHIPDATA', 'IB_MNT_CHIPDATA_NMP',
    'IB_MNT_PARTLIB_COMPARE_MASTER', 'IB_MNT_PARTLIB_MASTER', 'IB_MNT_PARTLIB_MASTER_WORK',
    'IB_MNT_PARTSLIB', 'IB_MNT_PARTSLIB_BM', 'IB_MNT_PARTSLIB_NMP', 'IB_MNT_PART_INFORMATION',
    'IB_MNT_PLANDATA', 'IB_MNT_POSITIONDATA', 'IB_MNT_POSITIONDATA_NPM', 'IB_MNT_STEP_INFOR',
    'IB_MNT_STOCKDATA', 'IB_MNT_TAPE_FEEDER_INFOR', 'IB_MNT_YAMAHA_CSV', 'IB_MONITORING_MST',
    'IB_PRODUCT_PLANDATA', 'IB_RECYCLE_CHECKHIST', 'IB_SMT_BOM_IMAGE', 'IB_SMT_CHECKHIST',
    'IB_SMT_FEEDER_SHAFT', 'IB_SMT_FULLCHECK_TIME', 'IB_SMT_LINE_ONOFF_HISTORY',
    'IB_SMT_PRODUCT_MASTER_PLAN', 'IB_SMT_SW', 'IB_SMT_WORKER_LOGON_HISTORY'
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
