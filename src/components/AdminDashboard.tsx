import React, { useState, useEffect } from 'react';
import {
  ShieldCheck,
  Link as LinkIcon,
  MousePointerClick,
  Activity,
  AlertTriangle,
  Lock,
  Calendar,
  CheckCircle2,
  XCircle,
  Search,
  Filter,
  Trash2,
  Edit,
  RotateCcw,
  Download,
  Upload,
  RefreshCw,
  ExternalLink,
  Copy,
  Check,
  ChevronLeft,
  ChevronRight,
  Database,
  Globe,
  Sliders,
  Sparkles,
  Layers,
  ArrowUpDown
} from 'lucide-react';
import { ShortLink, AdminStats, ClickEvent } from '../types';
import { EditLinkModal } from './EditLinkModal';

interface AdminDashboardProps {
  links: ShortLink[];
  onRefreshLinks: () => void;
  onLinkUpdated: (updatedLink: ShortLink) => void;
  onLinkDeleted: (slug: string) => void;
  onViewQRCode: (link: ShortLink) => void;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({
  links,
  onRefreshLinks,
  onLinkUpdated,
  onLinkDeleted,
  onViewQRCode,
}) => {
  const [activeAdminSubTab, setActiveAdminSubTab] = useState<'links' | 'clicks' | 'system'>('links');
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [isLoadingStats, setIsLoadingStats] = useState(false);

  // Link Management Filters & Selection
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive' | 'expired' | 'protected'>('all');
  const [sortBy, setSortBy] = useState<'date-desc' | 'date-asc' | 'clicks-desc' | 'clicks-asc' | 'slug'>('date-desc');
  const [selectedSlugs, setSelectedSlugs] = useState<string[]>([]);
  const [editingLink, setEditingLink] = useState<ShortLink | null>(null);
  const [copiedSlug, setCopiedSlug] = useState<string | null>(null);

  // Clicks Log State
  const [clicks, setClicks] = useState<ClickEvent[]>([]);
  const [clicksTotal, setClicksTotal] = useState(0);
  const [clicksPage, setClicksPage] = useState(1);
  const [clicksTotalPages, setClicksTotalPages] = useState(1);
  const [clicksSearch, setClicksSearch] = useState('');
  const [clicksSlugFilter, setClicksSlugFilter] = useState('');
  const [isLoadingClicks, setIsLoadingClicks] = useState(false);

  // System State
  const [actionMessage, setActionMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const fetchStats = async () => {
    setIsLoadingStats(true);
    try {
      const res = await fetch('/api/admin/stats');
      if (res.ok) {
        const data = await res.json();
        setStats(data);
      }
    } catch (err) {
      console.error('获取管理统计失败:', err);
    } finally {
      setIsLoadingStats(false);
    }
  };

  const fetchClicks = async (page = clicksPage, search = clicksSearch, slug = clicksSlugFilter) => {
    setIsLoadingClicks(true);
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: '15',
        search,
        slug,
      });
      const res = await fetch(`/api/admin/clicks?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setClicks(data.clicks || []);
        setClicksTotal(data.total || 0);
        setClicksPage(data.page || 1);
        setClicksTotalPages(data.totalPages || 1);
      }
    } catch (err) {
      console.error('获取访问日志失败:', err);
    } finally {
      setIsLoadingClicks(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, [links]);

  useEffect(() => {
    if (activeAdminSubTab === 'clicks') {
      fetchClicks(1, clicksSearch, clicksSlugFilter);
    }
  }, [activeAdminSubTab, clicksSlugFilter]);

  const showToast = (type: 'success' | 'error', text: string) => {
    setActionMessage({ type, text });
    setTimeout(() => {
      setActionMessage(null);
    }, 4000);
  };

  const handleCopyLink = (slug: string) => {
    const fullUrl = `${window.location.origin}/${slug}`;
    navigator.clipboard.writeText(fullUrl);
    setCopiedSlug(slug);
    showToast('success', `已复制短链接: ${fullUrl}`);
    setTimeout(() => setCopiedSlug(null), 2000);
  };

  // Toggle link active status
  const handleToggleActive = async (link: ShortLink) => {
    try {
      const res = await fetch(`/api/links/${link.slug}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: !link.isActive }),
      });
      if (res.ok) {
        const updated = await res.json();
        onLinkUpdated(updated);
        showToast('success', `短链接 /${link.slug} 已${updated.isActive ? '启用' : '禁用'}`);
        fetchStats();
      }
    } catch (err) {
      showToast('error', '修改状态失败');
    }
  };

  // Reset link clicks
  const handleResetClicks = async (slug: string) => {
    if (!window.confirm(`确定要重置短链接 /${slug} 的访问点击计数吗？`)) return;
    try {
      const res = await fetch(`/api/admin/links/${slug}/reset-clicks`, { method: 'POST' });
      if (res.ok) {
        const data = await res.json();
        onLinkUpdated(data.link);
        showToast('success', `短链接 /${slug} 点击量已清零`);
        fetchStats();
      }
    } catch (err) {
      showToast('error', '重置点击失败');
    }
  };

  // Delete single link
  const handleDeleteLink = async (slug: string) => {
    if (!window.confirm(`确定要彻底删除短链接 /${slug} 及其所有历史访问记录吗？此操作不可恢复。`)) return;
    try {
      const res = await fetch(`/api/links/${slug}`, { method: 'DELETE' });
      if (res.ok) {
        onLinkDeleted(slug);
        setSelectedSlugs(prev => prev.filter(s => s !== slug));
        showToast('success', `短链接 /${slug} 已成功删除`);
        fetchStats();
      }
    } catch (err) {
      showToast('error', '删除短链接失败');
    }
  };

  // Batch actions
  const handleBatchAction = async (action: 'activate' | 'deactivate' | 'delete') => {
    if (selectedSlugs.length === 0) {
      showToast('error', '请先勾选需要操作的短链接');
      return;
    }

    const actionNames: Record<string, string> = {
      activate: '批量启用',
      deactivate: '批量禁用',
      delete: '批量删除',
    };

    if (!window.confirm(`确定要对选中的 ${selectedSlugs.length} 个短链接执行【${actionNames[action]}】吗？`)) return;

    setIsProcessing(true);
    try {
      const res = await fetch('/api/admin/links/batch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, slugs: selectedSlugs }),
      });

      if (res.ok) {
        showToast('success', `成功对 ${selectedSlugs.length} 项执行${actionNames[action]}`);
        setSelectedSlugs([]);
        onRefreshLinks();
        fetchStats();
      } else {
        const data = await res.json();
        showToast('error', data.error || '批量操作失败');
      }
    } catch (err) {
      showToast('error', '网络请求失败');
    } finally {
      setIsProcessing(false);
    }
  };

  // Delete single click log
  const handleDeleteClick = async (id: string) => {
    try {
      const res = await fetch(`/api/admin/clicks/${id}`, { method: 'DELETE' });
      if (res.ok) {
        setClicks(prev => prev.filter(c => c.id !== id));
        setClicksTotal(prev => Math.max(0, prev - 1));
        fetchStats();
        onRefreshLinks();
      }
    } catch (err) {
      showToast('error', '删除记录失败');
    }
  };

  // Clear all clicks
  const handleClearClicks = async () => {
    if (!window.confirm('确定要清空全部访问流水日志并重置所有短链点击计数吗？')) return;
    try {
      const res = await fetch('/api/admin/clicks/clear', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });
      if (res.ok) {
        showToast('success', '所有访问日志已清空');
        fetchClicks(1);
        fetchStats();
        onRefreshLinks();
      }
    } catch (err) {
      showToast('error', '清空日志失败');
    }
  };

  // Export JSON Backup
  const handleExportBackup = () => {
    window.location.href = '/api/admin/backup';
    showToast('success', '备份文件正在生成并下载...');
  };

  // Import JSON Backup
  const handleImportBackup = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async event => {
      try {
        const content = event.target?.result as string;
        const parsed = JSON.parse(content);

        if (!Array.isArray(parsed.links)) {
          showToast('error', '文件格式不正确，缺少 links 列表');
          return;
        }

        if (!window.confirm(`确定要从备份恢复数据吗？这将覆盖当前现有的短链接与访问记录。`)) return;

        setIsProcessing(true);
        const res = await fetch('/api/admin/restore', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ links: parsed.links, clicks: parsed.clicks || [] }),
        });

        const data = await res.json();
        if (res.ok) {
          showToast('success', data.message || '数据已成功恢复');
          onRefreshLinks();
          fetchStats();
        } else {
          showToast('error', data.error || '数据恢复失败');
        }
      } catch (err) {
        showToast('error', '解析 JSON 备份文件失败，请检查文件格式');
      } finally {
        setIsProcessing(false);
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  // Reset Demo Data
  const handleResetDemo = async () => {
    if (!window.confirm('警告：此操作将清空所有自定义数据并恢复为系统预设演示短链接。确定继续吗？')) return;
    setIsProcessing(true);
    try {
      const res = await fetch('/api/admin/reset-demo', { method: 'POST' });
      if (res.ok) {
        showToast('success', '演示数据已恢复初始化');
        onRefreshLinks();
        fetchStats();
      }
    } catch (err) {
      showToast('error', '恢复演示数据失败');
    } finally {
      setIsProcessing(false);
    }
  };

  // Filtered links
  const now = new Date();
  const filteredLinks = links
    .filter(link => {
      // search
      const q = searchQuery.toLowerCase().trim();
      const matchSearch =
        !q ||
        link.slug.toLowerCase().includes(q) ||
        link.url.toLowerCase().includes(q) ||
        (link.title && link.title.toLowerCase().includes(q)) ||
        (link.tags && link.tags.some(t => t.toLowerCase().includes(q)));

      if (!matchSearch) return false;

      // status
      if (statusFilter === 'active') {
        return link.isActive && (!link.expiresAt || new Date(link.expiresAt) >= now);
      }
      if (statusFilter === 'inactive') {
        return !link.isActive;
      }
      if (statusFilter === 'expired') {
        return link.expiresAt && new Date(link.expiresAt) < now;
      }
      if (statusFilter === 'protected') {
        return Boolean(link.password);
      }

      return true;
    })
    .sort((a, b) => {
      if (sortBy === 'date-desc') return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      if (sortBy === 'date-asc') return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      if (sortBy === 'clicks-desc') return b.clicksCount - a.clicksCount;
      if (sortBy === 'clicks-asc') return a.clicksCount - b.clicksCount;
      if (sortBy === 'slug') return a.slug.localeCompare(b.slug);
      return 0;
    });

  const handleSelectAll = () => {
    if (selectedSlugs.length === filteredLinks.length) {
      setSelectedSlugs([]);
    } else {
      setSelectedSlugs(filteredLinks.map(l => l.slug));
    }
  };

  const handleToggleSelect = (slug: string) => {
    setSelectedSlugs(prev =>
      prev.includes(slug) ? prev.filter(s => s !== slug) : [...prev, slug]
    );
  };

  return (
    <div className="space-y-6">
      {/* Toast Alert */}
      {actionMessage && (
        <div
          className={`fixed bottom-6 right-6 z-50 flex items-center gap-2 rounded-xl px-4 py-3 text-sm font-medium shadow-2xl transition-all border ${
            actionMessage.type === 'success'
              ? 'bg-emerald-950/90 text-emerald-300 border-emerald-500/30'
              : 'bg-rose-950/90 text-rose-300 border-rose-500/30'
          }`}
        >
          {actionMessage.type === 'success' ? (
            <CheckCircle2 className="h-4 w-4 text-emerald-400" />
          ) : (
            <AlertTriangle className="h-4 w-4 text-rose-400" />
          )}
          <span>{actionMessage.text}</span>
        </div>
      )}

      {/* Admin Top Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 rounded-2xl border border-slate-800 bg-slate-900/60 p-5 backdrop-blur-md">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
            <ShieldCheck className="h-6 w-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold text-white tracking-tight">后台管理控制台</h1>
              <span className="rounded-full bg-indigo-500/10 px-2.5 py-0.5 text-xs font-semibold text-indigo-400 border border-indigo-500/20">
                系统管理员
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              全站短链接集中管控、实时审计追踪、批量运维及数据容灾备份
            </p>
          </div>
        </div>

        {/* Sub-tab Navigation */}
        <div className="flex items-center gap-1 bg-slate-950/80 p-1 rounded-xl border border-slate-800 self-start md:self-auto">
          <button
            onClick={() => setActiveAdminSubTab('links')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
              activeAdminSubTab === 'links'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <LinkIcon className="h-3.5 w-3.5" />
            <span>短链管理 ({links.length})</span>
          </button>
          <button
            onClick={() => setActiveAdminSubTab('clicks')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
              activeAdminSubTab === 'clicks'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Activity className="h-3.5 w-3.5" />
            <span>访问流水日志</span>
          </button>
          <button
            onClick={() => setActiveAdminSubTab('system')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
              activeAdminSubTab === 'system'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Database className="h-3.5 w-3.5" />
            <span>数据维护与配置</span>
          </button>
        </div>
      </div>

      {/* KPI Overview Metrics Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <div className="rounded-xl border border-slate-800 bg-slate-900/40 p-4">
          <div className="flex items-center justify-between text-slate-400 text-xs font-medium mb-1">
            <span>短链接总数</span>
            <LinkIcon className="h-4 w-4 text-indigo-400" />
          </div>
          <div className="text-2xl font-bold text-white tracking-tight">
            {stats ? stats.totalLinks : links.length}
          </div>
          <div className="text-[11px] text-slate-500 mt-1">系统创建的所有短链</div>
        </div>

        <div className="rounded-xl border border-slate-800 bg-slate-900/40 p-4">
          <div className="flex items-center justify-between text-slate-400 text-xs font-medium mb-1">
            <span>生效中</span>
            <CheckCircle2 className="h-4 w-4 text-emerald-400" />
          </div>
          <div className="text-2xl font-bold text-emerald-400 tracking-tight">
            {stats ? stats.activeLinks : links.filter(l => l.isActive).length}
          </div>
          <div className="text-[11px] text-slate-500 mt-1">可正常跳转重定向</div>
        </div>

        <div className="rounded-xl border border-slate-800 bg-slate-900/40 p-4">
          <div className="flex items-center justify-between text-slate-400 text-xs font-medium mb-1">
            <span>已停用</span>
            <XCircle className="h-4 w-4 text-amber-400" />
          </div>
          <div className="text-2xl font-bold text-amber-400 tracking-tight">
            {stats ? stats.inactiveLinks : links.filter(l => !l.isActive).length}
          </div>
          <div className="text-[11px] text-slate-500 mt-1">手动关闭跳转功能</div>
        </div>

        <div className="rounded-xl border border-slate-800 bg-slate-900/40 p-4">
          <div className="flex items-center justify-between text-slate-400 text-xs font-medium mb-1">
            <span>密码防护</span>
            <Lock className="h-4 w-4 text-purple-400" />
          </div>
          <div className="text-2xl font-bold text-purple-400 tracking-tight">
            {stats ? stats.passwordProtectedLinks : links.filter(l => Boolean(l.password)).length}
          </div>
          <div className="text-[11px] text-slate-500 mt-1">需输密码方可跳转</div>
        </div>

        <div className="rounded-xl border border-slate-800 bg-slate-900/40 p-4">
          <div className="flex items-center justify-between text-slate-400 text-xs font-medium mb-1">
            <span>总点击量</span>
            <MousePointerClick className="h-4 w-4 text-cyan-400" />
          </div>
          <div className="text-2xl font-bold text-white tracking-tight">
            {stats ? stats.totalClicks : links.reduce((sum, l) => sum + l.clicksCount, 0)}
          </div>
          <div className="text-[11px] text-slate-500 mt-1">全站累计跳转次数</div>
        </div>

        <div className="rounded-xl border border-slate-800 bg-slate-900/40 p-4">
          <div className="flex items-center justify-between text-slate-400 text-xs font-medium mb-1">
            <span>今日点击</span>
            <Activity className="h-4 w-4 text-rose-400" />
          </div>
          <div className="text-2xl font-bold text-rose-400 tracking-tight">
            {stats ? stats.todayClicks : 0}
          </div>
          <div className="text-[11px] text-slate-500 mt-1">当天新产生访问</div>
        </div>
      </div>

      {/* SUBTAB 1: Short Links Table */}
      {activeAdminSubTab === 'links' && (
        <div className="space-y-4">
          {/* Action & Filter Toolbar */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 bg-slate-900/50 p-3.5 rounded-xl border border-slate-800">
            {/* Search Input */}
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <input
                type="text"
                placeholder="搜索短链后缀、目标网址、标题或标签..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full rounded-xl border border-slate-800 bg-slate-950 pl-9 pr-4 py-2 text-xs text-white placeholder-slate-500 focus:border-indigo-500 focus:outline-none"
              />
            </div>

            {/* Filters and Sort */}
            <div className="flex flex-wrap items-center gap-2 text-xs">
              <div className="flex items-center gap-1.5 bg-slate-950 px-3 py-1.5 rounded-xl border border-slate-800">
                <Filter className="h-3.5 w-3.5 text-slate-400" />
                <select
                  value={statusFilter}
                  onChange={e => setStatusFilter(e.target.value as any)}
                  className="bg-transparent text-slate-300 outline-none cursor-pointer"
                >
                  <option value="all">所有状态</option>
                  <option value="active">正常生效</option>
                  <option value="inactive">已禁用</option>
                  <option value="expired">已过期</option>
                  <option value="protected">密码保护</option>
                </select>
              </div>

              <div className="flex items-center gap-1.5 bg-slate-950 px-3 py-1.5 rounded-xl border border-slate-800">
                <ArrowUpDown className="h-3.5 w-3.5 text-slate-400" />
                <select
                  value={sortBy}
                  onChange={e => setSortBy(e.target.value as any)}
                  className="bg-transparent text-slate-300 outline-none cursor-pointer"
                >
                  <option value="date-desc">创建时间 (从新到旧)</option>
                  <option value="date-asc">创建时间 (从旧到新)</option>
                  <option value="clicks-desc">点击次数 (从高到低)</option>
                  <option value="clicks-asc">点击次数 (从低到高)</option>
                  <option value="slug">后缀字母 (A-Z)</option>
                </select>
              </div>

              <button
                onClick={onRefreshLinks}
                className="flex items-center gap-1 rounded-xl border border-slate-800 bg-slate-950 px-3 py-2 text-slate-300 hover:bg-slate-800"
                title="刷新列表"
              >
                <RefreshCw className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">刷新</span>
              </button>
            </div>
          </div>

          {/* Batch Actions Bar (when selected) */}
          {selectedSlugs.length > 0 && (
            <div className="flex items-center justify-between bg-indigo-950/40 border border-indigo-500/30 px-4 py-2.5 rounded-xl text-xs">
              <div className="flex items-center gap-2 text-indigo-300 font-medium">
                <span>已选中 {selectedSlugs.length} 个短链接</span>
                <button
                  onClick={() => setSelectedSlugs([])}
                  className="text-slate-400 hover:text-white underline ml-2"
                >
                  取消全选
                </button>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleBatchAction('activate')}
                  disabled={isProcessing}
                  className="flex items-center gap-1 bg-emerald-600/20 text-emerald-300 border border-emerald-500/30 px-3 py-1.5 rounded-lg hover:bg-emerald-600/30 font-medium"
                >
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  <span>启用</span>
                </button>
                <button
                  onClick={() => handleBatchAction('deactivate')}
                  disabled={isProcessing}
                  className="flex items-center gap-1 bg-amber-600/20 text-amber-300 border border-amber-500/30 px-3 py-1.5 rounded-lg hover:bg-amber-600/30 font-medium"
                >
                  <XCircle className="h-3.5 w-3.5" />
                  <span>禁用</span>
                </button>
                <button
                  onClick={() => handleBatchAction('delete')}
                  disabled={isProcessing}
                  className="flex items-center gap-1 bg-rose-600/20 text-rose-300 border border-rose-500/30 px-3 py-1.5 rounded-lg hover:bg-rose-600/30 font-medium"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  <span>删除</span>
                </button>
              </div>
            </div>
          )}

          {/* Links Management Table */}
          <div className="overflow-x-auto rounded-2xl border border-slate-800 bg-slate-900/40">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="bg-slate-950/60 text-slate-400 border-b border-slate-800 select-none">
                <tr>
                  <th className="py-3 px-4 w-10">
                    <input
                      type="checkbox"
                      checked={selectedSlugs.length > 0 && selectedSlugs.length === filteredLinks.length}
                      onChange={handleSelectAll}
                      className="rounded bg-slate-800 border-slate-700 text-indigo-600 focus:ring-0 cursor-pointer"
                    />
                  </th>
                  <th className="py-3 px-4 font-semibold">短链接 / 后缀</th>
                  <th className="py-3 px-4 font-semibold">目标原始网址</th>
                  <th className="py-3 px-4 font-semibold">状态与属性</th>
                  <th className="py-3 px-4 font-semibold text-center">点击量</th>
                  <th className="py-3 px-4 font-semibold">创建时间</th>
                  <th className="py-3 px-4 font-semibold text-right">操作管理</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {filteredLinks.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-slate-500">
                      没有找到匹配的短链接
                    </td>
                  </tr>
                ) : (
                  filteredLinks.map(link => {
                    const isSelected = selectedSlugs.includes(link.slug);
                    const isExpired = link.expiresAt && new Date(link.expiresAt) < now;

                    return (
                      <tr
                        key={link.id}
                        className={`hover:bg-slate-800/40 transition-colors ${
                          isSelected ? 'bg-indigo-950/20' : ''
                        }`}
                      >
                        {/* Checkbox */}
                        <td className="py-3.5 px-4">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => handleToggleSelect(link.slug)}
                            className="rounded bg-slate-800 border-slate-700 text-indigo-600 focus:ring-0 cursor-pointer"
                          />
                        </td>

                        {/* Slug & Title */}
                        <td className="py-3.5 px-4 max-w-[220px]">
                          <div className="flex items-center gap-2">
                            <span className="font-mono font-semibold text-indigo-400 hover:underline cursor-pointer" onClick={() => handleCopyLink(link.slug)}>
                              /{link.slug}
                            </span>
                            <button
                              onClick={() => handleCopyLink(link.slug)}
                              className="text-slate-500 hover:text-slate-300"
                              title="复制短链接"
                            >
                              {copiedSlug === link.slug ? (
                                <Check className="h-3 w-3 text-emerald-400" />
                              ) : (
                                <Copy className="h-3 w-3" />
                              )}
                            </button>
                          </div>
                          {link.title && (
                            <div className="text-[11px] text-slate-400 truncate mt-0.5" title={link.title}>
                              {link.title}
                            </div>
                          )}
                          {link.tags && link.tags.length > 0 && (
                            <div className="flex flex-wrap gap-1 mt-1">
                              {link.tags.map(t => (
                                <span
                                  key={t}
                                  className="text-[10px] bg-slate-800 text-slate-400 px-1.5 py-0.2 rounded"
                                >
                                  #{t}
                                </span>
                              ))}
                            </div>
                          )}
                        </td>

                        {/* Original URL */}
                        <td className="py-3.5 px-4 max-w-[260px]">
                          <div className="flex items-center gap-1.5">
                            <span className="truncate font-mono text-slate-300 text-[11px]" title={link.url}>
                              {link.url}
                            </span>
                            <a
                              href={link.url}
                              target="_blank"
                              rel="noreferrer"
                              className="text-slate-500 hover:text-slate-300 shrink-0"
                              title="在新窗口打开目标网址"
                            >
                              <ExternalLink className="h-3 w-3" />
                            </a>
                          </div>
                          {link.description && (
                            <div className="text-[10px] text-slate-500 truncate mt-0.5">
                              {link.description}
                            </div>
                          )}
                        </td>

                        {/* Status badges */}
                        <td className="py-3.5 px-4">
                          <div className="flex flex-wrap items-center gap-1.5">
                            {link.isActive && !isExpired ? (
                              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-medium text-emerald-400 border border-emerald-500/20">
                                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                                正常
                              </span>
                            ) : isExpired ? (
                              <span className="inline-flex items-center gap-1 rounded-full bg-rose-500/10 px-2 py-0.5 text-[10px] font-medium text-rose-400 border border-rose-500/20">
                                <span className="h-1.5 w-1.5 rounded-full bg-rose-400" />
                                已过期
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 rounded-full bg-slate-800 px-2 py-0.5 text-[10px] font-medium text-slate-400 border border-slate-700">
                                <span className="h-1.5 w-1.5 rounded-full bg-slate-500" />
                                已禁用
                              </span>
                            )}

                            {link.password && (
                              <span
                                className="inline-flex items-center gap-1 rounded-full bg-purple-500/10 px-1.5 py-0.5 text-[10px] text-purple-400 border border-purple-500/20"
                                title={`已设密: ${link.password}`}
                              >
                                <Lock className="h-2.5 w-2.5" />
                                密码
                              </span>
                            )}

                            {link.expiresAt && !isExpired && (
                              <span
                                className="inline-flex items-center gap-1 rounded-full bg-indigo-500/10 px-1.5 py-0.5 text-[10px] text-indigo-400 border border-indigo-500/20"
                                title={`到期: ${new Date(link.expiresAt).toLocaleString()}`}
                              >
                                <Calendar className="h-2.5 w-2.5" />
                                限时
                              </span>
                            )}
                          </div>
                        </td>

                        {/* Clicks */}
                        <td className="py-3.5 px-4 text-center">
                          <span className="font-mono font-bold text-white bg-slate-950 px-2 py-0.5 rounded-md border border-slate-800">
                            {link.clicksCount}
                          </span>
                        </td>

                        {/* Created Date */}
                        <td className="py-3.5 px-4 text-slate-400 text-[11px] whitespace-nowrap">
                          {new Date(link.createdAt).toLocaleDateString('zh-CN', {
                            year: 'numeric',
                            month: '2-digit',
                            day: '2-digit',
                          })}
                        </td>

                        {/* Actions */}
                        <td className="py-3.5 px-4 text-right">
                          <div className="flex items-center justify-end gap-1">
                            {/* Toggle Active */}
                            <button
                              onClick={() => handleToggleActive(link)}
                              className={`p-1.5 rounded-lg border transition-colors ${
                                link.isActive
                                  ? 'text-emerald-400 hover:bg-emerald-500/10 border-transparent hover:border-emerald-500/20'
                                  : 'text-slate-500 hover:bg-slate-800 border-transparent'
                              }`}
                              title={link.isActive ? '点击暂停/禁用' : '点击启用'}
                            >
                              {link.isActive ? (
                                <CheckCircle2 className="h-3.5 w-3.5" />
                              ) : (
                                <XCircle className="h-3.5 w-3.5" />
                              )}
                            </button>

                            {/* Edit Modal */}
                            <button
                              onClick={() => setEditingLink(link)}
                              className="p-1.5 text-slate-400 hover:text-indigo-400 hover:bg-indigo-500/10 rounded-lg transition-colors"
                              title="编辑短链详情"
                            >
                              <Edit className="h-3.5 w-3.5" />
                            </button>

                            {/* Reset Clicks */}
                            <button
                              onClick={() => handleResetClicks(link.slug)}
                              className="p-1.5 text-slate-400 hover:text-amber-400 hover:bg-amber-500/10 rounded-lg transition-colors"
                              title="清零点击量"
                            >
                              <RotateCcw className="h-3.5 w-3.5" />
                            </button>

                            {/* View QR Code */}
                            <button
                              onClick={() => onViewQRCode(link)}
                              className="p-1.5 text-slate-400 hover:text-cyan-400 hover:bg-cyan-500/10 rounded-lg transition-colors"
                              title="生成二维码"
                            >
                              <Globe className="h-3.5 w-3.5" />
                            </button>

                            {/* Delete */}
                            <button
                              onClick={() => handleDeleteLink(link.slug)}
                              className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-colors"
                              title="删除此短链"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* SUBTAB 2: Clicks Audit Log */}
      {activeAdminSubTab === 'clicks' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-900/50 p-3.5 rounded-xl border border-slate-800 text-xs">
            <div className="flex flex-wrap items-center gap-2 flex-1">
              <div className="relative flex-1 min-w-[200px] max-w-xs">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                <input
                  type="text"
                  placeholder="搜索 IP、浏览器、国家、来源..."
                  value={clicksSearch}
                  onChange={e => {
                    setClicksSearch(e.target.value);
                    fetchClicks(1, e.target.value, clicksSlugFilter);
                  }}
                  className="w-full rounded-xl border border-slate-800 bg-slate-950 pl-8 pr-3 py-1.5 text-white placeholder-slate-500 focus:border-indigo-500 focus:outline-none"
                />
              </div>

              <div className="flex items-center gap-1.5 bg-slate-950 px-2.5 py-1.5 rounded-xl border border-slate-800">
                <span className="text-slate-400">短链筛选:</span>
                <select
                  value={clicksSlugFilter}
                  onChange={e => {
                    setClicksSlugFilter(e.target.value);
                    fetchClicks(1, clicksSearch, e.target.value);
                  }}
                  className="bg-transparent text-slate-300 outline-none cursor-pointer font-mono"
                >
                  <option value="">全部短链接</option>
                  {links.map(l => (
                    <option key={l.id} value={l.slug}>
                      /{l.slug}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => fetchClicks(clicksPage, clicksSearch, clicksSlugFilter)}
                className="flex items-center gap-1 px-3 py-1.5 rounded-lg border border-slate-800 bg-slate-950 text-slate-300 hover:bg-slate-800"
              >
                <RefreshCw className={`h-3 w-3 ${isLoadingClicks ? 'animate-spin' : ''}`} />
                <span>刷新</span>
              </button>
              <button
                onClick={handleClearClicks}
                className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-rose-600/20 text-rose-300 border border-rose-500/30 hover:bg-rose-600/30"
              >
                <Trash2 className="h-3 w-3" />
                <span>清空访问流水</span>
              </button>
            </div>
          </div>

          {/* Clicks Table */}
          <div className="overflow-x-auto rounded-2xl border border-slate-800 bg-slate-900/40">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="bg-slate-950/60 text-slate-400 border-b border-slate-800">
                <tr>
                  <th className="py-3 px-4 font-semibold">访问时间</th>
                  <th className="py-3 px-4 font-semibold">触发短链</th>
                  <th className="py-3 px-4 font-semibold">访客 IP</th>
                  <th className="py-3 px-4 font-semibold">地区 / 国家</th>
                  <th className="py-3 px-4 font-semibold">设备与浏览器</th>
                  <th className="py-3 px-4 font-semibold">引荐来源 (Referrer)</th>
                  <th className="py-3 px-4 font-semibold text-right">管理</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {clicks.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-slate-500">
                      {isLoadingClicks ? '正在加载日志...' : '暂无访问流水记录'}
                    </td>
                  </tr>
                ) : (
                  clicks.map(click => (
                    <tr key={click.id} className="hover:bg-slate-800/30 transition-colors">
                      <td className="py-3 px-4 text-slate-400 whitespace-nowrap font-mono text-[11px]">
                        {new Date(click.timestamp).toLocaleString('zh-CN')}
                      </td>
                      <td className="py-3 px-4">
                        <span className="font-mono font-semibold text-indigo-400">/{click.slug}</span>
                      </td>
                      <td className="py-3 px-4 font-mono text-slate-400 text-[11px]">{click.ip}</td>
                      <td className="py-3 px-4">
                        <span className="bg-slate-800 text-slate-300 px-2 py-0.5 rounded text-[11px]">
                          {click.country || '本地/未知'}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-1.5">
                          <span className="text-white font-medium">{click.browser}</span>
                          <span className="text-slate-500">/</span>
                          <span className="text-slate-400">{click.device || 'PC'}</span>
                        </div>
                      </td>
                      <td className="py-3 px-4 max-w-[200px] truncate text-slate-400 text-[11px]">
                        {click.referrer || '直接输入/Direct'}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <button
                          onClick={() => handleDeleteClick(click.id)}
                          className="p-1 text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 rounded transition-colors"
                          title="删除该条记录"
                        >
                          <Trash2 className="h-3 w-3" />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div className="flex items-center justify-between text-xs text-slate-400 px-1">
            <div>
              共计 <strong className="text-white">{clicksTotal}</strong> 条日志流水，当前第{' '}
              <strong className="text-white">{clicksPage}</strong> / {clicksTotalPages} 页
            </div>
            <div className="flex items-center gap-1">
              <button
                onClick={() => fetchClicks(Math.max(1, clicksPage - 1), clicksSearch, clicksSlugFilter)}
                disabled={clicksPage <= 1}
                className="flex items-center gap-1 px-3 py-1.5 rounded-lg border border-slate-800 bg-slate-950 text-slate-300 disabled:opacity-40 hover:bg-slate-800"
              >
                <ChevronLeft className="h-3.5 w-3.5" />
                <span>上一页</span>
              </button>
              <button
                onClick={() => fetchClicks(Math.min(clicksTotalPages, clicksPage + 1), clicksSearch, clicksSlugFilter)}
                disabled={clicksPage >= clicksTotalPages}
                className="flex items-center gap-1 px-3 py-1.5 rounded-lg border border-slate-800 bg-slate-950 text-slate-300 disabled:opacity-40 hover:bg-slate-800"
              >
                <span>下一页</span>
                <ChevronRight className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* SUBTAB 3: System Maintenance */}
      {activeAdminSubTab === 'system' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Data Backup & Restore */}
          <div className="rounded-2xl border border-slate-800 bg-slate-900/40 p-5 space-y-4">
            <div className="flex items-center gap-2 text-white font-bold text-base pb-3 border-b border-slate-800">
              <Database className="h-5 w-5 text-indigo-400" />
              <span>数据备份与灾备恢复</span>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed">
              将当前服务的所有短链接定义、访问密码、到期时间规则以及访问流水点击全量导出为结构化 JSON 格式；亦可一键上传备份文件进行全量恢复。
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
              <button
                onClick={handleExportBackup}
                className="flex items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-xs font-semibold text-white hover:bg-indigo-500 transition-colors shadow-sm"
              >
                <Download className="h-4 w-4" />
                <span>导出全量 JSON 备份</span>
              </button>

              <label className="flex items-center justify-center gap-2 rounded-xl border border-slate-700 bg-slate-800/80 px-4 py-2.5 text-xs font-semibold text-slate-200 hover:bg-slate-800 transition-colors cursor-pointer">
                <Upload className="h-4 w-4 text-indigo-400" />
                <span>导入备份并恢复</span>
                <input
                  type="file"
                  accept=".json"
                  onChange={handleImportBackup}
                  className="hidden"
                />
              </label>
            </div>

            <div className="pt-4 border-t border-slate-800">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-xs font-semibold text-rose-400">重置为初始演示数据</h4>
                  <p className="text-[11px] text-slate-500 mt-0.5">清空现有数据库并重新生成初始内置示例</p>
                </div>
                <button
                  onClick={handleResetDemo}
                  disabled={isProcessing}
                  className="px-3 py-1.5 rounded-lg bg-rose-500/10 text-rose-400 border border-rose-500/20 text-xs font-semibold hover:bg-rose-500/20 transition-colors"
                >
                  重置演示数据
                </button>
              </div>
            </div>
          </div>

          {/* Cloud Run Domain & Deployment Guide */}
          <div className="rounded-2xl border border-slate-800 bg-slate-900/40 p-5 space-y-4">
            <div className="flex items-center gap-2 text-white font-bold text-base pb-3 border-b border-slate-800">
              <Globe className="h-5 w-5 text-emerald-400" />
              <span>域名与 Google Cloud Run 说明</span>
            </div>

            <div className="space-y-3 text-xs text-slate-300 leading-relaxed">
              <div className="rounded-xl bg-slate-950 p-3.5 border border-slate-800 space-y-2">
                <div className="flex items-center gap-1.5 font-semibold text-indigo-400">
                  <Sparkles className="h-3.5 w-3.5" />
                  <span>为什么发布后默认是 .run.app 域名？</span>
                </div>
                <p className="text-slate-400 text-[11px] leading-relaxed">
                  Google Cloud Run 容器服务在部署完成后，平台基础设施会自动分配一个由 Google 统一托管的 HTTPS 规范域名（形如 <code className="text-indigo-300">https://xxx.asia-east1.run.app</code>）。
                </p>
              </div>

              <div className="rounded-xl bg-slate-950 p-3.5 border border-slate-800 space-y-2">
                <div className="font-semibold text-emerald-400">如何绑定并生效自定义域名：</div>
                <ol className="list-decimal list-inside space-y-1 text-slate-400 text-[11px]">
                  <li>在 Google Cloud 控制台中，进入当前 Cloud Run 服务页面</li>
                  <li>选择【管理自定义网域 (Manage Custom Domains)】</li>
                  <li>在 DNS 提供商处添加解析记录（CNAME 指向 ghs.googlehosted.com）</li>
                  <li>DNS 解析生效后，SSL 证书将在数分钟内自动签发并完成路由映射</li>
                </ol>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Edit Link Modal Popup */}
      {editingLink && (
        <EditLinkModal
          link={editingLink}
          onClose={() => setEditingLink(null)}
          onUpdated={updated => {
            onLinkUpdated(updated);
            showToast('success', `短链接 /${updated.slug} 更新成功`);
            setEditingLink(null);
            fetchStats();
          }}
        />
      )}
    </div>
  );
};
