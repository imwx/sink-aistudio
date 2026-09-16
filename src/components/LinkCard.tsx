import React, { useState } from 'react';
import {
  Copy,
  Check,
  ExternalLink,
  QrCode,
  BarChart2,
  Trash2,
  Lock,
  Clock,
  Tag,
  Power,
  Edit
} from 'lucide-react';
import { ShortLink } from '../types';

interface LinkCardProps {
  link: ShortLink;
  onOpenQR: (link: ShortLink) => void;
  onOpenAnalytics: (link: ShortLink) => void;
  onToggleActive: (slug: string, currentActive: boolean) => void;
  onDelete: (slug: string) => void;
  onEdit?: (link: ShortLink) => void;
}

export const LinkCard: React.FC<LinkCardProps> = ({
  link,
  onOpenQR,
  onOpenAnalytics,
  onToggleActive,
  onDelete,
  onEdit,
}) => {
  const [copied, setCopied] = useState(false);
  const shortUrl = `${window.location.origin}/${link.slug}`;

  const handleCopy = () => {
    navigator.clipboard.writeText(shortUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const isExpired = link.expiresAt && new Date(link.expiresAt) < new Date();

  return (
    <div className="group relative rounded-2xl border border-slate-800 bg-slate-900/80 p-5 transition-all hover:border-slate-700 hover:shadow-xl hover:shadow-indigo-500/5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        {/* Left Info */}
        <div className="space-y-1.5 flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="font-semibold text-white text-base truncate max-w-xs sm:max-w-md">
              {link.title || `/${link.slug}`}
            </h3>

            {/* Status badges */}
            {!link.isActive && (
              <span className="rounded-md bg-amber-500/10 px-2 py-0.5 text-xs font-semibold text-amber-400 border border-amber-500/20">
                已停用
              </span>
            )}

            {isExpired && (
              <span className="rounded-md bg-rose-500/10 px-2 py-0.5 text-xs font-semibold text-rose-400 border border-rose-500/20 flex items-center gap-1">
                <Clock className="h-3 w-3" /> 已过期
              </span>
            )}

            {link.password && (
              <span className="rounded-md bg-purple-500/10 px-2 py-0.5 text-xs font-semibold text-purple-400 border border-purple-500/20 flex items-center gap-1">
                <Lock className="h-3 w-3" /> 密码保护
              </span>
            )}
          </div>

          {/* Short URL & Copy bar */}
          <div className="flex items-center gap-2 pt-0.5">
            <a
              href={shortUrl}
              target="_blank"
              rel="noreferrer"
              className="text-sm font-bold text-indigo-400 hover:text-indigo-300 hover:underline flex items-center gap-1 font-mono"
            >
              <span>/{link.slug}</span>
              <ExternalLink className="h-3.5 w-3.5 opacity-70" />
            </a>

            <button
              onClick={handleCopy}
              className="flex items-center gap-1 rounded-md bg-slate-800/80 px-2 py-1 text-xs font-medium text-slate-300 hover:bg-slate-700 hover:text-white transition-all"
            >
              {copied ? (
                <>
                  <Check className="h-3.5 w-3.5 text-emerald-400" />
                  <span className="text-emerald-400">已复制</span>
                </>
              ) : (
                <>
                  <Copy className="h-3.5 w-3.5" />
                  <span>复制短链</span>
                </>
              )}
            </button>
          </div>

          {/* Destination URL */}
          <div className="text-xs text-slate-400 truncate max-w-md font-mono">
            目标地址: {link.url}
          </div>

          {link.description && (
            <p className="text-xs text-slate-400 pt-1 line-clamp-1">{link.description}</p>
          )}

          {/* Tags */}
          {link.tags && link.tags.length > 0 && (
            <div className="flex items-center gap-1.5 pt-1.5 flex-wrap">
              {link.tags.map(t => (
                <span
                  key={t}
                  className="rounded-md bg-slate-800 px-2 py-0.5 text-xs text-slate-300 border border-slate-700/50 flex items-center gap-1"
                >
                  <Tag className="h-2.5 w-2.5 text-slate-400" />
                  {t}
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Right Stats & Action Buttons */}
        <div className="flex items-center sm:flex-col sm:items-end justify-between border-t border-slate-800/60 pt-3 sm:border-t-0 sm:pt-0 gap-3">
          {/* Clicks counter */}
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5 rounded-xl bg-slate-950 px-3 py-1.5 border border-slate-800">
              <BarChart2 className="h-4 w-4 text-indigo-400" />
              <span className="text-sm font-bold text-white">{link.clicksCount}</span>
              <span className="text-xs text-slate-500">次点击</span>
            </div>
          </div>

          {/* Actions toolbar */}
          <div className="flex items-center gap-1">
            {onEdit && (
              <button
                onClick={() => onEdit(link)}
                title="编辑短链接"
                className="rounded-lg p-2 text-slate-400 hover:bg-slate-800 hover:text-indigo-400 transition-colors"
              >
                <Edit className="h-4 w-4" />
              </button>
            )}

            <button
              onClick={() => onOpenAnalytics(link)}
              title="查看分析报表"
              className="rounded-lg p-2 text-slate-400 hover:bg-slate-800 hover:text-indigo-400 transition-colors"
            >
              <BarChart2 className="h-4 w-4" />
            </button>

            <button
              onClick={() => onOpenQR(link)}
              title="生成二维码"
              className="rounded-lg p-2 text-slate-400 hover:bg-slate-800 hover:text-white transition-colors"
            >
              <QrCode className="h-4 w-4" />
            </button>

            <button
              onClick={() => onToggleActive(link.slug, link.isActive)}
              title={link.isActive ? '停用此短链' : '启用此短链'}
              className={`rounded-lg p-2 transition-colors ${
                link.isActive
                  ? 'text-emerald-400 hover:bg-slate-800 hover:text-amber-400'
                  : 'text-amber-400 hover:bg-slate-800 hover:text-emerald-400'
              }`}
            >
              <Power className="h-4 w-4" />
            </button>

            <button
              onClick={() => onDelete(link.slug)}
              title="删除此短链"
              className="rounded-lg p-2 text-slate-400 hover:bg-rose-500/10 hover:text-rose-400 transition-colors"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
