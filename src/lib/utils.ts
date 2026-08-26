export const RESERVED_USERNAMES = [
  'admin', 'api', 'login', 'register', 'dashboard', 'settings', 'support', 'help',
  'pricing', 'privacy', 'terms', 'about', 'explore', 'features', 'contact',
  'b', 'bio', 'b-io', 'root', 'system', 'me', 'you',
];

export const USERNAME_REGEX = /^[a-z0-9_]{3,20}$/;

export function validateUsername(username: string): { valid: boolean; reason?: string } {
  if (!username) return { valid: false, reason: 'Kullanıcı adı gerekli.' };
  if (username.length < 3) return { valid: false, reason: 'En az 3 karakter olmalı.' };
  if (username.length > 20) return { valid: false, reason: 'En fazla 20 karakter olmalı.' };
  if (!USERNAME_REGEX.test(username)) {
    return { valid: false, reason: 'Sadece küçük harf, rakam ve alt çizgi.' };
  }
  if (RESERVED_USERNAMES.includes(username)) {
    return { valid: false, reason: 'Bu kullanıcı adı rezerve edilmiş.' };
  }
  return { valid: true };
}

const BLOCKED_SCHEMES = ['javascript:', 'data:', 'vbscript:', 'file:', 'about:'];

export function isSafeUrl(url: string): boolean {
  const trimmed = url.trim();
  if (!trimmed) return false;
  const lower = trimmed.toLowerCase();
  if (BLOCKED_SCHEMES.some((s) => lower.startsWith(s))) return false;
  try {
    const parsed = new URL(trimmed);
    return ['http:', 'https:'].includes(parsed.protocol);
  } catch {
    return false;
  }
}

export function normalizeUrl(url: string): string {
  const trimmed = url.trim();
  if (!trimmed) return '';
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  return `https://${trimmed}`;
}

export function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export function formatNumber(n: number): string {
  if (n < 1000) return String(n);
  if (n < 1_000_000) return `${(n / 1000).toFixed(n % 1000 === 0 ? 0 : 1)}K`;
  return `${(n / 1_000_000).toFixed(1)}M`;
}

export function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const s = Math.floor(diff / 1000);
  if (s < 60) return 'az önce';
  const m = Math.floor(s / 60);
  if (m < 60) return `${m} dk önce`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h} saat önce`;
  const d = Math.floor(h / 24);
  if (d < 30) return `${d} gün önce`;
  return new Date(iso).toLocaleDateString('tr-TR');
}

export function detectDevice(): string {
  if (typeof navigator === 'undefined') return 'unknown';
  const ua = navigator.userAgent;
  if (/iPad|iPhone|iPod/.test(ua)) return 'ios';
  if (/Android/.test(ua)) return 'android';
  if (/Mac/.test(ua)) return 'mac';
  if (/Windows/.test(ua)) return 'windows';
  if (/Linux/.test(ua)) return 'linux';
  return 'other';
}

export function copyToClipboard(text: string): Promise<void> {
  if (navigator.clipboard?.writeText) return navigator.clipboard.writeText(text);
  return Promise.reject(new Error('Clipboard unavailable'));
}
