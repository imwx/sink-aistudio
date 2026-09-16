import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { nanoid } from 'nanoid';
import { UAParser } from 'ua-parser-js';
import { GoogleGenAI } from '@google/genai';
import { createServer as createViteServer } from 'vite';
import { ShortLink, ClickEvent, AnalyticsSummary, CreateLinkPayload } from './src/types.js';

const rootDir = process.cwd();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// Persistent JSON Storage setup
const DATA_DIR = path.join(rootDir, 'data');
const DATA_FILE = path.join(DATA_DIR, 'store.json');

interface DataStore {
  links: ShortLink[];
  clicks: ClickEvent[];
}

function initDataStore(): DataStore {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }

  if (fs.existsSync(DATA_FILE)) {
    try {
      const raw = fs.readFileSync(DATA_FILE, 'utf-8');
      return JSON.parse(raw);
    } catch (e) {
      console.error('Error reading store.json, reinitializing:', e);
    }
  }

  // Initial seed data with rich sample links and click stats
  const seedLinks: ShortLink[] = [
    {
      id: 'link_1',
      slug: 'github',
      url: 'https://github.com',
      title: 'GitHub Homepage',
      description: 'Official GitHub developer platform',
      isActive: true,
      createdAt: new Date(Date.now() - 7 * 86400000).toISOString(),
      clicksCount: 142,
      tags: ['code', 'dev', 'git']
    },
    {
      id: 'link_2',
      slug: 'docs',
      url: 'https://react.dev',
      title: 'React Documentation',
      description: 'Official React documentation and tutorials',
      isActive: true,
      createdAt: new Date(Date.now() - 5 * 86400000).toISOString(),
      clicksCount: 89,
      tags: ['react', 'frontend', 'docs']
    },
    {
      id: 'link_3',
      slug: 'google',
      url: 'https://google.com',
      title: 'Google Search',
      description: 'Search the world information',
      isActive: true,
      createdAt: new Date(Date.now() - 2 * 86400000).toISOString(),
      clicksCount: 230,
      tags: ['search', 'tech']
    }
  ];

  const seedClicks: ClickEvent[] = [];
  const browsers = ['Chrome', 'Safari', 'Firefox', 'Edge'];
  const devices = ['Desktop', 'Mobile', 'Tablet'];
  const countries = ['United States', 'China', 'Japan', 'Germany', 'United Kingdom', 'Canada', 'Australia'];
  const referrers = ['Direct', 'https://twitter.com', 'https://linkedin.com', 'https://google.com', 'https://reddit.com'];

  // Seed historical click logs
  for (let i = 0; i < 461; i++) {
    const randomDaysAgo = Math.random() * 7;
    const link = seedLinks[Math.floor(Math.random() * seedLinks.length)];
    seedClicks.push({
      id: nanoid(10),
      slug: link.slug,
      timestamp: new Date(Date.now() - randomDaysAgo * 86400000).toISOString(),
      ip: `192.168.1.${Math.floor(Math.random() * 255)}`,
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
      device: devices[Math.floor(Math.random() * devices.length)],
      browser: browsers[Math.floor(Math.random() * browsers.length)],
      os: 'Windows 11',
      referrer: referrers[Math.floor(Math.random() * referrers.length)],
      country: countries[Math.floor(Math.random() * countries.length)]
    });
  }

  const initialStore = { links: seedLinks, clicks: seedClicks };
  try {
    fs.writeFileSync(DATA_FILE, JSON.stringify(initialStore, null, 2));
  } catch (err) {
    console.error('Failed to write seed data:', err);
  }
  return initialStore;
}

let store = initDataStore();

function saveStore() {
  try {
    fs.writeFileSync(DATA_FILE, JSON.stringify(store, null, 2));
  } catch (err) {
    console.error('Error writing store.json:', err);
  }
}

// Lazy Gemini API Client
let genAIClient: GoogleGenAI | null = null;
function getGenAI(): GoogleGenAI | null {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return null;
  if (!genAIClient) {
    genAIClient = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build'
        }
      }
    });
  }
  return genAIClient;
}

// API Routes
app.get('/api/health', (_req: Request, res: Response) => {
  res.json({ status: 'ok', time: new Date().toISOString() });
});

// List links
app.get('/api/links', (_req: Request, res: Response) => {
  res.json(store.links);
});

// Create link
app.post('/api/links', (req: Request, res: Response) => {
  const payload: CreateLinkPayload = req.body;
  
  if (!payload.url) {
    res.status(400).json({ error: 'Target URL is required' });
    return;
  }

  let targetUrl = payload.url.trim();
  if (!/^https?:\/\//i.test(targetUrl)) {
    targetUrl = 'https://' + targetUrl;
  }

  let slug = payload.slug ? payload.slug.trim().toLowerCase() : nanoid(6);
  slug = slug.replace(/[^a-z0-9_-]/g, '');

  if (!slug) {
    slug = nanoid(6);
  }

  // Check collision
  if (store.links.some(l => l.slug === slug)) {
    res.status(409).json({ error: `Slug "${slug}" is already taken` });
    return;
  }

  const newLink: ShortLink = {
    id: nanoid(12),
    slug,
    url: targetUrl,
    title: payload.title?.trim() || slug,
    description: payload.description?.trim() || '',
    password: payload.password || undefined,
    expiresAt: payload.expiresAt || null,
    isActive: true,
    createdAt: new Date().toISOString(),
    clicksCount: 0,
    tags: payload.tags || []
  };

  store.links.unshift(newLink);
  saveStore();

  res.status(201).json(newLink);
});

// Update link (partial)
app.patch('/api/links/:slug', (req: Request, res: Response) => {
  const { slug } = req.params;
  const linkIndex = store.links.findIndex(l => l.slug === slug);

  if (linkIndex === -1) {
    res.status(404).json({ error: '未找到该短链接' });
    return;
  }

  const existing = store.links[linkIndex];
  const updates = req.body;

  const updated: ShortLink = {
    ...existing,
    title: updates.title !== undefined ? updates.title : existing.title,
    description: updates.description !== undefined ? updates.description : existing.description,
    password: updates.password !== undefined ? updates.password : existing.password,
    expiresAt: updates.expiresAt !== undefined ? updates.expiresAt : existing.expiresAt,
    isActive: updates.isActive !== undefined ? updates.isActive : existing.isActive,
    tags: updates.tags !== undefined ? updates.tags : existing.tags
  };

  store.links[linkIndex] = updated;
  saveStore();

  res.json(updated);
});

// Update link (full update, supports changing slug)
app.put('/api/links/:slug', (req: Request, res: Response) => {
  const { slug } = req.params;
  const linkIndex = store.links.findIndex(l => l.slug === slug);

  if (linkIndex === -1) {
    res.status(404).json({ error: '未找到该短链接' });
    return;
  }

  const existing = store.links[linkIndex];
  const { url, slug: newSlug, title, description, password, expiresAt, isActive, tags } = req.body;

  let finalSlug = existing.slug;
  if (newSlug && newSlug.trim().toLowerCase() !== existing.slug) {
    const sanitizedSlug = newSlug.trim().toLowerCase().replace(/[^a-z0-9_-]/g, '');
    if (!sanitizedSlug) {
      res.status(400).json({ error: '短链接后缀无效' });
      return;
    }
    if (store.links.some(l => l.slug === sanitizedSlug && l.id !== existing.id)) {
      res.status(409).json({ error: `后缀 "${sanitizedSlug}" 已被占用` });
      return;
    }
    finalSlug = sanitizedSlug;

    // Update clicks slug references
    store.clicks.forEach(c => {
      if (c.slug === existing.slug) {
        c.slug = finalSlug;
      }
    });
  }

  let finalUrl = existing.url;
  if (url) {
    let tUrl = url.trim();
    if (!/^https?:\/\//i.test(tUrl)) {
      tUrl = 'https://' + tUrl;
    }
    finalUrl = tUrl;
  }

  const updated: ShortLink = {
    ...existing,
    slug: finalSlug,
    url: finalUrl,
    title: title !== undefined ? title.trim() : existing.title,
    description: description !== undefined ? description.trim() : existing.description,
    password: password !== undefined ? password : existing.password,
    expiresAt: expiresAt !== undefined ? expiresAt : existing.expiresAt,
    isActive: isActive !== undefined ? isActive : existing.isActive,
    tags: Array.isArray(tags) ? tags : existing.tags
  };

  store.links[linkIndex] = updated;
  saveStore();

  res.json(updated);
});

// Delete link
app.delete('/api/links/:slug', (req: Request, res: Response) => {
  const { slug } = req.params;
  const initialLen = store.links.length;
  store.links = store.links.filter(l => l.slug !== slug);
  store.clicks = store.clicks.filter(c => c.slug !== slug);

  if (store.links.length === initialLen) {
    res.status(404).json({ error: '未找到该短链接' });
    return;
  }

  saveStore();
  res.json({ success: true, message: `短链接 /${slug} 已删除` });
});

// ==================== ADMIN BACKEND API ====================

// Admin Stats
app.get('/api/admin/stats', (_req: Request, res: Response) => {
  const now = new Date();
  const todayStr = now.toISOString().split('T')[0];

  const totalLinks = store.links.length;
  const activeLinks = store.links.filter(l => l.isActive && (!l.expiresAt || new Date(l.expiresAt) >= now)).length;
  const inactiveLinks = store.links.filter(l => !l.isActive).length;
  const expiredLinks = store.links.filter(l => l.expiresAt && new Date(l.expiresAt) < now).length;
  const passwordProtectedLinks = store.links.filter(l => Boolean(l.password)).length;
  const totalClicks = store.clicks.length;
  const todayClicks = store.clicks.filter(c => c.timestamp.startsWith(todayStr)).length;

  res.json({
    totalLinks,
    activeLinks,
    inactiveLinks,
    expiredLinks,
    passwordProtectedLinks,
    totalClicks,
    todayClicks,
    storageClicksCount: totalClicks
  });
});

// Admin Clicks with search & pagination
app.get('/api/admin/clicks', (req: Request, res: Response) => {
  const search = (req.query.search as string || '').toLowerCase().trim();
  const slugFilter = (req.query.slug as string || '').trim();
  const page = Math.max(1, parseInt(req.query.page as string || '1', 10));
  const limit = Math.max(1, Math.min(100, parseInt(req.query.limit as string || '20', 10)));

  let filtered = [...store.clicks].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

  if (slugFilter) {
    filtered = filtered.filter(c => c.slug === slugFilter);
  }

  if (search) {
    filtered = filtered.filter(c => 
      c.slug.toLowerCase().includes(search) ||
      c.ip.toLowerCase().includes(search) ||
      c.referrer.toLowerCase().includes(search) ||
      c.browser.toLowerCase().includes(search) ||
      c.device.toLowerCase().includes(search) ||
      c.country.toLowerCase().includes(search)
    );
  }

  const total = filtered.length;
  const totalPages = Math.ceil(total / limit) || 1;
  const paginated = filtered.slice((page - 1) * limit, page * limit);

  res.json({
    clicks: paginated,
    total,
    page,
    totalPages
  });
});

// Admin Delete single click
app.delete('/api/admin/clicks/:id', (req: Request, res: Response) => {
  const { id } = req.params;
  const target = store.clicks.find(c => c.id === id);
  if (!target) {
    res.status(404).json({ error: '点击记录未找到' });
    return;
  }

  const slug = target.slug;
  store.clicks = store.clicks.filter(c => c.id !== id);

  // update link click count
  const link = store.links.find(l => l.slug === slug);
  if (link && link.clicksCount > 0) {
    link.clicksCount--;
  }

  saveStore();
  res.json({ success: true });
});

// Admin Clear Clicks
app.post('/api/admin/clicks/clear', (req: Request, res: Response) => {
  const { slug } = req.body;
  if (slug) {
    store.clicks = store.clicks.filter(c => c.slug !== slug);
    const link = store.links.find(l => l.slug === slug);
    if (link) {
      link.clicksCount = 0;
    }
  } else {
    store.clicks = [];
    store.links.forEach(l => {
      l.clicksCount = 0;
    });
  }

  saveStore();
  res.json({ success: true, message: slug ? `短链接 /${slug} 的点击记录已清空` : '所有访问记录已清空' });
});

// Admin Reset single link click count
app.post('/api/admin/links/:slug/reset-clicks', (req: Request, res: Response) => {
  const { slug } = req.params;
  const link = store.links.find(l => l.slug === slug);
  if (!link) {
    res.status(404).json({ error: '未找到该短链接' });
    return;
  }

  link.clicksCount = 0;
  store.clicks = store.clicks.filter(c => c.slug !== slug);
  saveStore();
  res.json({ success: true, link });
});

// Admin Batch Operations on links
app.post('/api/admin/links/batch', (req: Request, res: Response) => {
  const { action, slugs } = req.body;
  if (!Array.isArray(slugs) || slugs.length === 0) {
    res.status(400).json({ error: '请选择至少一个短链接' });
    return;
  }

  if (action === 'activate') {
    store.links.forEach(l => {
      if (slugs.includes(l.slug)) l.isActive = true;
    });
  } else if (action === 'deactivate') {
    store.links.forEach(l => {
      if (slugs.includes(l.slug)) l.isActive = false;
    });
  } else if (action === 'delete') {
    store.links = store.links.filter(l => !slugs.includes(l.slug));
    store.clicks = store.clicks.filter(c => !slugs.includes(c.slug));
  } else {
    res.status(400).json({ error: '未知批量操作类型' });
    return;
  }

  saveStore();
  res.json({ success: true, modifiedCount: slugs.length });
});

// Admin Export Backup JSON
app.get('/api/admin/backup', (_req: Request, res: Response) => {
  res.setHeader('Content-Disposition', `attachment; filename="sink-backup-${Date.now()}.json"`);
  res.setHeader('Content-Type', 'application/json');
  res.json({
    version: '2.0',
    exportedAt: new Date().toISOString(),
    links: store.links,
    clicks: store.clicks
  });
});

// Admin Restore Backup JSON
app.post('/api/admin/restore', (req: Request, res: Response) => {
  const { links, clicks } = req.body;
  if (!Array.isArray(links)) {
    res.status(400).json({ error: '备份数据格式不正确，缺少 links 数组' });
    return;
  }

  store.links = links;
  store.clicks = Array.isArray(clicks) ? clicks : [];
  saveStore();

  res.json({ success: true, message: `成功恢复 ${links.length} 条短链及 ${store.clicks.length} 条点击数据` });
});

// Admin Reset Demo Data
app.post('/api/admin/reset-demo', (_req: Request, res: Response) => {
  if (fs.existsSync(DATA_FILE)) {
    try {
      fs.unlinkSync(DATA_FILE);
    } catch (e) {
      console.error(e);
    }
  }
  store = initDataStore();
  res.json({ success: true, message: '系统演示数据已恢复初始化状态' });
});

// Overall or single link analytics
app.get('/api/analytics', (req: Request, res: Response) => {
  const slugFilter = req.query.slug as string | undefined;
  
  let clicksToAnalyze = store.clicks;
  if (slugFilter) {
    clicksToAnalyze = store.clicks.filter(c => c.slug === slugFilter);
  }

  // Clicks by date (last 7 days)
  const dateCounts: Record<string, number> = {};
  for (let i = 6; i >= 0; i--) {
    const d = new Date(Date.now() - i * 86400000).toISOString().split('T')[0];
    dateCounts[d] = 0;
  }

  clicksToAnalyze.forEach(c => {
    const day = c.timestamp.split('T')[0];
    if (dateCounts[day] !== undefined) {
      dateCounts[day]++;
    }
  });

  const clicksByDate = Object.entries(dateCounts).map(([date, clicks]) => ({ date, clicks }));

  // Breakdown counters
  const referrerMap: Record<string, number> = {};
  const deviceMap: Record<string, number> = {};
  const browserMap: Record<string, number> = {};
  const countryMap: Record<string, number> = {};

  clicksToAnalyze.forEach(c => {
    referrerMap[c.referrer || 'Direct'] = (referrerMap[c.referrer || 'Direct'] || 0) + 1;
    deviceMap[c.device || 'Desktop'] = (deviceMap[c.device || 'Desktop'] || 0) + 1;
    browserMap[c.browser || 'Chrome'] = (browserMap[c.browser || 'Chrome'] || 0) + 1;
    countryMap[c.country || 'Unknown'] = (countryMap[c.country || 'Unknown'] || 0) + 1;
  });

  const topReferrers = Object.entries(referrerMap)
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);

  const deviceBreakdown = Object.entries(deviceMap)
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count);

  const browserBreakdown = Object.entries(browserMap)
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count);

  const countryBreakdown = Object.entries(countryMap)
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);

  const recentClicks = [...clicksToAnalyze]
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
    .slice(0, 20);

  const summary: AnalyticsSummary = {
    totalClicks: clicksToAnalyze.length,
    totalLinks: slugFilter ? 1 : store.links.length,
    clicksByDate,
    topReferrers,
    deviceBreakdown,
    browserBreakdown,
    countryBreakdown,
    recentClicks
  };

  res.json(summary);
});

// AI Slug Generator Route
app.post('/api/ai/suggest-slug', async (req: Request, res: Response) => {
  const { url } = req.body;
  if (!url) {
    res.status(400).json({ error: 'URL is required' });
    return;
  }

  const ai = getGenAI();
  if (!ai) {
    res.json({
      slugs: ['link', 'go', 'custom'],
      title: 'Short Link',
      suggestedTags: ['general']
    });
    return;
  }

  try {
    const prompt = `Given the target URL "${url}", suggest 3 short, memorable, lowercase URL slugs (3-10 characters, alphanumeric or hyphens only), a clean title, and 3 relevant tags. Return strictly JSON with keys "slugs" (array of strings), "title" (string), "suggestedTags" (array of strings).`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.6-flash',
      contents: prompt,
      config: {
        responseMimeType: 'application/json'
      }
    });

    const parsed = JSON.parse(response.text || '{}');
    res.json({
      slugs: parsed.slugs || ['quick', 'go', 'link'],
      title: parsed.title || 'Smart Link',
      suggestedTags: parsed.suggestedTags || ['web']
    });
  } catch (err) {
    console.error('Gemini AI slug suggestion error:', err);
    res.json({
      slugs: ['app', 'site', 'visit'],
      title: 'Target Link',
      suggestedTags: ['shortcut']
    });
  }
});

// Short URL Redirection & Password Intercept Handler
app.get('/:slug', (req: Request, res: Response, next: NextFunction) => {
  const slugParam = req.params.slug;
  const slug = Array.isArray(slugParam) ? slugParam[0] : (slugParam || '');

  // Reserved paths for client app / assets
  if (
    slug.startsWith('api') ||
    slug === 'favicon.ico' ||
    slug === 'assets' ||
    slug === 'index.html' ||
    slug.includes('.')
  ) {
    return next();
  }

  const link = store.links.find(l => l.slug === slug);

  if (!link) {
    res.status(404).send(`
      <!DOCTYPE html>
      <html lang="zh-CN">
        <head>
          <meta charset="UTF-8" />
          <meta name="viewport" content="width=device-width, initial-scale=1.0" />
          <title>404 - 短链接不存在</title>
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "PingFang SC", "Microsoft YaHei", sans-serif; background: #020617; color: #f8fafc; display: flex; align-items: center; justify-content: center; height: 100vh; margin: 0; padding: 20px; }
            .card { text-align: center; padding: 40px 32px; background: #0f172a; border-radius: 20px; border: 1px solid #1e293b; max-width: 420px; width: 100%; box-shadow: 0 25px 50px -12px rgba(0,0,0,0.5); }
            h1 { font-size: 56px; margin: 0 0 12px; color: #f43f5e; font-weight: 800; letter-spacing: -1px; }
            h2 { font-size: 20px; margin: 0 0 8px; color: #ffffff; }
            p { color: #94a3b8; font-size: 14px; line-height: 1.6; margin: 0 0 24px; }
            a { display: inline-flex; align-items: center; justify-content: center; padding: 12px 24px; background: #4f46e5; color: white; border-radius: 12px; text-decoration: none; font-weight: 600; font-size: 14px; transition: background 0.2s; }
            a:hover { background: #4338ca; }
          </style>
        </head>
        <body>
          <div class="card">
            <h1>404</h1>
            <h2>短链接不存在</h2>
            <p>短链接 <strong>/${slug}</strong> 未找到，可能已被删除或拼写有误。</p>
            <a href="/">返回 Sink 平台首页</a>
          </div>
        </body>
      </html>
    `);
    return;
  }

  if (!link.isActive) {
    res.status(410).send(`
      <!DOCTYPE html>
      <html lang="zh-CN">
        <head>
          <meta charset="UTF-8" />
          <meta name="viewport" content="width=device-width, initial-scale=1.0" />
          <title>短链接已停用</title>
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "PingFang SC", "Microsoft YaHei", sans-serif; background: #020617; color: #f8fafc; display: flex; align-items: center; justify-content: center; height: 100vh; margin: 0; padding: 20px; }
            .card { text-align: center; padding: 40px 32px; background: #0f172a; border-radius: 20px; border: 1px solid #1e293b; max-width: 420px; width: 100%; box-shadow: 0 25px 50px -12px rgba(0,0,0,0.5); }
            h1 { font-size: 24px; color: #f59e0b; margin: 0 0 12px; font-weight: 700; }
            p { color: #94a3b8; font-size: 14px; line-height: 1.6; margin: 0 0 24px; }
            a { display: inline-flex; align-items: center; justify-content: center; padding: 12px 24px; background: #4f46e5; color: white; border-radius: 12px; text-decoration: none; font-weight: 600; font-size: 14px; }
            a:hover { background: #4338ca; }
          </style>
        </head>
        <body>
          <div class="card">
            <h1>⚠️ 短链接已被停用</h1>
            <p>该短链接已被创建者暂时关闭，暂停重定向访问。</p>
            <a href="/">前往 Sink 平台</a>
          </div>
        </body>
      </html>
    `);
    return;
  }

  if (link.expiresAt && new Date(link.expiresAt) < new Date()) {
    res.status(410).send(`
      <!DOCTYPE html>
      <html lang="zh-CN">
        <head>
          <meta charset="UTF-8" />
          <meta name="viewport" content="width=device-width, initial-scale=1.0" />
          <title>短链接已过期</title>
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "PingFang SC", "Microsoft YaHei", sans-serif; background: #020617; color: #f8fafc; display: flex; align-items: center; justify-content: center; height: 100vh; margin: 0; padding: 20px; }
            .card { text-align: center; padding: 40px 32px; background: #0f172a; border-radius: 20px; border: 1px solid #1e293b; max-width: 420px; width: 100%; box-shadow: 0 25px 50px -12px rgba(0,0,0,0.5); }
            h1 { font-size: 24px; color: #ef4444; margin: 0 0 12px; font-weight: 700; }
            p { color: #94a3b8; font-size: 14px; line-height: 1.6; margin: 0 0 24px; }
            a { display: inline-flex; align-items: center; justify-content: center; padding: 12px 24px; background: #4f46e5; color: white; border-radius: 12px; text-decoration: none; font-weight: 600; font-size: 14px; }
            a:hover { background: #4338ca; }
          </style>
        </head>
        <body>
          <div class="card">
            <h1>⌛ 短链接已过期</h1>
            <p>该短链接设定的有效期限已截止（${new Date(link.expiresAt).toLocaleString('zh-CN')}），无法继续跳转。</p>
            <a href="/">前往 Sink 平台</a>
          </div>
        </body>
      </html>
    `);
    return;
  }

  // Password Protection check
  if (link.password) {
    const providedPwd = req.query.pwd as string | undefined;
    if (providedPwd !== link.password) {
      res.send(`
        <!DOCTYPE html>
        <html lang="zh-CN">
          <head>
            <meta charset="UTF-8" />
            <meta name="viewport" content="width=device-width, initial-scale=1.0" />
            <title>受保护的链接 - 需要访问密码</title>
            <style>
              body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "PingFang SC", "Microsoft YaHei", sans-serif; background: #020617; color: #f8fafc; display: flex; align-items: center; justify-content: center; height: 100vh; margin: 0; padding: 20px; }
              .card { background: #0f172a; padding: 36px 28px; border-radius: 20px; border: 1px solid #1e293b; width: 100%; max-width: 380px; text-align: center; box-shadow: 0 25px 50px -12px rgba(0,0,0,0.5); }
              .icon { font-size: 40px; margin-bottom: 12px; }
              h3 { margin: 0 0 8px; font-size: 20px; color: #ffffff; }
              p { font-size: 13px; color: #94a3b8; margin: 0 0 20px; }
              input { width: 100%; box-sizing: border-box; padding: 12px 14px; margin-bottom: 14px; border-radius: 12px; border: 1px solid #334155; background: #020617; color: white; font-size: 14px; outline: none; }
              input:focus { border-color: #6366f1; ring: 2px solid #6366f1; }
              button { width: 100%; padding: 12px; background: #4f46e5; color: white; border: none; border-radius: 12px; font-weight: 600; font-size: 14px; cursor: pointer; transition: background 0.2s; }
              button:hover { background: #4338ca; }
              .err { color: #f43f5e; font-size: 13px; margin-bottom: 14px; background: rgba(244, 63, 94, 0.1); padding: 8px; border-radius: 8px; }
            </style>
          </head>
          <body>
            <div class="card">
              <div class="icon">🔒</div>
              <h3>访问受密码保护</h3>
              <p>请输入访问密码以解锁 <strong>/${slug}</strong></p>
              ${providedPwd ? '<div class="err">密码错误，请重新输入</div>' : ''}
              <form method="GET">
                <input type="password" name="pwd" placeholder="请输入密码" required autofocus />
                <button type="submit">解锁并前往目标页面</button>
              </form>
            </div>
          </body>
        </html>
      `);
      return;
    }
  }

  // Record Click Analytics
  const parser = new UAParser((req.headers['user-agent'] as string) || '');
  const uaResult = parser.getResult();
  const rawIp = req.headers['x-forwarded-for']?.toString().split(',')[0] || req.socket.remoteAddress || '127.0.0.1';
  const rawReferrer = req.headers['referer'];
  const referrerStr = Array.isArray(rawReferrer) ? rawReferrer[0] : (rawReferrer || 'Direct');

  const newClick: ClickEvent = {
    id: nanoid(10),
    slug,
    timestamp: new Date().toISOString(),
    ip: rawIp,
    userAgent: (req.headers['user-agent'] as string) || 'Unknown',
    device: uaResult.device.type ? (uaResult.device.type.charAt(0).toUpperCase() + uaResult.device.type.slice(1)) : 'Desktop',
    browser: uaResult.browser.name || 'Browser',
    os: uaResult.os.name || 'OS',
    referrer: referrerStr,
    country: 'International'
  };

  store.clicks.push(newClick);
  link.clicksCount++;
  saveStore();

  res.redirect(302, link.url);
});

// Vite middleware for development or static serving for production
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req: Request, res: Response) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(Number(PORT), '0.0.0.0', () => {
    console.log(`Server listening on http://0.0.0.0:${PORT}`);
  });
}

startServer();
