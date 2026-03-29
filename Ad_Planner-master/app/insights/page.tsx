'use client';

import { useState, useEffect } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer, LineChart, Line,
} from 'recharts';

interface SeasonInsight {
  month: string;
  industry: string;
  avgCPM: number;
  avgCPC: number;
  avgCTR: number;
  totalReach: number;
  totalSpend: number;
  count: number;
}

const COLORS: Record<string, string> = {
  뷰티: '#f59e0b',
  식음료: '#6366f1',
};
const DEFAULT_COLOR = '#10b981';

function getColor(ind: string) {
  return COLORS[ind] ?? DEFAULT_COLOR;
}

export default function InsightsPage() {
  const [data, setData] = useState<SeasonInsight[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/insights')
      .then((r) => r.json())
      .then(setData)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const industries = [...new Set(data.map((d) => d.industry))];
  const months = [...new Set(data.map((d) => d.month))].sort();

  // Monthly spend by industry
  const spendByMonth = months.map((m) => {
    const row: Record<string, string | number> = { month: m };
    for (const ind of industries) {
      const found = data.find((d) => d.month === m && d.industry === ind);
      row[ind] = found ? found.totalSpend : 0;
    }
    return row;
  });

  // Monthly CPM by industry
  const cpmByMonth = months.map((m) => {
    const row: Record<string, string | number> = { month: m };
    for (const ind of industries) {
      const found = data.find((d) => d.month === m && d.industry === ind);
      row[ind] = found ? found.avgCPM : 0;
    }
    return row;
  });

  // Summary cards per industry
  const summaryCards = industries.map((ind) => {
    const rows = data.filter((d) => d.industry === ind);
    const totalReach = rows.reduce((s, r) => s + r.totalReach, 0);
    const totalSpend = rows.reduce((s, r) => s + r.totalSpend, 0);
    const totalImpressions = rows.reduce((s, r) => s + r.count, 0);
    const avgCPM = rows.length > 0
      ? Math.round(rows.reduce((s, r) => s + r.avgCPM, 0) / rows.length)
      : 0;
    const avgCPC = rows.length > 0
      ? Math.round(rows.reduce((s, r) => s + r.avgCPC, 0) / rows.length)
      : 0;
    return { industry: ind, totalReach, totalSpend, totalImpressions, avgCPM, avgCPC };
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">시즌 인사이트</h1>
        <p className="text-sm text-gray-500 mt-1">월별 캠페인 성과 변화 추이와 시즌 패턴을 파악합니다.</p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {summaryCards.map((card) => (
          <div key={card.industry} className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
            <div className="flex items-center gap-2 mb-4">
              <div
                className="w-3 h-3 rounded-full"
                style={{ background: getColor(card.industry) }}
              />
              <span className="font-semibold text-gray-800">{card.industry}</span>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-xs text-gray-500">총 도달</p>
                <p className="text-xl font-bold text-gray-900">{card.totalReach.toLocaleString()}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500">총 지출</p>
                <p className="text-xl font-bold text-gray-900">₩{(card.totalSpend / 1_000_000).toFixed(1)}M</p>
              </div>
              <div>
                <p className="text-xs text-gray-500">평균 CPM</p>
                <p className="text-lg font-semibold text-gray-700">₩{card.avgCPM.toLocaleString()}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500">평균 CPC</p>
                <p className="text-lg font-semibold text-gray-700">₩{card.avgCPC.toLocaleString()}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Monthly Spend Chart */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
        <h2 className="text-base font-semibold text-gray-800 mb-6">월별 광고 지출 추이</h2>
        {spendByMonth.length === 0 ? (
          <p className="text-sm text-gray-400">데이터 없음</p>
        ) : (
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={spendByMonth}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="month" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} tickFormatter={(v) => `₩${(v / 1_000_000).toFixed(0)}M`} width={70} />
              <Tooltip formatter={(v) => [`₩${Number(v).toLocaleString()}`, '']} />
              <Legend />
              {industries.map((ind) => (
                <Bar key={ind} dataKey={ind} fill={getColor(ind)} radius={[4, 4, 0, 0]} stackId="a" />
              ))}
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* Monthly CPM Chart */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
        <h2 className="text-base font-semibold text-gray-800 mb-6">월별 평균 CPM 추이</h2>
        {cpmByMonth.length === 0 ? (
          <p className="text-sm text-gray-400">데이터 없음</p>
        ) : (
          <ResponsiveContainer width="100%" height={280}>
            <LineChart data={cpmByMonth}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="month" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} tickFormatter={(v) => `₩${v.toLocaleString()}`} width={80} />
              <Tooltip formatter={(v) => [`₩${Number(v).toLocaleString()}`, 'CPM']} />
              <Legend />
              {industries.map((ind) => (
                <Line
                  key={ind}
                  type="monotone"
                  dataKey={ind}
                  stroke={getColor(ind)}
                  strokeWidth={2}
                  dot={{ r: 4 }}
                  activeDot={{ r: 6 }}
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* Detail Table */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 overflow-x-auto">
        <h2 className="text-base font-semibold text-gray-800 mb-4">월별 상세 데이터</h2>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100">
              <th className="text-left py-2 pr-4 text-gray-500 font-medium">월</th>
              <th className="text-left py-2 pr-4 text-gray-500 font-medium">업종</th>
              <th className="text-right py-2 pr-4 text-gray-500 font-medium">CPM</th>
              <th className="text-right py-2 pr-4 text-gray-500 font-medium">CPC</th>
              <th className="text-right py-2 pr-4 text-gray-500 font-medium">CTR</th>
              <th className="text-right py-2 pr-4 text-gray-500 font-medium">도달</th>
              <th className="text-right py-2 text-gray-500 font-medium">지출</th>
            </tr>
          </thead>
          <tbody>
            {data.map((row) => (
              <tr key={`${row.month}-${row.industry}`} className="border-b border-gray-50 hover:bg-gray-50">
                <td className="py-2 pr-4 text-gray-600">{row.month}</td>
                <td className="py-2 pr-4">
                  <span className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full inline-block" style={{ background: getColor(row.industry) }} />
                    {row.industry}
                  </span>
                </td>
                <td className="py-2 pr-4 text-right text-gray-700">₩{row.avgCPM.toLocaleString()}</td>
                <td className="py-2 pr-4 text-right text-gray-700">₩{row.avgCPC.toLocaleString()}</td>
                <td className="py-2 pr-4 text-right text-gray-700">{row.avgCTR.toFixed(3)}%</td>
                <td className="py-2 pr-4 text-right text-gray-700">{row.totalReach.toLocaleString()}</td>
                <td className="py-2 text-right text-gray-700">₩{(row.totalSpend / 1_000_000).toFixed(1)}M</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
