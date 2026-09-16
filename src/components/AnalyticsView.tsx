import React, { useEffect, useState } from 'react';
import {
  BarChart3,
  Globe2,
  Smartphone,
  MousePointerClick,
  Link2,
  Calendar,
  Layers,
  ArrowUpRight,
  Filter
} from 'lucide-react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  Cell
} from 'recharts';
import { AnalyticsSummary, ShortLink } from '../types';

interface AnalyticsViewProps {
  links: ShortLink[];
  selectedSlug?: string;
  onSelectSlug: (slug: string | undefined) => void;
}

export const AnalyticsView: React.FC<AnalyticsViewProps> = ({
  links,
  selectedSlug,
  onSelectSlug,
}) => {
  const [data, setData] = useState<AnalyticsSummary | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAnalytics();
  }, [selectedSlug]);

  const fetchAnalytics = async () => {
    setLoading(true);
    try {
      const url = selectedSlug ? `/api/analytics?slug=${selectedSlug}` : '/api/analytics';
      const res = await fetch(url);
      const summary = await res.json();
      setData(summary);
    } catch (err) {
      console.error('获取统计数据失败:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header & Filter Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-900/60 p-4 rounded-2xl border border-slate-800">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <BarChart3 className="h-5 w-5 text-indigo-400" />
            <span>访问统计大屏</span>
          </h2>
          <p className="text-xs text-slate-400">
            {selectedSlug ? `当前查看短链接: /${selectedSlug}` : '全站所有短链接汇总指标与访问画像'}
          </p>
        </div>

        {/* Filter Dropdown */}
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-slate-400" />
          <select
            value={selectedSlug || ''}
            onChange={e => onSelectSlug(e.target.value || undefined)}
            className="rounded-xl border border-slate-800 bg-slate-950 px-3 py-2 text-sm text-slate-200 focus:border-indigo-500 focus:outline-none"
          >
            <option value="">全部短链接 ({links.length})</option>
            {links.map(l => (
              <option key={l.slug} value={l.slug}>
                /{l.slug} ({l.clicksCount} 次点击)
              </option>
            ))}
          </select>
        </div>
      </div>

      {loading ? (
        <div className="flex h-64 items-center justify-center rounded-2xl border border-slate-800 bg-slate-900/40">
          <div className="flex items-center gap-2 text-slate-400">
            <div className="h-5 w-5 animate-spin rounded-full border-2 border-indigo-500 border-t-transparent" />
            <span>正在分析并聚合访问数据...</span>
          </div>
        </div>
      ) : !data ? (
        <div className="p-8 text-center text-slate-400">暂无访问统计数据</div>
      ) : (
        <>
          {/* KPI Cards */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5 shadow-sm">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-400">
                  累计访问点击量
                </span>
                <div className="rounded-lg bg-indigo-500/10 p-2 text-indigo-400">
                  <MousePointerClick className="h-4 w-4" />
                </div>
              </div>
              <div className="mt-2 text-3xl font-extrabold text-white">
                {data.totalClicks.toLocaleString()}
              </div>
              <div className="mt-1 text-xs text-emerald-400 flex items-center gap-0.5">
                <ArrowUpRight className="h-3 w-3" /> 实时点击统计更新
              </div>
            </div>

            <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5 shadow-sm">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-400">
                  短链接总数
                </span>
                <div className="rounded-lg bg-violet-500/10 p-2 text-violet-400">
                  <Link2 className="h-4 w-4" />
                </div>
              </div>
              <div className="mt-2 text-3xl font-extrabold text-white">
                {data.totalLinks}
              </div>
              <div className="mt-1 text-xs text-slate-400">生效中的短链条目</div>
            </div>

            <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5 shadow-sm">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-400">
                  主要引荐来源
                </span>
                <div className="rounded-lg bg-amber-500/10 p-2 text-amber-400">
                  <Globe2 className="h-4 w-4" />
                </div>
              </div>
              <div className="mt-2 text-xl font-bold text-white truncate">
                {data.topReferrers[0]?.name || '直接访问 / Direct'}
              </div>
              <div className="mt-1 text-xs text-slate-400">
                {data.topReferrers[0]
                  ? `${data.topReferrers[0].count} 次 (${Math.round((data.topReferrers[0].count / (data.totalClicks || 1)) * 100)}%)`
                  : '直接输入或书签访问'}
              </div>
            </div>

            <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5 shadow-sm">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-400">
                  主要访问设备
                </span>
                <div className="rounded-lg bg-cyan-500/10 p-2 text-cyan-400">
                  <Smartphone className="h-4 w-4" />
                </div>
              </div>
              <div className="mt-2 text-xl font-bold text-white">
                {data.deviceBreakdown[0]?.name || '桌面电脑'}
              </div>
              <div className="mt-1 text-xs text-slate-400">占比最高的访客终端</div>
            </div>
          </div>

          {/* Click Volume Chart */}
          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
            <div className="flex items-center justify-between pb-4">
              <h3 className="font-semibold text-white text-base">近 7 天访问趋势图</h3>
              <span className="text-xs font-mono text-slate-400 flex items-center gap-1">
                <Calendar className="h-3.5 w-3.5" /> 每日趋势
              </span>
            </div>
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={data.clicksByDate}>
                  <defs>
                    <linearGradient id="clickGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#6366f1" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="date" stroke="#64748b" fontSize={12} tickLine={false} />
                  <YAxis stroke="#64748b" fontSize={12} tickLine={false} />
                  <Tooltip
                    formatter={(val: any) => [`${val} 次`, '访问量']}
                    contentStyle={{
                      backgroundColor: '#0f172a',
                      borderColor: '#334155',
                      borderRadius: '12px',
                      color: '#fff',
                    }}
                  />
                  <Area
                    type="monotone"
                    dataKey="clicks"
                    name="点击量"
                    stroke="#6366f1"
                    strokeWidth={3}
                    fillOpacity={1}
                    fill="url(#clickGrad)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Breakdown Grid */}
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
            {/* Referrers */}
            <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
              <h3 className="font-semibold text-white text-sm mb-4">引荐来源 TOP 渠道</h3>
              <div className="space-y-3">
                {data.topReferrers.map(r => {
                  const pct = Math.round((r.count / (data.totalClicks || 1)) * 100);
                  return (
                    <div key={r.name} className="space-y-1">
                      <div className="flex justify-between text-xs">
                        <span className="text-slate-300 font-mono truncate max-w-[180px]">{r.name}</span>
                        <span className="text-slate-400 font-bold">{r.count} 次 ({pct}%)</span>
                      </div>
                      <div className="h-2 w-full rounded-full bg-slate-950 overflow-hidden">
                        <div
                          className="h-full bg-indigo-500 rounded-full transition-all"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Devices & Browsers */}
            <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
              <h3 className="font-semibold text-white text-sm mb-4">终端设备与浏览器分布</h3>
              <div className="space-y-4">
                <div>
                  <span className="text-xs text-slate-400 block mb-2">设备类型</span>
                  <div className="space-y-2">
                    {data.deviceBreakdown.map(d => (
                      <div key={d.name} className="flex justify-between items-center text-xs bg-slate-950 p-2 rounded-lg border border-slate-800">
                        <span className="text-slate-300 font-medium">{d.name}</span>
                        <span className="font-bold text-indigo-400">{d.count} 次</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  <span className="text-xs text-slate-400 block mb-2">浏览器内核</span>
                  <div className="space-y-2">
                    {data.browserBreakdown.map(b => (
                      <div key={b.name} className="flex justify-between items-center text-xs bg-slate-950 p-2 rounded-lg border border-slate-800">
                        <span className="text-slate-300 font-medium">{b.name}</span>
                        <span className="font-bold text-violet-400">{b.count} 次</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Top Countries */}
            <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
              <h3 className="font-semibold text-white text-sm mb-4">访客地理区域分布</h3>
              <div className="space-y-3">
                {data.countryBreakdown.map(c => {
                  const pct = Math.round((c.count / (data.totalClicks || 1)) * 100);
                  return (
                    <div key={c.name} className="space-y-1">
                      <div className="flex justify-between text-xs">
                        <span className="text-slate-300 font-medium">{c.name}</span>
                        <span className="text-slate-400 font-bold">{c.count} 次 ({pct}%)</span>
                      </div>
                      <div className="h-2 w-full rounded-full bg-slate-950 overflow-hidden">
                        <div
                          className="h-full bg-emerald-500 rounded-full transition-all"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Recent Clicks Table */}
          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
            <h3 className="font-semibold text-white text-sm mb-4">最近实时点击流水记录</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-300">
                <thead className="bg-slate-950 text-slate-400 border-b border-slate-800">
                  <tr>
                    <th className="px-3 py-2.5">访问时间</th>
                    <th className="px-3 py-2.5">短链后缀</th>
                    <th className="px-3 py-2.5">设备与操作系统</th>
                    <th className="px-3 py-2.5">浏览器</th>
                    <th className="px-3 py-2.5">来源渠道</th>
                    <th className="px-3 py-2.5">国家/地区</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 font-mono">
                  {data.recentClicks.map(clk => (
                    <tr key={clk.id} className="hover:bg-slate-800/40 transition-colors">
                      <td className="px-3 py-2 text-slate-400">
                        {new Date(clk.timestamp).toLocaleTimeString('zh-CN')}
                      </td>
                      <td className="px-3 py-2 text-indigo-400 font-bold">/{clk.slug}</td>
                      <td className="px-3 py-2">{clk.device} ({clk.os})</td>
                      <td className="px-3 py-2">{clk.browser}</td>
                      <td className="px-3 py-2 text-slate-400 truncate max-w-[150px]">
                        {clk.referrer}
                      </td>
                      <td className="px-3 py-2 text-slate-300">{clk.country}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
};
