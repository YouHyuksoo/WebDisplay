/**
 * @file src/app/api/display/60/route.ts
 * @description SPC 관리도 Mock API — 공정/측정항목 목록 + X̄-R Chart 데이터 제공
 *
 * 초보자 가이드:
 * - GET /api/display/60 → 공정 목록 반환
 * - GET /api/display/60?processId=ICT&itemId=voltage → 해당 측정항목의 SPC 데이터
 * - Mock 데이터로 X̄-R Chart, Cp, Cpk 값을 시뮬레이션
 */
import { NextResponse } from 'next/server';

/* -- Mock 공정/측정항목 정의 -- */

interface MeasurementItem {
  id: string;
  name: string;
  unit: string;
  usl: number;
  lsl: number;
  target: number;
}

interface ProcessDef {
  id: string;
  name: string;
  items: MeasurementItem[];
}

const PROCESSES: ProcessDef[] = [
  {
    id: 'ICT', name: 'ICT 검사',
    items: [
      { id: 'resistance', name: '저항(R1)', unit: 'Ω', usl: 105, lsl: 95, target: 100 },
      { id: 'capacitance', name: '커패시턴스(C1)', unit: 'pF', usl: 52, lsl: 48, target: 50 },
      { id: 'voltage', name: '전압(V1)', unit: 'V', usl: 5.25, lsl: 4.75, target: 5.0 },
    ],
  },
  {
    id: 'HIPOT', name: 'HIPOT 검사',
    items: [
      { id: 'leakage', name: '누설전류', unit: 'mA', usl: 0.5, lsl: 0, target: 0.1 },
      { id: 'insulation', name: '절연저항', unit: 'MΩ', usl: 1200, lsl: 800, target: 1000 },
    ],
  },
  {
    id: 'FT', name: 'FT 검사',
    items: [
      { id: 'output_power', name: '출력 파워', unit: 'W', usl: 62, lsl: 58, target: 60 },
      { id: 'efficiency', name: '효율', unit: '%', usl: 96, lsl: 90, target: 93 },
      { id: 'ripple', name: '리플 전압', unit: 'mV', usl: 50, lsl: 0, target: 20 },
    ],
  },
  {
    id: 'BURNIN', name: 'Burn-In 검사',
    items: [
      { id: 'temp_rise', name: '온도 상승', unit: '°C', usl: 45, lsl: 30, target: 37 },
      { id: 'current_drift', name: '전류 드리프트', unit: 'mA', usl: 15, lsl: 0, target: 5 },
    ],
  },
  {
    id: 'ATE', name: 'ATE 검사',
    items: [
      { id: 'frequency', name: '주파수', unit: 'MHz', usl: 102, lsl: 98, target: 100 },
      { id: 'signal_noise', name: 'S/N비', unit: 'dB', usl: 85, lsl: 70, target: 78 },
      { id: 'gain', name: '이득(Gain)', unit: 'dB', usl: 22, lsl: 18, target: 20 },
    ],
  },
];

/* -- Mock SPC 데이터 생성 -- */

/** 정규분포 난수 (Box-Muller) */
function randn(mean: number, std: number, seed: number): number {
  const a = Math.sin(seed * 9301 + 49297) * 0.5 + 0.5;
  const b = Math.sin(seed * 8761 + 31337) * 0.5 + 0.5;
  const z = Math.sqrt(-2 * Math.log(Math.max(a, 0.001))) * Math.cos(2 * Math.PI * b);
  return mean + z * std;
}

/** 서브그룹 데이터 생성 (25개 서브그룹, 각 5개 샘플) */
function generateSubgroups(item: MeasurementItem, seedBase: number) {
  const subgroupSize = 5;
  const subgroupCount = 25;
  const range = item.usl - item.lsl;
  const std = range / 8; // 공정 표준편차 시뮬레이션

  const subgroups = [];
  for (let i = 0; i < subgroupCount; i++) {
    const samples = [];
    // 약간의 트렌드를 넣어서 현실감 부여
    const drift = (i > 18 ? (i - 18) * std * 0.15 : 0);
    for (let j = 0; j < subgroupSize; j++) {
      const seed = seedBase + i * 100 + j;
      samples.push(Number(randn(item.target + drift, std, seed).toFixed(4)));
    }
    const mean = samples.reduce((s, v) => s + v, 0) / subgroupSize;
    const r = Math.max(...samples) - Math.min(...samples);
    subgroups.push({
      id: i + 1,
      samples,
      xbar: Number(mean.toFixed(4)),
      range: Number(r.toFixed(4)),
    });
  }

  // 통계 계산
  const xbars = subgroups.map((s) => s.xbar);
  const ranges = subgroups.map((s) => s.range);
  const xbarBar = xbars.reduce((s, v) => s + v, 0) / subgroupCount;
  const rBar = ranges.reduce((s, v) => s + v, 0) / subgroupCount;

  // X̄ Chart 관리한계 (n=5: A2=0.577, D3=0, D4=2.114)
  const A2 = 0.577;
  const D3 = 0;
  const D4 = 2.114;
  const d2 = 2.326;

  const xbarUCL = xbarBar + A2 * rBar;
  const xbarLCL = xbarBar - A2 * rBar;
  const rUCL = D4 * rBar;
  const rLCL = D3 * rBar;

  // Cp, Cpk 계산
  const sigmaEst = rBar / d2;
  const cp = sigmaEst > 0 ? (item.usl - item.lsl) / (6 * sigmaEst) : 0;
  const cpkUpper = sigmaEst > 0 ? (item.usl - xbarBar) / (3 * sigmaEst) : 0;
  const cpkLower = sigmaEst > 0 ? (xbarBar - item.lsl) / (3 * sigmaEst) : 0;
  const cpk = Math.min(cpkUpper, cpkLower);

  // 이탈 여부 판정
  const oocPoints = subgroups
    .filter((s) => s.xbar > xbarUCL || s.xbar < xbarLCL)
    .map((s) => s.id);

  return {
    subgroups,
    stats: {
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
      usl: item.usl,
      lsl: item.lsl,
      target: item.target,
      sampleSize: subgroupSize,
      subgroupCount,
      oocPoints,
    },
  };
}

/* -- GET 핸들러 -- */

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const processId = searchParams.get('processId');
  const itemId = searchParams.get('itemId');

  // 공정 목록만 반환
  if (!processId) {
    return NextResponse.json({
      processes: PROCESSES.map((p) => ({
        id: p.id,
        name: p.name,
        items: p.items.map((i) => ({ id: i.id, name: i.name, unit: i.unit })),
      })),
    });
  }

  // 특정 공정+측정항목의 SPC 데이터
  const process = PROCESSES.find((p) => p.id === processId);
  if (!process) {
    return NextResponse.json({ error: 'Process not found' }, { status: 404 });
  }

  const item = itemId
    ? process.items.find((i) => i.id === itemId)
    : process.items[0];

  if (!item) {
    return NextResponse.json({ error: 'Item not found' }, { status: 404 });
  }

  // seed를 공정+항목 기반으로 고정 → 같은 요청에 같은 데이터
  const seedBase = (processId + item.id).split('').reduce((s, c) => s + c.charCodeAt(0), 0);
  const data = generateSubgroups(item, seedBase);

  return NextResponse.json({
    processId: process.id,
    processName: process.name,
    item: { id: item.id, name: item.name, unit: item.unit, usl: item.usl, lsl: item.lsl, target: item.target },
    ...data,
    timestamp: new Date().toISOString(),
  });
}
