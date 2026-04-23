import { NextResponse } from 'next/server';

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
    id: 'ICT',
    name: 'ICT Test',
    items: [
      { id: 'resistance', name: 'Resistance (R1)', unit: 'Ohm', usl: 105, lsl: 95, target: 100 },
      { id: 'capacitance', name: 'Capacitance (C1)', unit: 'pF', usl: 52, lsl: 48, target: 50 },
      { id: 'voltage', name: 'Voltage (V1)', unit: 'V', usl: 5.25, lsl: 4.75, target: 5.0 },
    ],
  },
  {
    id: 'HIPOT',
    name: 'HIPOT Test',
    items: [
      { id: 'leakage', name: 'Leakage Current', unit: 'mA', usl: 0.5, lsl: 0, target: 0.1 },
      { id: 'insulation', name: 'Insulation Resistance', unit: 'MOhm', usl: 1200, lsl: 800, target: 1000 },
    ],
  },
  {
    id: 'FT',
    name: 'FT Test',
    items: [
      { id: 'output_power', name: 'Output Power', unit: 'W', usl: 62, lsl: 58, target: 60 },
      { id: 'efficiency', name: 'Efficiency', unit: '%', usl: 96, lsl: 90, target: 93 },
      { id: 'ripple', name: 'Ripple Voltage', unit: 'mV', usl: 50, lsl: 0, target: 20 },
    ],
  },
  {
    id: 'BURNIN',
    name: 'Burn-In Test',
    items: [
      { id: 'temp_rise', name: 'Temperature Rise', unit: 'degC', usl: 45, lsl: 30, target: 37 },
      { id: 'current_drift', name: 'Current Drift', unit: 'mA', usl: 15, lsl: 0, target: 5 },
    ],
  },
  {
    id: 'ATE',
    name: 'ATE Test',
    items: [
      { id: 'frequency', name: 'Frequency', unit: 'MHz', usl: 102, lsl: 98, target: 100 },
      { id: 'signal_noise', name: 'S/N Ratio', unit: 'dB', usl: 85, lsl: 70, target: 78 },
      { id: 'gain', name: 'Gain', unit: 'dB', usl: 22, lsl: 18, target: 20 },
    ],
  },
];

function randn(mean: number, std: number, seed: number): number {
  const a = Math.sin(seed * 9301 + 49297) * 0.5 + 0.5;
  const b = Math.sin(seed * 8761 + 31337) * 0.5 + 0.5;
  const z = Math.sqrt(-2 * Math.log(Math.max(a, 0.001))) * Math.cos(2 * Math.PI * b);
  return mean + z * std;
}

function generateSubgroups(item: MeasurementItem, seedBase: number, dateFrom: string, dateTo: string) {
  const subgroupSize = 5;
  const range = item.usl - item.lsl;
  const std = range / 8;

  const from = new Date(dateFrom);
  const to = new Date(dateTo);
  const days = Math.max(1, Math.round((to.getTime() - from.getTime()) / (1000 * 60 * 60 * 24)) + 1);
  const subgroupCount = Math.min(days, 60);

  const subgroups = [] as Array<{
    id: number;
    date: string;
    dateLabel: string;
    samples: number[];
    xbar: number;
    range: number;
  }>;

  for (let i = 0; i < subgroupCount; i++) {
    const samples: number[] = [];
    const drift = i > subgroupCount * 0.75 ? (i - subgroupCount * 0.75) * std * 0.15 : 0;

    for (let j = 0; j < subgroupSize; j++) {
      const seed = seedBase + i * 100 + j;
      samples.push(Number(randn(item.target + drift, std, seed).toFixed(4)));
    }

    const mean = samples.reduce((s, v) => s + v, 0) / subgroupSize;
    const r = Math.max(...samples) - Math.min(...samples);

    const sgDate = new Date(from);
    sgDate.setDate(sgDate.getDate() + Math.round((i * (days - 1)) / Math.max(subgroupCount - 1, 1)));
    const dateLabel = `${String(sgDate.getMonth() + 1).padStart(2, '0')}/${String(sgDate.getDate()).padStart(2, '0')}`;

    subgroups.push({
      id: i + 1,
      date: sgDate.toISOString().slice(0, 10),
      dateLabel,
      samples,
      xbar: Number(mean.toFixed(4)),
      range: Number(r.toFixed(4)),
    });
  }

  const xbars = subgroups.map((s) => s.xbar);
  const ranges = subgroups.map((s) => s.range);
  const xbarBar = xbars.reduce((s, v) => s + v, 0) / subgroupCount;
  const rBar = ranges.reduce((s, v) => s + v, 0) / subgroupCount;

  const A2 = 0.577;
  const D3 = 0;
  const D4 = 2.114;
  const d2 = 2.326;

  const xbarUCL = xbarBar + A2 * rBar;
  const xbarLCL = xbarBar - A2 * rBar;
  const rUCL = D4 * rBar;
  const rLCL = D3 * rBar;

  const sigmaEst = rBar / d2;
  const cp = sigmaEst > 0 ? (item.usl - item.lsl) / (6 * sigmaEst) : 0;
  const cpkUpper = sigmaEst > 0 ? (item.usl - xbarBar) / (3 * sigmaEst) : 0;
  const cpkLower = sigmaEst > 0 ? (xbarBar - item.lsl) / (3 * sigmaEst) : 0;
  const cpk = Math.min(cpkUpper, cpkLower);

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

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const processId = searchParams.get('processId');
  const itemId = searchParams.get('itemId');

  if (!processId) {
    return NextResponse.json({
      processes: PROCESSES.map((p) => ({
        id: p.id,
        name: p.name,
        items: p.items.map((i) => ({ id: i.id, name: i.name, unit: i.unit })),
      })),
    });
  }

  const process = PROCESSES.find((p) => p.id === processId);
  if (!process) {
    return NextResponse.json({ error: 'Process not found' }, { status: 404 });
  }

  const item = itemId ? process.items.find((i) => i.id === itemId) : process.items[0];
  if (!item) {
    return NextResponse.json({ error: 'Item not found' }, { status: 404 });
  }

  const today = new Date().toISOString().slice(0, 10);
  const defaultFrom = new Date(Date.now() - 24 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
  const dateFrom = searchParams.get('dateFrom') ?? defaultFrom;
  const dateTo = searchParams.get('dateTo') ?? today;

  const seedBase = (processId + item.id + dateFrom)
    .split('')
    .reduce((s, c) => s + c.charCodeAt(0), 0);

  const data = generateSubgroups(item, seedBase, dateFrom, dateTo);

  return NextResponse.json({
    processId: process.id,
    processName: process.name,
    item: {
      id: item.id,
      name: item.name,
      unit: item.unit,
      usl: item.usl,
      lsl: item.lsl,
      target: item.target,
    },
    dateFrom,
    dateTo,
    ...data,
    timestamp: new Date().toISOString(),
  });
}
