/**
 * @file src/app/ai-chat/_components/ResultTable.tsx
 * @description SQL 결과 행을 표로 렌더 (최대 100행 가정).
 */
'use client';

interface Props {
  rows: Record<string, unknown>[];
}

function formatCell(v: unknown): string {
  if (v === null || v === undefined) return '';
  if (typeof v === 'object') return JSON.stringify(v);
  return String(v);
}

export default function ResultTable({ rows }: Props) {
  if (rows.length === 0) {
    return <div className="rounded bg-zinc-900 p-3 text-sm text-zinc-500">결과 0행</div>;
  }
  const cols = Object.keys(rows[0]);

  return (
    <div className="overflow-auto rounded border border-zinc-800 bg-zinc-900 max-h-96">
      <table className="w-full text-xs">
        <thead className="sticky top-0 bg-zinc-800 text-zinc-300">
          <tr>
            {cols.map((c) => <th key={c} className="border-r border-zinc-700 px-2 py-1 text-left font-medium">{c}</th>)}
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={i} className={i % 2 === 0 ? 'bg-zinc-900' : 'bg-zinc-950'}>
              {cols.map((c) => <td key={c} className="border-r border-zinc-800 px-2 py-1 text-zinc-200">{formatCell(r[c])}</td>)}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
