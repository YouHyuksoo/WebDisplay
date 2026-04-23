---
type: join-recipe
title: "코드 디코딩 · 사용자 축 (F_GET_BASECODE / USER_ID)"
stage: sql_generation
aliases: ["F_GET_BASECODE", "CODE_TYPE", "LOCATION_CODE", "BASECODE", "USER_ID", "ENTER_BY", "MODIFY_BY", "사용자"]
tables: [IM_SYS_USER]
tags: [join, code, user, decode]
updated: 2026-04-18
---

### [CODE_TYPE 축] 공통 코드 디코딩 (F_GET_BASECODE)
```sql
SELECT F_GET_BASECODE('LOCATION CODE', t.LOCATION_CODE, 'KO', 1) AS LOCATION_NAME
  FROM 테이블 t
```
용도: 'LOCATION_CODE' 처럼 코드값을 **사람이 읽을 수 있는 이름**으로 디코딩.
주의: CODE_TYPE은 공백 포함 문자열 (컬럼명의 `_` 을 공백으로 치환한 형태).

### [USER_ID 축] 작성자·수정자 연결
```sql
LEFT JOIN IM_SYS_USER u
  ON t.ENTER_BY = u.USER_ID
```
용도: ENTER_BY/MODIFY_BY 컬럼 → 실제 사용자명 표시.
