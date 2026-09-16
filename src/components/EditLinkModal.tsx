import React, { useState } from 'react';
import { X, Lock, Calendar, Tag, Link as LinkIcon, Loader2, Save } from 'lucide-react';
import { ShortLink, UpdateLinkPayload } from '../types';

interface EditLinkModalProps {
  link: ShortLink;
  onClose: () => void;
  onUpdated: (updatedLink: ShortLink) => void;
}

export const EditLinkModal: React.FC<EditLinkModalProps> = ({ link, onClose, onUpdated }) => {
  const [url, setUrl] = useState(link.url);
  const [slug, setSlug] = useState(link.slug);
  const [title, setTitle] = useState(link.title || '');
  const [description, setDescription] = useState(link.description || '');
  const [password, setPassword] = useState(link.password || '');
  const [expiresAt, setExpiresAt] = useState(
    link.expiresAt ? new Date(link.expiresAt).toISOString().slice(0, 16) : ''
  );
  const [isActive, setIsActive] = useState(link.isActive);
  const [tagsInput, setTagsInput] = useState((link.tags || []).join(', '));

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!url.trim()) {
      setError('目标网址为必填项');
      return;
    }
    if (!slug.trim()) {
      setError('短链后缀 (Slug) 不能为空');
      return;
    }

    setError(null);
    setIsSubmitting(true);

    const tags = tagsInput
      .split(',')
      .map(t => t.trim())
      .filter(Boolean);

    const payload: UpdateLinkPayload = {
      url: url.trim(),
      slug: slug.trim().toLowerCase(),
      title: title.trim() || undefined,
      description: description.trim() || undefined,
      password: password.trim() || undefined,
      expiresAt: expiresAt ? new Date(expiresAt).toISOString() : null,
      isActive,
      tags,
    };

    try {
      const res = await fetch(`/api/links/${link.slug}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || '更新短链接失败');
      }

      onUpdated(data);
      onClose();
    } catch (err: any) {
      setError(err.message || '更新短链接出错');
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
            <div>
              <h2 className="text-lg font-bold text-white">编辑短链接</h2>
              <p className="text-xs text-slate-400 font-mono">/{link.slug}</p>
            </div>
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
              placeholder="https://example.com/target-url"
              value={url}
              onChange={e => setUrl(e.target.value)}
              className="w-full rounded-xl border border-slate-800 bg-slate-950 px-3.5 py-2.5 text-sm text-white placeholder-slate-500 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            />
          </div>

          {/* Custom Slug */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              短链后缀 (Slug) <span className="text-indigo-400">*</span>
            </label>
            <div className="flex items-center rounded-xl border border-slate-800 bg-slate-950 px-3 py-2 text-sm text-slate-400 focus-within:border-indigo-500 focus-within:ring-1 focus-within:ring-indigo-500">
              <span className="text-slate-500 mr-1 select-none font-mono">/</span>
              <input
                type="text"
                required
                placeholder="slug"
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
                分类标签 (逗号隔开)
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
              详细描述
            </label>
            <textarea
              rows={2}
              placeholder="短链接详细备注说明..."
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
                <span>访问密码保护 (留空表示不设密)</span>
              </label>
              <input
                type="text"
                placeholder="设置或清空访问密码"
                value={password}
                onChange={e => setPassword(e.target.value)}
                className="w-full rounded-xl border border-slate-800 bg-slate-950 px-3.5 py-2 text-sm text-white placeholder-slate-600 focus:border-indigo-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="flex items-center gap-1.5 text-xs font-semibold text-slate-300 mb-1.5">
                <Calendar className="h-3.5 w-3.5 text-indigo-400" />
                <span>到期自动失效时间</span>
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="datetime-local"
                  value={expiresAt}
                  onChange={e => setExpiresAt(e.target.value)}
                  className="w-full rounded-xl border border-slate-800 bg-slate-950 px-3 py-2 text-sm text-slate-300 focus:border-indigo-500 focus:outline-none"
                />
                {expiresAt && (
                  <button
                    type="button"
                    onClick={() => setExpiresAt('')}
                    className="shrink-0 text-xs text-rose-400 hover:text-rose-300 px-2 py-1 bg-rose-500/10 rounded-lg border border-rose-500/20"
                  >
                    清除
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Active status */}
          <div className="pt-2 border-t border-slate-800 flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-300">启用状态 (允许重定向跳转)</span>
            <button
              type="button"
              onClick={() => setIsActive(!isActive)}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                isActive ? 'bg-indigo-600' : 'bg-slate-700'
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  isActive ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
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
              disabled={isSubmitting || !url.trim() || !slug.trim()}
              className="flex items-center gap-2 rounded-xl bg-indigo-600 px-5 py-2 text-sm font-semibold text-white transition-all hover:bg-indigo-500 disabled:opacity-50 active:scale-98"
            >
              {isSubmitting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Save className="h-4 w-4" />
              )}
              <span>保存修改</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
