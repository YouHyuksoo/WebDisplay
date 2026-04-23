---
type: join-recipe
title: "제품·자재 축 JOIN 레시피 (MODEL_NO / BARCODE / BOM)"
stage: sql_generation
aliases: ["MODEL_NO", "모델", "BARCODE", "바코드", "ARRAY_BARCODE", "PART_NO", "자재", "BOM"]
tables: [IM_PRODUCT_MODEL, IM_PRODUCT_BOM, LOG_SPI, LOG_AOI, LOG_SPI_VD]
tags: [join, model, barcode, bom]
updated: 2026-04-18
---

### [MODEL_NO 축] 모델 정보 조회
```sql
FROM 이력테이블 h
  JOIN IM_PRODUCT_MODEL m
    ON h.MODEL_NO = m.MODEL_NO
```
용도: 모델 영문명·설명·카테고리를 이력에 붙일 때.

### [BARCODE 축] 제품 단위 이력 추적
```sql
FROM LOG_SPI s
  LEFT JOIN LOG_AOI a
    ON s.ARRAY_BARCODE = a.ARRAY_BARCODE
  LEFT JOIN LOG_SPI_VD v
    ON s.ARRAY_BARCODE = v.ARRAY_BARCODE
```
용도: 멕시코전장 공정 이력은 ARRAY_BARCODE 축으로 연결. (PDB_BARCODE 아님)

### [부자재(PART_NO + MODEL_NO) 축] BOM 연결
```sql
FROM 자재사용이력 u
  JOIN IM_PRODUCT_BOM b
    ON u.MODEL_NO = b.MODEL_NO
   AND u.PART_NO  = b.PART_NO
```
용도: 사용 자재가 BOM 등록 자재인지 검증 / BOM 수량 대비 실사용.
