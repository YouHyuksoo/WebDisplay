#!/usr/bin/env python
"""
활성 DB 프로파일의 함수·프로시저 메타를 추출해 JSON 캐시로 저장.

출력: data/ai-context/db-objects-cache.json
  {
    "version": 1,
    "refreshedAt": ISO8601,
    "site": "멕시코전장외부",
    "functions":  { "F_NAME": { name, kind, returns, args: [...] } },
    "procedures": { "P_NAME": { name, kind, args: [...] } }
  }

차후 Next.js 런타임 sync 로 대체 예정. 지금은 일회성 마이그레이션 용.
"""
import json
import os
import sys
from datetime import datetime, timezone

import oracledb

CONFIG_PATH = os.path.expanduser("~/.oracle_db_config.json")
SITE_KEY = "SVEHICLEPDBEXT"  # == 프로젝트 "멕시코전장외부"
OUTPUT_PATH = os.path.join(
    os.path.dirname(os.path.abspath(__file__)),
    "..", "data", "ai-context", "db-objects-cache.json",
)


def main() -> int:
    with open(CONFIG_PATH, encoding="utf-8") as f:
        config = json.load(f)

    site = config["profiles"][SITE_KEY]
    conn = oracledb.connect(
        user=site["user"],
        password=site["password"],
        dsn=f"{site['host']}:{site['port']}/{site['service_name']}",
    )

    cur = conn.cursor()
    cur.execute(
        """
        SELECT p.OBJECT_NAME, p.OBJECT_TYPE,
               a.POSITION, a.ARGUMENT_NAME, a.DATA_TYPE, a.IN_OUT
          FROM USER_PROCEDURES p
          LEFT JOIN USER_ARGUMENTS a
            ON a.OBJECT_NAME = p.OBJECT_NAME
           AND a.PACKAGE_NAME IS NULL
         WHERE p.OBJECT_TYPE IN ('FUNCTION','PROCEDURE')
           AND p.OBJECT_NAME NOT LIKE 'SYS%'
         ORDER BY p.OBJECT_TYPE, p.OBJECT_NAME, a.POSITION
        """
    )

    functions: dict = {}
    procedures: dict = {}

    for name, otype, pos, argname, dtype, in_out in cur:
        bucket = functions if otype == "FUNCTION" else procedures
        if name not in bucket:
            entry = {"name": name, "kind": otype.lower(), "args": []}
            if otype == "FUNCTION":
                entry["returns"] = None
            bucket[name] = entry

        # pos is None → no arguments at all
        if pos is None:
            continue

        if pos == 0 and in_out == "OUT":
            # 함수 리턴 타입
            bucket[name]["returns"] = dtype
        else:
            bucket[name]["args"].append(
                {
                    "position": pos,
                    "name": argname,
                    "type": dtype,
                    "mode": in_out,
                }
            )

    cur.close()
    conn.close()

    payload = {
        "version": 1,
        "refreshedAt": datetime.now(timezone.utc).isoformat(),
        "site": "멕시코전장외부",
        "functions": functions,
        "procedures": procedures,
    }

    os.makedirs(os.path.dirname(OUTPUT_PATH), exist_ok=True)
    with open(OUTPUT_PATH, "w", encoding="utf-8") as f:
        json.dump(payload, f, indent=2, ensure_ascii=False)

    print(
        f"functions: {len(functions)}, procedures: {len(procedures)} "
        f"→ {OUTPUT_PATH}"
    )
    return 0


if __name__ == "__main__":
    sys.exit(main())
