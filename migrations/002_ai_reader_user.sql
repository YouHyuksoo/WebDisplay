-- =========================================================================
-- 002_ai_reader_user.sql
-- AI 챗 전용 read-only 사용자 생성 + 화이트리스트 SELECT 권한
-- 실행 환경: DBA 권한 계정 (SYSTEM 또는 유사)
-- 대상 DB: 멕시코전장내부 (20.10.30.231:1521/SVEHICLEPDB)
-- =========================================================================

-- 1) 사용자 생성
--
-- 주의: "<REPLACE_BEFORE_RUN>" 부분을 사이트별로 강력한 비밀번호로 교체한 뒤 실행할 것.
-- 교체된 비밀번호는 config/database.json의 aiReader 프로필 password와 반드시 일치해야 함.
-- config/database.json은 .gitignore에 등록되어 있어 로컬/서버 별로 개별 관리됨.
CREATE USER WD_AI_READER IDENTIFIED BY "<REPLACE_BEFORE_RUN>"
/

-- 2) 기본 권한 (로그인)
GRANT CREATE SESSION TO WD_AI_READER
/

-- 3) EXPLAIN PLAN 사용 (PLAN_TABLE은 12c+에서 GLOBAL TEMPORARY로 이미 SYS 소유)
GRANT SELECT ON SYS.PLAN_TABLE$ TO WD_AI_READER
/

-- 4) 화이트리스트 SELECT 권한 (오빠 제공 시 아래 채움)
-- TODO: GRANT SELECT ON INFINITY21_JSMES.IP_PRODUCT_LINE_TARGET TO WD_AI_READER;
-- TODO: GRANT SELECT ON INFINITY21_JSMES.IP_PRODUCT_WORKSTAGE_IO TO WD_AI_READER;
-- TODO: GRANT SELECT ON INFINITY21_JSMES.MES_LINE_MASTER TO WD_AI_READER;
-- TODO: GRANT EXECUTE ON INFINITY21_JSMES.F_GET_LINE_NAME TO WD_AI_READER;
-- TODO: GRANT EXECUTE ON INFINITY21_JSMES.F_GET_WORK_ACTUAL_DATE TO WD_AI_READER;
