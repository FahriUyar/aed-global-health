import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import type { CRMData } from '../types/database';

/**
 * Supabase istemcisi + Çevrimdışı LocalStorage fallback katmanı.
 *
 * Bağlantı bilgisi öncelik sırası:
 *   1) Uygulama içi "Bağlantı Ayarları"ndan girilen değerler (localStorage)
 *   2) .env → VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY
 * Hiçbiri yoksa uygulama yerel depolama modunda çalışır; asla çökmez.
 */

const LS = {
  config: 'aedcrm:supabase-config',
  forceOffline: 'aedcrm:force-offline',
  offlineData: 'aedcrm:offline-data:v1',
  cloudCache: 'aedcrm:cloud-cache:v1',
  outbox: 'aedcrm:outbox:v1',
  presets: 'aedcrm:specialty-presets:v1',
} as const;

export interface SupabaseConfig {
  url: string;
  anonKey: string;
}

function safeGet(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}
function safeSet(key: string, value: string): void {
  try {
    localStorage.setItem(key, value);
  } catch {
    /* kota dolu veya gizli mod — sessizce yut */
  }
}
function safeRemove(key: string): void {
  try {
    localStorage.removeItem(key);
  } catch {
    /* yok say */
  }
}

function isValidConfig(c: Partial<SupabaseConfig> | null | undefined): c is SupabaseConfig {
  return !!c && typeof c.url === 'string' && /^https:\/\/.+/.test(c.url.trim()) && typeof c.anonKey === 'string' && c.anonKey.trim().length > 20;
}

export function getSupabaseConfig(): SupabaseConfig | null {
  const stored = safeGet(LS.config);
  if (stored) {
    try {
      const parsed = JSON.parse(stored) as Partial<SupabaseConfig>;
      if (isValidConfig(parsed)) return { url: parsed.url.trim(), anonKey: parsed.anonKey.trim() };
    } catch {
      /* bozuk kayıt */
    }
  }
  const env = { url: import.meta.env.VITE_SUPABASE_URL as string | undefined, anonKey: import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined };
  if (isValidConfig(env)) return { url: env.url.trim(), anonKey: env.anonKey.trim() };
  return null;
}

export function getConfigSource(): 'app' | 'env' | null {
  const stored = safeGet(LS.config);
  if (stored) {
    try {
      if (isValidConfig(JSON.parse(stored))) return 'app';
    } catch {
      /* yok say */
    }
  }
  return getSupabaseConfig() ? 'env' : null;
}

export function saveSupabaseConfig(config: SupabaseConfig | null): void {
  if (config && isValidConfig(config)) safeSet(LS.config, JSON.stringify(config));
  else safeRemove(LS.config);
}

export function isForceOffline(): boolean {
  return safeGet(LS.forceOffline) === '1';
}
export function setForceOffline(value: boolean): void {
  if (value) safeSet(LS.forceOffline, '1');
  else safeRemove(LS.forceOffline);
}

let client: SupabaseClient | null = null;
export function getSupabase(): SupabaseClient | null {
  if (client) return client;
  const cfg = getSupabaseConfig();
  if (!cfg) return null;
  try {
    client = createClient(cfg.url, cfg.anonKey, {
      auth: { persistSession: true, autoRefreshToken: true, storageKey: 'aedcrm-auth' },
    });
  } catch {
    client = null;
  }
  return client;
}

// --- Yerel depolama: çevrimdışı veri seti ve bulut önbelleği ----------------

function readJSON<T>(key: string): T | null {
  const raw = safeGet(key);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

export const localStore = {
  readOffline: () => readJSON<CRMData>(LS.offlineData),
  writeOffline: (data: CRMData) => safeSet(LS.offlineData, JSON.stringify(data)),
  clearOffline: () => safeRemove(LS.offlineData),
  readCache: () => readJSON<{ data: CRMData; savedAt: string }>(LS.cloudCache),
  writeCache: (data: CRMData) => safeSet(LS.cloudCache, JSON.stringify({ data, savedAt: new Date().toISOString() })),
  readOutbox: <T>() => readJSON<T[]>(LS.outbox) ?? [],
  writeOutbox: <T>(ops: T[]) => (ops.length ? safeSet(LS.outbox, JSON.stringify(ops)) : safeRemove(LS.outbox)),
  readPresets: <T>() => readJSON<T[]>(LS.presets),
  writePresets: <T>(presets: T[]) => safeSet(LS.presets, JSON.stringify(presets)),
  clearPresets: () => safeRemove(LS.presets),
};

export function isNetworkError(err: unknown): boolean {
  if (typeof navigator !== 'undefined' && navigator.onLine === false) return true;
  const msg = err instanceof Error ? err.message : typeof err === 'object' && err && 'message' in err ? String((err as { message: unknown }).message) : String(err);
  return /failed to fetch|network|load failed|fetch failed|timeout/i.test(msg);
}

export function newId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return crypto.randomUUID();
  // Eski tarayıcılar için RFC4122 v4 yedeği
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16);
  });
}
