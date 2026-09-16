export interface ShortLink {
  id: string;
  slug: string;
  url: string;
  title: string;
  description?: string;
  password?: string;
  expiresAt?: string | null;
  isActive: boolean;
  createdAt: string;
  clicksCount: number;
  tags?: string[];
}

export interface ClickEvent {
  id: string;
  slug: string;
  timestamp: string;
  ip: string;
  userAgent: string;
  device: string;
  browser: string;
  os: string;
  referrer: string;
  country: string;
}

export interface AnalyticsSummary {
  totalClicks: number;
  totalLinks: number;
  clicksByDate: { date: string; clicks: number }[];
  topReferrers: { name: string; count: number }[];
  deviceBreakdown: { name: string; count: number }[];
  browserBreakdown: { name: string; count: number }[];
  countryBreakdown: { name: string; count: number }[];
  recentClicks: ClickEvent[];
}

export interface CreateLinkPayload {
  url: string;
  slug?: string;
  title?: string;
  description?: string;
  password?: string;
  expiresAt?: string | null;
  tags?: string[];
}

export interface UpdateLinkPayload {
  url?: string;
  slug?: string;
  title?: string;
  description?: string;
  password?: string;
  expiresAt?: string | null;
  isActive?: boolean;
  tags?: string[];
}

export interface AdminStats {
  totalLinks: number;
  activeLinks: number;
  inactiveLinks: number;
  expiredLinks: number;
  passwordProtectedLinks: number;
  totalClicks: number;
  todayClicks: number;
  storageClicksCount: number;
}
