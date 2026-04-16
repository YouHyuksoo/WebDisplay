---
name: site-profiles
description: DB 사이트별 접속 프로필 정보
---

## DB 사이트 프로필

| site 키 | DB 프로필명 | 서비스명 | 용도 |
|---|---|---|---|
| default | (activeProfile) | config/database.json 참조 | 현재 접속 사이트. 미지정 시 기본값 |
| 멕시코전장내부 | 멕시코전장내부 | SVEHICLEPDB | 멕시코전장 내부망 |
| 멕시코전장외부 | 멕시코전장외부 | SVEHICLEPDB | 멕시코전장 외부망 |
| 멕시코VD외부 | 멕시코VD외부 | SMMEXPDB | 멕시코VD |
| 베트남VD내부 | 베트남VD내부 | SMVNPDB | 베트남VD 내부망 |
| 베트남VD외부 | 베트남VD외부 | SMVNPDB | 베트남VD 외부망 |

## site 판별 규칙
- 사이트를 명시하지 않으면 반드시 "default" 반환
- "베트남", "SMVNPDB" -> "베트남VD외부"
- "멕시코VD", "SMMEXPDB" -> "멕시코VD외부"
- "전장", "SVEHICLEPDB" -> "default" (현재 접속 사이트)
