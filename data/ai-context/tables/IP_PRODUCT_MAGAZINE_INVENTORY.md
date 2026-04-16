---
name: IP_PRODUCT_MAGAZINE_INVENTORY
site: default
description: 매거진 재고
related_tables: []
---

## 주요 컬럼
| 컬럼 | 타입 | 설명 |
|---|---|---|
| MAGAZINE_NO | VARCHAR2(30) | 매거진 번호 (PK) |
| MODEL_NAME | VARCHAR2(30) |  |
| ITEM_CODE | VARCHAR2(30) |  |
| WORKSTAGE_CODE | VARCHAR2(10) |  |
| RECEIPT_QTY | NUMBER |  |
| ISSUE_QTY | NUMBER |  |
| CURRENT_QTY | NUMBER | 현재 재고 (RECEIPT_QTY - ISSUE_QTY) |
| LAST_MODIFY_DATE | DATE |  |
| LAST_MODIFY_BY | VARCHAR2(20) |  |
| RECEIPT_DATE | DATE |  |

## 자주 쓰는 JOIN


## 예제 쿼리

