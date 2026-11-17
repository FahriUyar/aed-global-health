import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import type { Attitude, Hospital, Instrument, InventoryItem, PipelineStage } from '../types/database';

export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}

// ---------------------------------------------------------------------------
// Biçimlendirme
// ---------------------------------------------------------------------------
export const fmtUSD = (n: number, digits = 0): string =>
  new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'USD', maximumFractionDigits: digits }).format(Number.isFinite(n) ? n : 0);
export const fmtTRY = (n: number): string =>
  new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY', maximumFractionDigits: 0 }).format(Number.isFinite(n) ? n : 0);
export const fmtNum = (n: number, digits = 0): string =>
  new Intl.NumberFormat('tr-TR', { maximumFractionDigits: digits }).format(Number.isFinite(n) ? n : 0);
export const fmtDate = (iso: string | null | undefined): string => {
  if (!iso) return '—';
  const d = new Date(iso.length === 10 ? `${iso}T00:00:00` : iso);
  return Number.isNaN(d.getTime()) ? '—' : d.toLocaleDateString('tr-TR', { day: '2-digit', month: 'short', year: 'numeric' });
};
export const todayISO = (): string => {
  const d = new Date();
  const tz = d.getTimezoneOffset() * 60000;
  return new Date(d.getTime() - tz).toISOString().slice(0, 10);
};
export const addDaysISO = (iso: string, days: number): string => {
  const d = new Date(`${iso}T00:00:00`);
  d.setDate(d.getDate() + days);
  const tz = d.getTimezoneOffset() * 60000;
  return new Date(d.getTime() - tz).toISOString().slice(0, 10);
};

export const weeklyCases = (h: Hospital): number =>
  (h.weekly_urology_cases || 0) + (h.weekly_general_surgery_cases || 0) + (h.weekly_gynecology_cases || 0) + (h.weekly_thoracic_cases || 0);

// ---------------------------------------------------------------------------
// Can (RFID kontör) ve stok ömrü hesapları
// ---------------------------------------------------------------------------
export const CRITICAL_DAYS = 14;

export interface InventoryForecast {
  item: InventoryItem;
  instrument: Instrument | undefined;
  maxUses: number;
  isDisposable: boolean;
  totalAvailableUses: number;
  daysLeft: number | null; // null = tüketim hızı tanımsız
  depletionDate: string | null;
  activePercent: number; // aktif enstrümanın kalan can yüzdesi
  isCritical: boolean;
  level: 'critical' | 'warning' | 'ok';
}

/** Toplam kullanılabilir can = kapalı kutu × maks. can + aktif kalan can; Kalan gün = toplam / haftalık tüketim × 7 */
export function forecastInventory(item: InventoryItem, instrument: Instrument | undefined): InventoryForecast {
  const maxUses = Math.max(1, instrument?.default_max_uses ?? 1);
  const isDisposable = maxUses === 1;
  const totalAvailableUses = item.boxed_stock_count * maxUses + item.active_instrument_remaining_uses;
  const perWeek = Number(item.avg_uses_per_week) || 0;
  const daysLeft = perWeek > 0 ? (totalAvailableUses / perWeek) * 7 : null;
  const depletionDate = daysLeft !== null ? addDaysISO(todayISO(), Math.floor(daysLeft)) : null;
  const activePercent = isDisposable ? 100 : Math.min(100, Math.round((item.active_instrument_remaining_uses / maxUses) * 100));
  const belowThreshold = isDisposable
    ? totalAvailableUses < item.min_critical_uses_threshold
    : item.active_instrument_remaining_uses < item.min_critical_uses_threshold && item.boxed_stock_count === 0;
  const lowDays = daysLeft !== null && daysLeft < CRITICAL_DAYS;
  const isCritical = lowDays || belowThreshold || totalAvailableUses === 0;
  const warning = !isCritical && ((daysLeft !== null && daysLeft < CRITICAL_DAYS * 2) || (!isDisposable && item.active_instrument_remaining_uses < item.min_critical_uses_threshold));
  return {
    item,
    instrument,
    maxUses,
    isDisposable,
    totalAvailableUses,
    daysLeft,
    depletionDate,
    activePercent,
    isCritical,
    level: isCritical ? 'critical' : warning ? 'warning' : 'ok',
  };
}

// ---------------------------------------------------------------------------
// Branşa göre hazır vaka setleri
// ---------------------------------------------------------------------------
export interface CaseSet {
  id: string;
  branch: string;
  title: string;
  procedures: string;
  codes: string[];
}

export const CASE_SETS: CaseSet[] = [
  { id: 'uro', branch: 'Üroloji', title: 'Üroloji Seti', procedures: 'Radikal Prostatektomi / Parsiyel Nefrektomi', codes: ['IN8035', 'IN8036', 'IN803B', 'IN8038', 'IN803G', 'DRAPE-SET', 'SEAL-SET'] },
  { id: 'gs', branch: 'Genel Cerrahi', title: 'Genel Cerrahi Seti', procedures: 'Kolorektal / Gastrektomi / Bariatrik', codes: ['IN8035', 'IN8033', 'IN803A', 'IN8031', 'IN803C', 'DRAPE-SET', 'SEAL-SET'] },
  { id: 'gyn', branch: 'Jinekoloji', title: 'Jinekoloji Seti', procedures: 'Histerektomi / Miyomektomi', codes: ['IN8035', 'IN8036', 'IN803D', 'IN8038', 'DRAPE-SET', 'SEAL-SET'] },
  { id: 'tho', branch: 'Göğüs & Pediatrik', title: 'Göğüs & Pediatrik Cerrahi Seti', procedures: 'Lobektomi / Timektomi / Pyeloplasti', codes: ['IN8032', 'IN8036', 'IN803A', 'IN8031-M', 'DRAPE-SET', 'SEAL-SET'] },
];

/** Vaka başı sarf maliyeti: yeniden kullanılabilir alet fiyatı / maks. can + tek kullanımlıkların tam fiyatı */
export function caseSetCost(set: CaseSet, catalog: Instrument[]): { total: number; lines: { instrument: Instrument; perCase: number }[] } {
  const lines = set.codes
    .map((code) => catalog.find((c) => c.code === code))
    .filter((x): x is Instrument => !!x)
    .map((instrument) => ({ instrument, perCase: instrument.unit_list_price_usd / Math.max(1, instrument.default_max_uses) }));
  return { total: lines.reduce((s, l) => s + l.perCase, 0), lines };
}

/** Setteki yeniden kullanılabilir aletlerin ortalama can ömrü */
export function averageReusableLife(set: CaseSet, catalog: Instrument[]): number {
  const lives = set.codes
    .map((code) => catalog.find((c) => c.code === code)?.default_max_uses ?? 0)
    .filter((n) => n > 1);
  return lives.length ? lives.reduce((a, b) => a + b, 0) / lives.length : 10;
}

// ---------------------------------------------------------------------------
// Rozet renkleri
// ---------------------------------------------------------------------------
export const attitudeStyle: Record<Attitude, string> = {
  'Çok Sıcak (Destekçi)': 'bg-emerald-100 text-emerald-800 ring-emerald-600/20',
  Sıcak: 'bg-emerald-50 text-emerald-700 ring-emerald-600/20',
  Nötr: 'bg-slate-100 text-slate-700 ring-slate-500/20',
  Mesafeli: 'bg-amber-50 text-amber-800 ring-amber-600/20',
  'Rakip (Da Vinci) Yanlısı': 'bg-red-50 text-red-700 ring-red-600/20',
};

export const stageStyle: Record<PipelineStage, string> = {
  İstihbarat: 'bg-slate-100 text-slate-700',
  'İlk Temas Kuruldu': 'bg-sky-50 text-sky-800',
  'Klinik Demo Planlandı': 'bg-indigo-50 text-indigo-800',
  'Şartname / Biyomedikal Aşamasında': 'bg-violet-50 text-violet-800',
  'Ticari Pazarlık / İhale': 'bg-amber-50 text-amber-800',
  'Kurulum Yapıldı (Aktif Sarf Müşterisi)': 'bg-emerald-50 text-emerald-800',
  'Askıda / Kaybedildi': 'bg-red-50 text-red-700',
};

export const TURKISH_CITIES = [
  'Adana', 'Adıyaman', 'Afyonkarahisar', 'Ağrı', 'Aksaray', 'Amasya', 'Ankara', 'Antalya', 'Ardahan', 'Artvin', 'Aydın', 'Balıkesir', 'Bartın', 'Batman', 'Bayburt', 'Bilecik', 'Bingöl', 'Bitlis', 'Bolu', 'Burdur', 'Bursa', 'Çanakkale', 'Çankırı', 'Çorum', 'Denizli', 'Diyarbakır', 'Düzce', 'Edirne', 'Elazığ', 'Erzincan', 'Erzurum', 'Eskişehir', 'Gaziantep', 'Giresun', 'Gümüşhane', 'Hakkari', 'Hatay', 'Iğdır', 'Isparta', 'İstanbul', 'İzmir', 'Kahramanmaraş', 'Karabük', 'Karaman', 'Kars', 'Kastamonu', 'Kayseri', 'Kırıkkale', 'Kırklareli', 'Kırşehir', 'Kilis', 'Kocaeli', 'Konya', 'Kütahya', 'Malatya', 'Manisa', 'Mardin', 'Mersin', 'Muğla', 'Muş', 'Nevşehir', 'Niğde', 'Ordu', 'Osmaniye', 'Rize', 'Sakarya', 'Samsun', 'Siirt', 'Sinop', 'Sivas', 'Şanlıurfa', 'Şırnak', 'Tekirdağ', 'Tokat', 'Trabzon', 'Tunceli', 'Uşak', 'Van', 'Yalova', 'Yozgat', 'Zonguldak',
];

// ---------------------------------------------------------------------------
// CSV dışa aktarma (Excel uyumlu: UTF-8 BOM + noktalı virgül)
// ---------------------------------------------------------------------------
export function downloadCSV(filename: string, headers: string[], rows: (string | number | boolean | null | undefined)[][]): void {
  const esc = (v: string | number | boolean | null | undefined): string => {
    const s = v === null || v === undefined ? '' : typeof v === 'boolean' ? (v ? 'Evet' : 'Hayır') : String(v);
    return /[";\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const csv = '\uFEFF' + [headers, ...rows].map((r) => r.map(esc).join(';')).join('\r\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
  triggerDownload(blob, filename);
}

export function downloadJSON(filename: string, data: unknown): void {
  triggerDownload(new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' }), filename);
}

function triggerDownload(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/** Telefonu wa.me formatına çevir (TR varsayılan) */
export function whatsappLink(phone: string): string {
  let digits = phone.replace(/\D/g, '');
  if (digits.startsWith('0')) digits = `90${digits.slice(1)}`;
  else if (digits.length === 10) digits = `90${digits}`;
  return `https://wa.me/${digits}`;
}
