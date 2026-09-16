import React, { useState } from 'react';
import { Code2, Copy, Check } from 'lucide-react';

export const ApiDocsView: React.FC = () => {
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);
  const origin = window.location.origin;

  const copyCode = (text: string, idx: number) => {
    navigator.clipboard.writeText(text);
    setCopiedIndex(idx);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  const endpoints = [
    {
      title: '1. 创建短链接',
      method: 'POST',
      path: '/api/links',
      description: '创建一条新短链接，支持自定义后缀 (slug)、访问密码保护、过期时间与分类标签。',
      code: `curl -X POST ${origin}/api/links \\
  -H "Content-Type: application/json" \\
  -d '{
    "url": "https://example.com/very-long-url",
    "slug": "my-shortcut",
    "title": "营销推广短链",
    "tags": ["活动", "社交媒体"]
  }'`
    },
    {
      title: '2. 获取短链列表',
      method: 'GET',
      path: '/api/links',
      description: '获取所有已创建的短链接清单及其实时点击统计。',
      code: `curl -X GET ${origin}/api/links`
    },
    {
      title: '3. 查询统计分析报表',
      method: 'GET',
      path: '/api/analytics?slug=github',
      description: '获取指定短链或全站的点击指标、引荐渠道分布、终端设备画像与访客地域分布。',
      code: `curl -X GET "${origin}/api/analytics?slug=github"`
    },
    {
      title: '4. AI 智能推荐后缀',
      method: 'POST',
      path: '/api/ai/suggest-slug',
      description: '调用服务端 Gemini AI 模型分析目标网页内容，智能生成易于记忆传播的个性化短后缀。',
      code: `curl -X POST ${origin}/api/ai/suggest-slug \\
  -H "Content-Type: application/json" \\
  -d '{"url": "https://react.dev"}'`
    }
  ];

  return (
    <div className="space-y-6">
      <div className="bg-slate-900/60 p-6 rounded-2xl border border-slate-800">
        <h2 className="text-xl font-bold text-white flex items-center gap-2">
          <Code2 className="h-5 w-5 text-indigo-400" />
          <span>开发者开放接口 (RESTful API)</span>
        </h2>
        <p className="text-sm text-slate-400 mt-1">
          支持无缝将短链生成、跳转重定向与点击流数据直接集成到您的系统、自动化机器人、微信小程序或运营中台。
        </p>
      </div>

      <div className="space-y-4">
        {endpoints.map((ep, idx) => (
          <div key={idx} className="rounded-2xl border border-slate-800 bg-slate-900 p-5 space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <h3 className="font-semibold text-white text-base">{ep.title}</h3>
                <p className="text-xs text-slate-400 mt-0.5">{ep.description}</p>
              </div>
              <div className="flex items-center gap-2">
                <span className={`px-2.5 py-1 rounded-lg text-xs font-bold font-mono ${
                  ep.method === 'POST' ? 'bg-indigo-500/20 text-indigo-400 border border-indigo-500/30' : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                }`}>
                  {ep.method}
                </span>
                <span className="font-mono text-xs text-slate-300 bg-slate-950 px-2.5 py-1 rounded-lg border border-slate-800">
                  {ep.path}
                </span>
              </div>
            </div>

            <div className="relative rounded-xl bg-slate-950 p-4 border border-slate-800 font-mono text-xs text-slate-300 overflow-x-auto">
              <pre>{ep.code}</pre>
              <button
                onClick={() => copyCode(ep.code, idx)}
                className="absolute top-3 right-3 flex items-center gap-1 rounded-md bg-slate-800 px-2.5 py-1 text-xs text-slate-300 hover:bg-slate-700 hover:text-white transition-all"
              >
                {copiedIndex === idx ? (
                  <>
                    <Check className="h-3.5 w-3.5 text-emerald-400" />
                    <span className="text-emerald-400">已复制</span>
                  </>
                ) : (
                  <>
                    <Copy className="h-3.5 w-3.5" />
                    <span>复制命令</span>
                  </>
                )}
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
