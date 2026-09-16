import React, { useState } from 'react';
import { X, Sparkles, Lock, Calendar, Tag, Link as LinkIcon, Loader2 } from 'lucide-react';
import { CreateLinkPayload, ShortLink } from '../types';

interface CreateLinkModalProps {
  onClose: () => void;
  onCreated: (newLink: ShortLink) => void;
}

export const CreateLinkModal: React.FC<CreateLinkModalProps> = ({ onClose, onCreated }) => {
  const [url, setUrl] = useState('');
  const [slug, setSlug] = useState('');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [password, setPassword] = useState('');
  const [expiresAt, setExpiresAt] = useState('');
  const [tagsInput, setTagsInput] = useState('');
  
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleAiSuggest = async () => {
    if (!url) {
      setError('请先输入目标网址，再进行 AI 智能建议分析');
      return;
    }
    setError(null);
    setIsAiLoading(true);

    try {
      const res = await fetch('/api/ai/suggest-slug', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url }),
      });
      const data = await res.json();
      if (data.slugs && data.slugs.length > 0) {
        setSlug(data.slugs[0]);
      }
      if (data.title) {
        setTitle(data.title);
      }
      if (data.suggestedTags && data.suggestedTags.length > 0) {
        setTagsInput(data.suggestedTags.join(', '));
      }
    } catch (err) {
      console.error('AI 建议失败:', err);
    } finally {
      setIsAiLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!url.trim()) {
      setError('目标网址为必填项');
      return;
    }

    setError(null);
    setIsSubmitting(true);

    const tags = tagsInput
      .split(',')
      .map(t => t.trim())
      .filter(Boolean);

    const payload: CreateLinkPayload = {
      url: url.trim(),
      slug: slug.trim() || undefined,
      title: title.trim() || undefined,
      description: description.trim() || undefined,
      password: password || undefined,
      expiresAt: expiresAt ? new Date(expiresAt).toISOString() : null,
      tags,
    };

    try {
      const res = await fetch('/api/links', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || '创建短链接失败');
      }

      onCreated(data);
      onClose();
    } catch (err: any) {
      setError(err.message || '创建短链接出错');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm overflow-y-auto">
      <div className="w-full max-w-lg my-8 rounded-2xl border border-slate-800 bg-slate-900 p-6 shadow-2xl">
        <div className="flex items-center justify-between pb-4 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-500/10 text-indigo-400">
              <LinkIcon className="h-4 w-4" />
            </div>
            <h2 className="text-lg font-bold text-white">创建新短链接</h2>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-800 hover:text-white"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {error && (
          <div className="mt-4 rounded-xl bg-rose-500/10 border border-rose-500/20 p-3 text-sm text-rose-400">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          {/* Target URL */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              目标原始网址 (Destination URL) <span className="text-indigo-400">*</span>
            </label>
            <input
              type="text"
              required
              placeholder="https://example.com/very-long-url-path"
              value={url}
              onChange={e => setUrl(e.target.value)}
              className="w-full rounded-xl border border-slate-800 bg-slate-950 px-3.5 py-2.5 text-sm text-white placeholder-slate-500 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            />
          </div>

          {/* AI Helper Button */}
          <div className="flex justify-end">
            <button
              type="button"
              onClick={handleAiSuggest}
              disabled={isAiLoading || !url.trim()}
              className="flex items-center gap-1.5 rounded-lg bg-indigo-500/10 px-3 py-1.5 text-xs font-semibold text-indigo-400 hover:bg-indigo-500/20 border border-indigo-500/20 disabled:opacity-50 transition-all"
            >
              {isAiLoading ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Sparkles className="h-3.5 w-3.5" />
              )}
              <span>✨ AI 智能生成建议后缀与标题</span>
            </button>
          </div>

          {/* Custom Slug */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              自定义短链后缀 (Slug，留空将自动生成随机短码)
            </label>
            <div className="flex items-center rounded-xl border border-slate-800 bg-slate-950 px-3 py-2 text-sm text-slate-400 focus-within:border-indigo-500 focus-within:ring-1 focus-within:ring-indigo-500">
              <span className="text-slate-500 mr-1 select-none font-mono">/</span>
              <input
                type="text"
                placeholder="例如 my-link 或 docs"
                value={slug}
                onChange={e => setSlug(e.target.value)}
                className="w-full bg-transparent text-white placeholder-slate-600 focus:outline-none font-mono"
              />
            </div>
          </div>

          {/* Title & Tags */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                标题 / 备注名
              </label>
              <input
                type="text"
                placeholder="例如：产品发布会文档"
                value={title}
                onChange={e => setTitle(e.target.value)}
                className="w-full rounded-xl border border-slate-800 bg-slate-950 px-3.5 py-2 text-sm text-white placeholder-slate-500 focus:border-indigo-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                分类标签 (多个用逗号隔开)
              </label>
              <input
                type="text"
                placeholder="营销, 社群, 开发"
                value={tagsInput}
                onChange={e => setTagsInput(e.target.value)}
                className="w-full rounded-xl border border-slate-800 bg-slate-950 px-3.5 py-2 text-sm text-white placeholder-slate-500 focus:border-indigo-500 focus:outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              详细描述 (可选)
            </label>
            <textarea
              rows={2}
              placeholder="简要备注此短链接的用途或来源..."
              value={description}
              onChange={e => setDescription(e.target.value)}
              className="w-full rounded-xl border border-slate-800 bg-slate-950 px-3.5 py-2 text-sm text-white placeholder-slate-500 focus:border-indigo-500 focus:outline-none resize-none"
            />
          </div>

          {/* Password & Expiration Options */}
          <div className="pt-2 border-t border-slate-800 grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="flex items-center gap-1.5 text-xs font-semibold text-slate-300 mb-1.5">
                <Lock className="h-3.5 w-3.5 text-purple-400" />
                <span>访问密码保护 (可选)</span>
              </label>
              <input
                type="password"
                placeholder="设置解锁访问密码"
                value={password}
                onChange={e => setPassword(e.target.value)}
                className="w-full rounded-xl border border-slate-800 bg-slate-950 px-3.5 py-2 text-sm text-white placeholder-slate-600 focus:border-indigo-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="flex items-center gap-1.5 text-xs font-semibold text-slate-300 mb-1.5">
                <Calendar className="h-3.5 w-3.5 text-indigo-400" />
                <span>到期自动失效时间 (可选)</span>
              </label>
              <input
                type="datetime-local"
                value={expiresAt}
                onChange={e => setExpiresAt(e.target.value)}
                className="w-full rounded-xl border border-slate-800 bg-slate-950 px-3 py-2 text-sm text-slate-300 focus:border-indigo-500 focus:outline-none"
              />
            </div>
          </div>

          {/* Submit Action */}
          <div className="pt-4 flex items-center justify-end gap-3 border-t border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl px-4 py-2 text-sm font-semibold text-slate-400 hover:bg-slate-800 hover:text-white"
            >
              取消
            </button>
            <button
              type="submit"
              disabled={isSubmitting || !url.trim()}
              className="flex items-center gap-2 rounded-xl bg-indigo-600 px-5 py-2 text-sm font-semibold text-white transition-all hover:bg-indigo-500 disabled:opacity-50 active:scale-98"
            >
              {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
              <span>立即创建</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
