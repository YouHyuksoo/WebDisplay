/**
 * @file src/app/api/mxvc/spc/route.ts
 * @description 멕시코전장 SPC 관리도 API — LOG_EOL 테이블 기반 X̄-R Chart 데이터
 *
 * 초보자 가이드:
 * - GET /api/mxvc/spc → 측정항목 목록 반환 (NAME 전체 + NAME 값 존재)
 * - GET /api/mxvc/spc?name=TURN1&dateFrom=...&dateTo=... → 해당 항목의 SPC 데이터
 * - MEAS_1 컬럼이 실측값, MIN_1/MAX_2/TYP_1이 스펙 한계
 * - 서브그룹: 일별로 측정값을 묶어 X-bar/R 계산
 */
import { NextRequest, NextResponse } from 'next/server';
import { executeQuery } from '@/lib/db';

export const dynamic = 'force-dynamic';

/* -- SPC 상수 (서브그룹 크기 5 기준) -- */
const A2 = 0.577;
const D3 = 0;
const D4 = 2.114;
const d2 = 2.326;

/* -- GET 핸들러 -- */

export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams;
  const name = sp.get('name');
  const volt = sp.get('volt') ?? '';

  const mode = sp.get('mode');

  try {
    if (mode === 'models') {
      return await handleModels();
    }
    if (!name) {
      return await handleItems(sp.get('model') ?? '');
    }
    if (mode === 'raw') {
      return await handleRawData(sp, name);
    }
    return await handleSpcData(sp, name, volt);
  } catch (err) {
    console.error('SPC API 오류:', err);
    return NextResponse.json(
      { error: `조회 실패: ${(err as Error).message}` },
      { status: 500 },
    );
  }
}

/** 모델 목록: LOG_EOL에서 DISTINCT MODEL 값 반환 */
async function handleModels() {
  const sql = `
    SELECT DISTINCT MODEL
      FROM LOG_EOL
     WHERE NAME IS NOT NULL
       AND TRIM(NAME) IS NOT NULL
       AND MODEL IS NOT NULL
     ORDER BY MODEL`;

  const rows = await executeQuery<{ MODEL: string }>(sql);
  return NextResponse.json({ models: rows.map((r) => r.MODEL) });
}

/** 측정항목 목록: NAME 값이 있는 고유값 (전체 NAME 대상) */
async function handleItems(model: string) {
  const binds: Record<string, string> = {};
  let modelClause = '';
  if (model) {
    binds.model = model;
    modelClause = `AND MODEL = :model`;
  }

  const sql = `
    SELECT DISTINCT NAME, VOLT_V
      FROM LOG_EOL
     WHERE NAME IS NOT NULL
       AND TRIM(NAME) IS NOT NULL
       AND VOLT_V IS NOT NULL
       AND TRIM(VOLT_V) IS NOT NULL
       ${modelClause}
     ORDER BY NAME, VOLT_V`;

  const rows = await executeQuery<{ NAME: string; VOLT_V: string }>(sql, binds);
  return NextResponse.json({
    items: rows.map((r) => ({
      id: `${r.NAME}@@${r.VOLT_V}`,
      name: `${r.NAME} (${r.VOLT_V})`,
      itemName: r.NAME,
      volt: r.VOLT_V,
    })),
  });
}

/** SPC 데이터 조회: X̄-R Chart + Cp/Cpk */
async function handleSpcData(sp: URLSearchParams, name: string, volt: string) {
  const dateFrom = sp.get('dateFrom') ?? '';
  const dateTo = sp.get('dateTo') ?? '';
  const lineCode = sp.get('lineCode') ?? '';
  const model = sp.get('model') ?? '';

  /* 스펙 그룹 조회: 같은 NAME에 스펙이 다른 그룹이 존재할 수 있음 */
  const specBinds: Record<string, string> = { name };
  const specVoltClause = volt ? ` AND VOLT_V = :volt` : '';
  if (volt) specBinds.volt = volt;

  const specSql = `
    SELECT MIN_2, TYP_2, MAX_2_2, COUNT(*) AS CNT
      FROM LOG_EOL
     WHERE NAME = :name AND STEP_RESULT = 'PASS'
       ${specVoltClause}
       AND MIN_2 IS NOT NULL AND MIN_2 != '-'
       AND MAX_2_2 IS NOT NULL AND MAX_2_2 != '-'
     GROUP BY MIN_2, TYP_2, MAX_2_2
     ORDER BY CNT DESC`;

  const specRows = await executeQuery<{ MIN_2: string; TYP_2: string; MAX_2_2: string; CNT: number }>(
    specSql, specBinds,
  );

  /* 스펙 그룹이 여러 개면 가장 많은 데이터를 가진 그룹 사용 */
  let lsl = 0;
  let target = 0;
  let usl = 0;
  if (specRows.length > 0) {
    lsl = Number(specRows[0].MIN_2) || 0;
    target = Number(specRows[0].TYP_2) || 0;
    usl = Number(specRows[0].MAX_2_2) || 0;
  }

  /* 측정 데이터 조회 — 선택된 스펙 그룹과 동일한 MIN_2/MAX_2_2 범위만 */
  const binds: Record<string, string | number> = { name };
  let where = `WHERE NAME = :name AND STEP_RESULT = 'PASS' AND MEAS_2 IS NOT NULL AND MEAS_2 != '-' AND REGEXP_LIKE(MEAS_2, '^-?[0-9]+(\\.[0-9]+)?$')`;
  if (volt) {
    binds.volt = volt;
    where += ` AND VOLT_V = :volt`;
  }

  if (specRows.length > 0) {
    binds.specMin = specRows[0].MIN_2;
    binds.specMax = specRows[0].MAX_2_2;
    where += ` AND MIN_2 = :specMin AND MAX_2_2 = :specMax`;
  }

  if (dateFrom) {
    binds.fromDate = dateFrom.slice(0, 10);
    where += ` AND LOG_TIMESTAMP >= TO_TIMESTAMP(:fromDate || ' 00:00:00', 'YYYY-MM-DD HH24:MI:SS')`;
  }
  if (dateTo) {
    binds.toDate = dateTo.slice(0, 10);
    where += ` AND LOG_TIMESTAMP <= TO_TIMESTAMP(:toDate || ' 23:59:59', 'YYYY-MM-DD HH24:MI:SS')`;
  }
  if (lineCode) {
    binds.lineCode = lineCode;
    where += ` AND LINE_CODE = :lineCode`;
  }
  if (model) {
    binds.model = model;
    where += ` AND MODEL = :model`;
  }

  const dataSql = `
    SELECT TO_CHAR(TRUNC(CAST(LOG_TIMESTAMP AS DATE)), 'YYYY-MM-DD') AS DAY_KEY,
           TO_CHAR(TRUNC(CAST(LOG_TIMESTAMP AS DATE)), 'MM/DD') AS DAY_LABEL,
           TO_NUMBER(MEAS_2) AS MEAS_VAL
      FROM LOG_EOL
     ${where}
     ORDER BY LOG_TIMESTAMP`;

  const rows = await executeQuery<{ DAY_KEY: string; DAY_LABEL: string; MEAS_VAL: number }>(
    dataSql, binds,
  );

  if (rows.length === 0) {
    return NextResponse.json({
      name,
      volt,
      dateFrom,
      dateTo,
      item: { id: name, name, volt, unit: 'V', usl, lsl, target },
      subgroups: [],
      stats: null,
      message: '데이터가 없습니다.',
      timestamp: new Date().toISOString(),
    });
  }

  /* 일별 데이터 수집 후, 서브그룹 크기 5로 분할 */
  const SUBGROUP_SIZE = 5;
  const dailyData: { key: string; label: string; values: number[] }[] = [];
  const dayMap = new Map<string, number>();

  for (const r of rows) {
    let idx = dayMap.get(r.DAY_KEY);
    if (idx === undefined) {
      idx = dailyData.length;
      dayMap.set(r.DAY_KEY, idx);
      dailyData.push({ key: r.DAY_KEY, label: r.DAY_LABEL, values: [] });
    }
    dailyData[idx].values.push(Number(r.MEAS_VAL));
  }

  /* 서브그룹 구성: 일별 데이터를 5개씩 나눔 */
  const subgroups: {
    id: number;
    date: string;
    dateLabel: string;
    samples: number[];
    xbar: number;
    range: number;
  }[] = [];

  let sgId = 1;
  for (const day of dailyData) {
    const vals = day.values;
    /* 5개씩 잘라서 서브그룹 생성 */
    for (let i = 0; i + SUBGROUP_SIZE <= vals.length; i += SUBGROUP_SIZE) {
      const chunk = vals.slice(i, i + SUBGROUP_SIZE);
      const mean = chunk.reduce((s, v) => s + v, 0) / SUBGROUP_SIZE;
      const r = Math.max(...chunk) - Math.min(...chunk);
      const sgLabel = vals.length > SUBGROUP_SIZE
        ? `${day.label}(${Math.floor(i / SUBGROUP_SIZE) + 1})`
        : day.label;
      subgroups.push({
        id: sgId++,
        date: day.key,
        dateLabel: sgLabel,
        samples: chunk,
        xbar: Number(mean.toFixed(4)),
        range: Number(r.toFixed(4)),
      });
    }
  }

  if (subgroups.length === 0) {
    return NextResponse.json({
      name,
      volt,
      dateFrom,
      dateTo,
      item: { id: name, name, volt, unit: 'V', usl, lsl, target },
      subgroups: [],
      stats: null,
      message: '서브그룹을 구성할 수 있는 데이터가 부족합니다.',
      timestamp: new Date().toISOString(),
    });
  }

  /* X-bar-R 통계 계산 */
  const k = subgroups.length;
  const xbarBar = subgroups.reduce((s, sg) => s + sg.xbar, 0) / k;
  const rBar = subgroups.reduce((s, sg) => s + sg.range, 0) / k;

  const xbarUCL = xbarBar + A2 * rBar;
  const xbarLCL = xbarBar - A2 * rBar;
  const rUCL = D4 * rBar;
  const rLCL = D3 * rBar;

  const sigmaEst = rBar / d2;
  const cp = sigmaEst > 0 ? (usl - lsl) / (6 * sigmaEst) : 0;
  const cpkUpper = sigmaEst > 0 ? (usl - xbarBar) / (3 * sigmaEst) : 0;
  const cpkLower = sigmaEst > 0 ? (xbarBar - lsl) / (3 * sigmaEst) : 0;
  const cpk = Math.min(cpkUpper, cpkLower);

  const oocPoints = subgroups
    .filter((sg) => sg.xbar > xbarUCL || sg.xbar < xbarLCL)
    .map((sg) => sg.id);

  const stats = {
    xbarBar: Number(xbarBar.toFixed(4)),
    rBar: Number(rBar.toFixed(4)),
    xbarUCL: Number(xbarUCL.toFixed(4)),
    xbarLCL: Number(xbarLCL.toFixed(4)),
    xbarCL: Number(xbarBar.toFixed(4)),
    rUCL: Number(rUCL.toFixed(4)),
    rLCL: Number(rLCL.toFixed(4)),
    rCL: Number(rBar.toFixed(4)),
    cp: Number(cp.toFixed(3)),
    cpk: Number(cpk.toFixed(3)),
    sigmaEst: Number(sigmaEst.toFixed(4)),
    usl,
    lsl,
    target,
    sampleSize: SUBGROUP_SIZE,
    subgroupCount: k,
    oocPoints,
  };

  return NextResponse.json({
    name,
    volt,
    dateFrom,
    dateTo,
    item: { id: name, name, volt, unit: 'V', usl, lsl, target },
    subgroups,
    stats,
    timestamp: new Date().toISOString(),
  });
}

/** RAW 데이터 조회: SPC 산출에 사용된 원초 데이터 전체 반환 */
async function handleRawData(sp: URLSearchParams, name: string) {
  const dateFrom = sp.get('dateFrom') ?? '';
  const dateTo = sp.get('dateTo') ?? '';
  const lineCode = sp.get('lineCode') ?? '';
  const model = sp.get('model') ?? '';
  const volt = sp.get('volt') ?? '';

  /* 스펙 그룹 조회 (SPC와 동일 로직) */
  const specBinds: Record<string, string> = { name };
  const specVoltClause = volt ? ` AND VOLT_V = :volt` : '';
  if (volt) specBinds.volt = volt;

  const specSql = `
    SELECT MIN_2, TYP_2, MAX_2_2, COUNT(*) AS CNT
      FROM LOG_EOL
     WHERE NAME = :name AND STEP_RESULT = 'PASS'
       ${specVoltClause}
       AND MIN_2 IS NOT NULL AND MIN_2 != '-'
       AND MAX_2_2 IS NOT NULL AND MAX_2_2 != '-'
     GROUP BY MIN_2, TYP_2, MAX_2_2
     ORDER BY CNT DESC`;

  const specRows = await executeQuery<{ MIN_2: string; MAX_2_2: string }>(
    specSql, specBinds,
  );

  const binds: Record<string, string | number> = { name };
  let where = `WHERE NAME = :name AND STEP_RESULT = 'PASS' AND MEAS_2 IS NOT NULL AND MEAS_2 != '-' AND REGEXP_LIKE(MEAS_2, '^-?[0-9]+(\\.[0-9]+)?$')`;
  if (volt) {
    binds.volt = volt;
    where += ` AND VOLT_V = :volt`;
  }

  if (specRows.length > 0) {
    binds.specMin = specRows[0].MIN_2;
    binds.specMax = specRows[0].MAX_2_2;
    where += ` AND MIN_2 = :specMin AND MAX_2_2 = :specMax`;
  }
  if (dateFrom) {
    binds.fromDate = dateFrom.slice(0, 10);
    where += ` AND LOG_TIMESTAMP >= TO_TIMESTAMP(:fromDate || ' 00:00:00', 'YYYY-MM-DD HH24:MI:SS')`;
  }
  if (dateTo) {
    binds.toDate = dateTo.slice(0, 10);
    where += ` AND LOG_TIMESTAMP <= TO_TIMESTAMP(:toDate || ' 23:59:59', 'YYYY-MM-DD HH24:MI:SS')`;
  }
  if (lineCode) {
    binds.lineCode = lineCode;
    where += ` AND LINE_CODE = :lineCode`;
  }
  if (model) {
    binds.model = model;
    where += ` AND MODEL = :model`;
  }

  const sql = `
    SELECT TO_CHAR(CAST(LOG_TIMESTAMP AS DATE), 'YYYY-MM-DD HH24:MI:SS') AS LOG_TIME,
           EQUIPMENT_ID, BARCODE, MODEL, LINE_CODE,
           NAME, VOLT_V, STEP_RESULT,
           MIN_2 AS LSL, TYP_2 AS TARGET, MAX_2_2 AS USL,
           MEAS_2 AS MEAS_VAL
      FROM LOG_EOL
     ${where}
     ORDER BY LOG_TIMESTAMP`;

  const rows = await executeQuery(sql, binds);

  return NextResponse.json({
    rows: rows.map((row) => {
      const safe: Record<string, unknown> = {};
      for (const [k, v] of Object.entries(row as Record<string, unknown>)) {
        if (v instanceof Date) safe[k] = v.toISOString();
        else if (typeof v === 'bigint') safe[k] = Number(v);
        else safe[k] = v;
      }
      return safe;
    }),
    total: rows.length,
  });
}
