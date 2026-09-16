import React, { useEffect, useState } from 'react';
import { Navbar } from './components/Navbar';
import { LinkCard } from './components/LinkCard';
import { CreateLinkModal } from './components/CreateLinkModal';
import { EditLinkModal } from './components/EditLinkModal';
import { QRCodeModal } from './components/QRCodeModal';
import { AnalyticsView } from './components/AnalyticsView';
import { AdminDashboard } from './components/AdminDashboard';
import { ApiDocsView } from './components/ApiDocsView';
import { ShortLink } from './types';
import { Search, Link as LinkIcon, Plus, Tag, RefreshCw, ShieldCheck } from 'lucide-react';

export default function App() {
  const [links, setLinks] = useState<ShortLink[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'links' | 'analytics' | 'admin' | 'api'>('links');
  
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTag, setSelectedTag] = useState<string | null>(null);

  // Modals
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingLink, setEditingLink] = useState<ShortLink | null>(null);
  const [qrLink, setQrLink] = useState<ShortLink | null>(null);
  const [analyticsSlug, setAnalyticsSlug] = useState<string | undefined>(undefined);

  useEffect(() => {
    fetchLinks();
  }, []);

  const fetchLinks = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/links');
      const data = await res.json();
      if (Array.isArray(data)) {
        setLinks(data);
      }
    } catch (err) {
      console.error('获取短链失败:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreated = (newLink: ShortLink) => {
    setLinks(prev => [newLink, ...prev]);
  };

  const handleUpdated = (updatedLink: ShortLink) => {
    setLinks(prev => prev.map(l => (l.slug === updatedLink.slug ? updatedLink : l)));
  };

  const handleToggleActive = async (slug: string, currentActive: boolean) => {
    try {
      const res = await fetch(`/api/links/${slug}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: !currentActive }),
      });
      if (res.ok) {
        const updated = await res.json();
        setLinks(prev => prev.map(l => (l.slug === slug ? updated : l)));
      }
    } catch (err) {
      console.error('切换短链状态失败:', err);
    }
  };

  const handleDelete = async (slug: string) => {
    if (!confirm(`确定要永久删除短链接 /${slug} 吗？删除后重定向将立即失效。`)) return;

    try {
      const res = await fetch(`/api/links/${slug}`, { method: 'DELETE' });
      if (res.ok) {
        setLinks(prev => prev.filter(l => l.slug !== slug));
      }
    } catch (err) {
      console.error('删除短链失败:', err);
    }
  };

  const handleOpenAnalytics = (link: ShortLink) => {
    setAnalyticsSlug(link.slug);
    setActiveTab('analytics');
  };

  // Collect all unique tags
  const allTags = Array.from(
    new Set(links.flatMap(l => l.tags || []))
  );

  // Filter links
  const filteredLinks = links.filter(l => {
    const matchesSearch =
      l.slug.toLowerCase().includes(searchQuery.toLowerCase()) ||
      l.url.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (l.title && l.title.toLowerCase().includes(searchQuery.toLowerCase()));

    const matchesTag = selectedTag ? l.tags?.includes(selectedTag) : true;

    return matchesSearch && matchesTag;
  });

  const totalClicks = links.reduce((sum, l) => sum + l.clicksCount, 0);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
      <Navbar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onOpenCreate={() => setIsCreateOpen(true)}
        totalLinks={links.length}
        totalClicks={totalClicks}
      />

      <main className="flex-1 mx-auto w-full max-w-7xl px-4 py-8 sm:px-6">
        {activeTab === 'links' && (
          <div className="space-y-6">
            {/* Quick Hero Banner / Quick Shortener Bar */}
            <div className="rounded-2xl border border-slate-800 bg-gradient-to-r from-slate-900 via-indigo-950/30 to-slate-900 p-6 shadow-xl">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div>
                  <h1 className="text-2xl font-extrabold text-white tracking-tight">
                    智能短链接生成 · 定制与实时全链路分析
                  </h1>
                  <p className="text-sm text-slate-400 mt-1 max-w-xl">
                    支持自定义短链后缀 (Slug)、密码保护加密、有效截止时间、分类标签以及访客设备、浏览器与地理位置实时看板。
                  </p>
                </div>

                <div className="flex items-center gap-3">
                  <button
                    onClick={() => setActiveTab('admin')}
                    className="flex items-center justify-center gap-2 rounded-xl bg-slate-800 border border-slate-700 px-4 py-3 text-sm font-semibold text-slate-200 hover:bg-slate-700 transition-all active:scale-95"
                  >
                    <ShieldCheck className="h-4 w-4 text-emerald-400" />
                    <span>后台管理</span>
                  </button>

                  <button
                    onClick={() => setIsCreateOpen(true)}
                    className="flex items-center justify-center gap-2 rounded-xl bg-indigo-600 px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-indigo-600/30 hover:bg-indigo-500 transition-all active:scale-95"
                  >
                    <Plus className="h-5 w-5" />
                    <span>新建短链接</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Filter & Search Bar */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
                <input
                  type="text"
                  placeholder="搜索短链后缀、标题或目标网址..."
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  className="w-full rounded-xl border border-slate-800 bg-slate-900/90 pl-10 pr-4 py-2.5 text-sm text-white placeholder-slate-500 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
              </div>

              {/* Tag filters */}
              {allTags.length > 0 && (
                <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
                  <button
                    onClick={() => setSelectedTag(null)}
                    className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-all ${
                      selectedTag === null
                        ? 'bg-indigo-600 text-white'
                        : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
                    }`}
                  >
                    全部标签
                  </button>
                  {allTags.map(t => (
                    <button
                      key={t}
                      onClick={() => setSelectedTag(selectedTag === t ? null : t)}
                      className={`flex items-center gap-1 rounded-lg px-3 py-1.5 text-xs font-semibold transition-all ${
                        selectedTag === t
                          ? 'bg-indigo-600 text-white'
                          : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
                      }`}
                    >
                      <Tag className="h-3 w-3" />
                      <span>{t}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Link List */}
            {loading ? (
              <div className="flex h-48 items-center justify-center rounded-2xl border border-slate-800 bg-slate-900/30">
                <div className="flex items-center gap-2 text-slate-400">
                  <RefreshCw className="h-5 w-5 animate-spin text-indigo-400" />
                  <span>正在加载短链列表...</span>
                </div>
              </div>
            ) : filteredLinks.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-slate-800 bg-slate-900/20 p-12 text-center">
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-900 text-slate-500 border border-slate-800 mb-3">
                  <LinkIcon className="h-6 w-6" />
                </div>
                <h3 className="text-base font-bold text-white">暂无匹配的短链接</h3>
                <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
                  {searchQuery || selectedTag
                    ? '没有符合当前搜索关键词或所选标签的短链接。'
                    : '还没有创建任何短链接，立即创建您的第一个短链吧！'}
                </p>
                <button
                  onClick={() => setIsCreateOpen(true)}
                  className="mt-4 inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2 text-xs font-semibold text-white hover:bg-indigo-500 transition-all"
                >
                  <Plus className="h-4 w-4" />
                  <span>立即创建短链</span>
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                {filteredLinks.map(link => (
                  <LinkCard
                    key={link.id}
                    link={link}
                    onOpenQR={setQrLink}
                    onOpenAnalytics={handleOpenAnalytics}
                    onToggleActive={handleToggleActive}
                    onDelete={handleDelete}
                    onEdit={setEditingLink}
                  />
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'analytics' && (
          <AnalyticsView
            links={links}
            selectedSlug={analyticsSlug}
            onSelectSlug={setAnalyticsSlug}
          />
        )}

        {activeTab === 'admin' && (
          <AdminDashboard
            links={links}
            onRefreshLinks={fetchLinks}
            onLinkUpdated={handleUpdated}
            onLinkDeleted={(slug) => setLinks(prev => prev.filter(l => l.slug !== slug))}
            onViewQRCode={setQrLink}
          />
        )}

        {activeTab === 'api' && <ApiDocsView />}
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-900 bg-slate-950 py-6 text-center text-xs text-slate-500">
        <p>Sink 企业级智能短链接与数据分析平台 · 支持后台管理 · 实时统计 · RESTful API</p>
      </footer>

      {/* Modals */}
      {isCreateOpen && (
        <CreateLinkModal
          onClose={() => setIsCreateOpen(false)}
          onCreated={handleCreated}
        />
      )}

      {editingLink && (
        <EditLinkModal
          link={editingLink}
          onClose={() => setEditingLink(null)}
          onUpdated={handleUpdated}
        />
      )}

      {qrLink && (
        <QRCodeModal
          url={`${window.location.origin}/${qrLink.slug}`}
          slug={qrLink.slug}
          onClose={() => setQrLink(null)}
        />
      )}
    </div>
  );
}
