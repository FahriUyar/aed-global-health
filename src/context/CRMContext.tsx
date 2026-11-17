import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import type { Session } from '@supabase/supabase-js';
import type {
  CRMData,
  Contact,
  ContactInput,
  DealInput,
  DealOrder,
  Hospital,
  HospitalInput,
  Instrument,
  InventoryInput,
  InventoryItem,
  TableName,
  Visit,
  VisitInput,
} from '../types/database';
import { buildSeedData, INSTRUMENT_CATALOG } from '../lib/seedData';
import { getSupabase, isForceOffline, isNetworkError, localStore, newId, setForceOffline } from '../lib/supabase';
import { useToast } from '../components/ui/Toast';

/**
 * CRM veri katmanı
 * - mode 'local'          : Supabase tanımlı değil (veya kullanıcı yerel modu seçti) → tüm CRUD localStorage'da.
 * - mode 'cloud'          : Supabase'e bağlı, oturum açık → gerçek CRUD, son veriler localStorage'da önbelleklenir.
 * - mode 'cloud-offline'  : Supabase tanımlı ama internet yok → önbellekten okunur, yazma işlemleri kuyruğa (outbox)
 *                           alınır ve bağlantı geri geldiğinde otomatik senkronize edilir.
 */

export type Mode = 'loading' | 'local' | 'cloud' | 'cloud-offline';
export type AuthState = 'n/a' | 'checking' | 'signed-in' | 'signed-out';

type DataKey = Exclude<keyof CRMData, 'catalog'>;
const TABLE: Record<DataKey, TableName> = {
  hospitals: 'hospitals',
  contacts: 'contacts',
  inventory: 'hospital_inventory',
  visits: 'visits',
  deals: 'deals_orders',
};

type RowOf<K extends DataKey> = CRMData[K][number];

interface OutboxOp {
  opId: string;
  table: TableName;
  kind: 'insert' | 'update' | 'delete';
  id: string;
  payload?: Record<string, unknown>;
}

export interface SurgeryResult {
  code: string;
  name: string;
  status: 'decremented' | 'missing' | 'empty';
  itemId?: string;
  remainingActive?: number;
  boxed?: number;
  /** Aktif enstrümanın canı bitti ve depoda kapalı kutu var → kutu açılsın mı? */
  needsBoxPrompt: boolean;
}

interface CRMContextValue {
  data: CRMData;
  mode: Mode;
  authState: AuthState;
  session: Session | null;
  pendingOps: number;
  lastSyncedAt: string | null;
  instrumentByCode: (code: string) => Instrument | undefined;
  // Oturum & senkronizasyon
  signIn: (email: string, password: string) => Promise<string | null>;
  signOut: () => Promise<void>;
  continueOffline: () => void;
  connectCloud: () => void;
  refresh: () => Promise<void>;
  uploadLocalToCloud: () => Promise<void>;
  resetLocalData: () => void;
  // Hastaneler
  addHospital: (input: HospitalInput) => Promise<Hospital>;
  updateHospital: (id: string, patch: Partial<HospitalInput>) => Promise<void>;
  deleteHospital: (id: string) => Promise<void>;
  // Kişiler
  addContact: (input: ContactInput) => Promise<Contact>;
  updateContact: (id: string, patch: Partial<ContactInput>) => Promise<void>;
  deleteContact: (id: string) => Promise<void>;
  // Stok & can
  addInventory: (input: InventoryInput) => Promise<InventoryItem | null>;
  updateInventory: (id: string, patch: Partial<InventoryInput>) => Promise<void>;
  deleteInventory: (id: string) => Promise<void>;
  consumeOne: (id: string) => Promise<{ needsBoxPrompt: boolean } | null>;
  openNewBox: (id: string) => Promise<boolean>;
  applySurgeryCase: (hospitalId: string, codes: string[]) => Promise<SurgeryResult[]>;
  // Ziyaretler
  addVisit: (input: VisitInput) => Promise<Visit>;
  updateVisit: (id: string, patch: Partial<VisitInput>) => Promise<void>;
  deleteVisit: (id: string) => Promise<void>;
  toggleVisitAction: (id: string) => Promise<void>;
  // Teklifler / siparişler
  addDeal: (input: DealInput) => Promise<DealOrder>;
  updateDeal: (id: string, patch: Partial<DealInput>) => Promise<void>;
  deleteDeal: (id: string) => Promise<void>;
}

const CRMContext = createContext<CRMContextValue | null>(null);

const EMPTY: CRMData = { hospitals: [], contacts: [], catalog: INSTRUMENT_CATALOG, inventory: [], visits: [], deals: [] };

function normalizeNumbers(data: CRMData): CRMData {
  // Supabase NUMERIC kolonları string dönebilir → sayıya çevir
  return {
    ...data,
    catalog: (data.catalog?.length ? data.catalog : INSTRUMENT_CATALOG).map((c) => ({
      ...c,
      diameter_mm: Number(c.diameter_mm ?? 8),
      default_max_uses: Number(c.default_max_uses),
      unit_list_price_usd: Number(c.unit_list_price_usd ?? 0),
    })),
    inventory: (data.inventory ?? []).map((i) => ({ ...i, avg_uses_per_week: Number(i.avg_uses_per_week ?? 0) })),
    deals: (data.deals ?? []).map((d) => ({ ...d, total_amount_usd: Number(d.total_amount_usd ?? 0) })),
    hospitals: data.hospitals ?? [],
    contacts: data.contacts ?? [],
    visits: data.visits ?? [],
  };
}

function loadLocalData(): CRMData {
  const stored = localStore.readOffline();
  if (stored && Array.isArray(stored.hospitals)) return normalizeNumbers(stored);
  const seed = buildSeedData();
  localStore.writeOffline(seed);
  return seed;
}

export function CRMProvider({ children }: { children: ReactNode }) {
  const { notify } = useToast();
  const supabase = useMemo(() => getSupabase(), []);
  const [data, setData] = useState<CRMData>(EMPTY);
  const dataRef = useRef<CRMData>(EMPTY);
  const [mode, setMode] = useState<Mode>('loading');
  const modeRef = useRef<Mode>('loading');
  const [authState, setAuthState] = useState<AuthState>(supabase && !isForceOffline() ? 'checking' : 'n/a');
  const [session, setSession] = useState<Session | null>(null);
  const [pendingOps, setPendingOps] = useState<number>(() => localStore.readOutbox<OutboxOp>().length);
  const [lastSyncedAt, setLastSyncedAt] = useState<string | null>(() => localStore.readCache()?.savedAt ?? null);
  const flushing = useRef(false);

  const commitData = useCallback((updater: (prev: CRMData) => CRMData) => {
    const next = updater(dataRef.current);
    dataRef.current = next;
    setData(next);
    if (modeRef.current === 'local') localStore.writeOffline(next);
    else if (modeRef.current === 'cloud' || modeRef.current === 'cloud-offline') localStore.writeCache(next);
  }, []);

  const switchMode = useCallback((m: Mode) => {
    modeRef.current = m;
    setMode(m);
  }, []);

  // ---------------- Uzak (Supabase) işlemleri ----------------
  const runRemote = useCallback(
    async (op: OutboxOp) => {
      if (!supabase) throw new Error('Supabase yapılandırılmamış');
      const pk = op.table === 'instrument_catalog' ? 'code' : 'id';
      let res;
      if (op.kind === 'insert') res = await supabase.from(op.table).upsert(op.payload!);
      else if (op.kind === 'update') res = await supabase.from(op.table).update(op.payload!).eq(pk, op.id);
      else res = await supabase.from(op.table).delete().eq(pk, op.id);
      if (res.error) throw res.error;
    },
    [supabase],
  );

  const fetchAll = useCallback(async (): Promise<CRMData> => {
    if (!supabase) throw new Error('Supabase yapılandırılmamış');
    const [h, c, cat, inv, v, d] = await Promise.all([
      supabase.from('hospitals').select('*').order('name'),
      supabase.from('contacts').select('*').order('full_name'),
      supabase.from('instrument_catalog').select('*').order('code'),
      supabase.from('hospital_inventory').select('*'),
      supabase.from('visits').select('*').order('visit_date', { ascending: false }),
      supabase.from('deals_orders').select('*').order('created_at', { ascending: false }),
    ]);
    const err = h.error || c.error || cat.error || inv.error || v.error || d.error;
    if (err) throw err;
    return normalizeNumbers({
      hospitals: h.data as Hospital[],
      contacts: c.data as Contact[],
      catalog: cat.data as Instrument[],
      inventory: inv.data as InventoryItem[],
      visits: v.data as Visit[],
      deals: d.data as DealOrder[],
    });
  }, [supabase]);

  const flushOutbox = useCallback(async (): Promise<boolean> => {
    if (flushing.current) return false;
    flushing.current = true;
    try {
      let ops = localStore.readOutbox<OutboxOp>();
      while (ops.length) {
        try {
          await runRemote(ops[0]);
        } catch (e) {
          if (isNetworkError(e)) return false;
          notify(`Senkronizasyon hatası, işlem atlandı: ${(e as Error).message ?? e}`, 'error');
        }
        ops = ops.slice(1);
        localStore.writeOutbox(ops);
        setPendingOps(ops.length);
      }
      return true;
    } finally {
      flushing.current = false;
    }
  }, [runRemote, notify]);

  const loadCloud = useCallback(async () => {
    const flushed = await flushOutbox();
    try {
      const fresh = await fetchAll();
      switchMode('cloud');
      commitData(() => fresh);
      setLastSyncedAt(new Date().toISOString());
      if (!flushed) void flushOutbox();
    } catch (e) {
      const cache = localStore.readCache();
      if (isNetworkError(e)) {
        switchMode('cloud-offline');
        commitData(() => (cache ? normalizeNumbers(cache.data) : { ...EMPTY }));
        notify('İnternet bağlantısı yok — son senkronize veriler gösteriliyor.', 'info');
      } else {
        // Şema kurulmamış / yetki hatası → çökmeden yerel moda düş
        notify(`Supabase hatası: ${(e as Error).message ?? e}. Yerel depolama moduna geçildi.`, 'error');
        switchMode('local');
        commitData(() => loadLocalData());
      }
    }
  }, [fetchAll, flushOutbox, commitData, switchMode, notify]);

  // ---------------- İlk yükleme & oturum ----------------
  useEffect(() => {
    if (!supabase || isForceOffline()) {
      switchMode('local');
      commitData(() => loadLocalData());
      return;
    }
    let cancelled = false;
    supabase.auth
      .getSession()
      .then(({ data: s }) => {
        if (cancelled) return;
        setSession(s.session);
        setAuthState(s.session ? 'signed-in' : 'signed-out');
        if (s.session) void loadCloud();
      })
      .catch(() => {
        if (cancelled) return;
        setAuthState('signed-out');
      });
    const { data: sub } = supabase.auth.onAuthStateChange((event, s) => {
      setSession(s);
      if (event === 'SIGNED_OUT') setAuthState('signed-out');
      if (event === 'SIGNED_IN' && s) setAuthState('signed-in');
    });
    return () => {
      cancelled = true;
      sub.subscription.unsubscribe();
    };
  }, [supabase, loadCloud, commitData, switchMode]);

  // Bağlantı geri geldiğinde kuyruğu boşalt ve yenile
  useEffect(() => {
    const onOnline = () => {
      if (modeRef.current === 'cloud-offline' || modeRef.current === 'cloud') {
        void loadCloud().then(() => notify('Bağlantı geri geldi — veriler senkronize edildi.', 'success'));
      }
    };
    const onOffline = () => {
      if (modeRef.current === 'cloud') switchMode('cloud-offline');
    };
    window.addEventListener('online', onOnline);
    window.addEventListener('offline', onOffline);
    return () => {
      window.removeEventListener('online', onOnline);
      window.removeEventListener('offline', onOffline);
    };
  }, [loadCloud, notify, switchMode]);

  // ---------------- Genel CRUD çekirdeği ----------------
  const persist = useCallback(
    async (op: Omit<OutboxOp, 'opId'>) => {
      if (modeRef.current === 'local') return;
      const full: OutboxOp = { ...op, opId: newId() };
      const enqueue = () => {
        const ops = [...localStore.readOutbox<OutboxOp>(), full];
        localStore.writeOutbox(ops);
        setPendingOps(ops.length);
      };
      if (modeRef.current === 'cloud-offline' || localStore.readOutbox<OutboxOp>().length > 0) {
        enqueue();
        if (navigator.onLine) void flushOutbox();
        return;
      }
      try {
        await runRemote(full);
      } catch (e) {
        if (isNetworkError(e)) {
          enqueue();
          switchMode('cloud-offline');
          notify('Çevrimdışı: değişiklik kuyruğa alındı, bağlantı gelince senkronize edilecek.', 'info');
        } else {
          notify(`Kaydedilemedi: ${(e as Error).message ?? e}`, 'error');
          void loadCloud();
          throw e;
        }
      }
    },
    [runRemote, flushOutbox, loadCloud, notify, switchMode],
  );

  const insertRow = useCallback(
    async <K extends DataKey>(key: K, row: RowOf<K>) => {
      commitData((prev) => ({ ...prev, [key]: [row, ...(prev[key] as RowOf<K>[])] }));
      await persist({ table: TABLE[key], kind: 'insert', id: (row as { id: string }).id, payload: row as unknown as Record<string, unknown> });
      return row;
    },
    [commitData, persist],
  );

  const updateRow = useCallback(
    async <K extends DataKey>(key: K, id: string, patch: Partial<RowOf<K>>) => {
      commitData((prev) => ({
        ...prev,
        [key]: (prev[key] as RowOf<K>[]).map((r) => ((r as { id: string }).id === id ? { ...r, ...patch } : r)),
      }));
      await persist({ table: TABLE[key], kind: 'update', id, payload: patch as Record<string, unknown> });
    },
    [commitData, persist],
  );

  const deleteRow = useCallback(
    async (key: DataKey, id: string) => {
      commitData((prev) => {
        const next = { ...prev, [key]: (prev[key] as { id: string }[]).filter((r) => r.id !== id) } as CRMData;
        // Yerel modda ON DELETE CASCADE davranışını taklit et
        if (key === 'hospitals') {
          next.contacts = next.contacts.filter((c) => c.hospital_id !== id);
          next.inventory = next.inventory.filter((c) => c.hospital_id !== id);
          next.visits = next.visits.filter((c) => c.hospital_id !== id);
          next.deals = next.deals.filter((c) => c.hospital_id !== id);
        }
        if (key === 'contacts') next.visits = next.visits.map((v) => (v.contact_id === id ? { ...v, contact_id: null } : v));
        return next;
      });
      await persist({ table: TABLE[key], kind: 'delete', id });
    },
    [commitData, persist],
  );

  // ---------------- Alan bazlı işlemler ----------------
  const instrumentByCode = useCallback((code: string) => data.catalog.find((c) => c.code === code), [data.catalog]);
  const maxUsesOf = (code: string) => Math.max(1, dataRef.current.catalog.find((c) => c.code === code)?.default_max_uses ?? 1);

  const consumeOne = useCallback<CRMContextValue['consumeOne']>(
    async (id) => {
      const item = dataRef.current.inventory.find((i) => i.id === id);
      if (!item) return null;
      const disposable = maxUsesOf(item.instrument_code) === 1;
      const now = new Date().toISOString();
      if (disposable) {
        if (item.boxed_stock_count <= 0) {
          notify('Depoda bu sarf malzemeden kalmadı!', 'error');
          return { needsBoxPrompt: false };
        }
        await updateRow('inventory', id, { boxed_stock_count: item.boxed_stock_count - 1, last_checked_at: now });
        return { needsBoxPrompt: false };
      }
      if (item.active_instrument_remaining_uses <= 0) {
        return { needsBoxPrompt: item.boxed_stock_count > 0 };
      }
      const nextActive = item.active_instrument_remaining_uses - 1;
      await updateRow('inventory', id, { active_instrument_remaining_uses: nextActive, last_checked_at: now });
      return { needsBoxPrompt: nextActive === 0 && item.boxed_stock_count > 0 };
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [updateRow, notify],
  );

  const openNewBox = useCallback<CRMContextValue['openNewBox']>(
    async (id) => {
      const item = dataRef.current.inventory.find((i) => i.id === id);
      if (!item || item.boxed_stock_count <= 0) {
        notify('Depoda açılacak kapalı kutu yok. Sipariş oluşturun.', 'error');
        return false;
      }
      const max = maxUsesOf(item.instrument_code);
      await updateRow('inventory', id, {
        boxed_stock_count: item.boxed_stock_count - 1,
        active_instrument_remaining_uses: item.active_instrument_remaining_uses + max,
        last_checked_at: new Date().toISOString(),
      });
      return true;
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [updateRow, notify],
  );

  const applySurgeryCase = useCallback<CRMContextValue['applySurgeryCase']>(
    async (hospitalId, codes) => {
      const results: SurgeryResult[] = [];
      for (const code of codes) {
        const name = dataRef.current.catalog.find((c) => c.code === code)?.name_tr ?? code;
        const item = dataRef.current.inventory.find((i) => i.hospital_id === hospitalId && i.instrument_code === code);
        if (!item) {
          results.push({ code, name, status: 'missing', needsBoxPrompt: false });
          continue;
        }
        const disposable = maxUsesOf(code) === 1;
        const empty = disposable ? item.boxed_stock_count <= 0 : item.active_instrument_remaining_uses <= 0;
        if (empty) {
          results.push({ code, name, status: 'empty', itemId: item.id, remainingActive: item.active_instrument_remaining_uses, boxed: item.boxed_stock_count, needsBoxPrompt: !disposable && item.boxed_stock_count > 0 });
          continue;
        }
        const r = await consumeOne(item.id);
        const after = dataRef.current.inventory.find((i) => i.id === item.id)!;
        results.push({
          code,
          name,
          status: 'decremented',
          itemId: item.id,
          remainingActive: after.active_instrument_remaining_uses,
          boxed: after.boxed_stock_count,
          needsBoxPrompt: !!r?.needsBoxPrompt,
        });
      }
      return results;
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [consumeOne],
  );

  const value: CRMContextValue = {
    data,
    mode,
    authState,
    session,
    pendingOps,
    lastSyncedAt,
    instrumentByCode,

    signIn: async (email, password) => {
      if (!supabase) return 'Supabase yapılandırılmamış.';
      const { data: res, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) return error.message === 'Invalid login credentials' ? 'E-posta veya şifre hatalı.' : error.message;
      setSession(res.session);
      setAuthState('signed-in');
      await loadCloud();
      return null;
    },
    signOut: async () => {
      if (supabase) await supabase.auth.signOut();
      setSession(null);
      setAuthState('signed-out');
      switchMode('loading');
      commitData(() => ({ ...EMPTY }));
    },
    continueOffline: () => {
      setForceOffline(true);
      setAuthState('n/a');
      switchMode('local');
      commitData(() => loadLocalData());
    },
    connectCloud: () => {
      setForceOffline(false);
      window.location.reload();
    },
    refresh: async () => {
      if (modeRef.current === 'local') {
        commitData(() => loadLocalData());
        return;
      }
      await loadCloud();
    },
    uploadLocalToCloud: async () => {
      if (!supabase || modeRef.current !== 'cloud') throw new Error('Önce Supabase oturumu açılmalı.');
      const local = localStore.readOffline();
      if (!local) throw new Error('Yüklenecek yerel veri bulunamadı.');
      const order: DataKey[] = ['hospitals', 'contacts', 'inventory', 'visits', 'deals'];
      for (const key of order) {
        const rows = local[key];
        if (!rows?.length) continue;
        const { error } = await supabase.from(TABLE[key]).upsert(rows as unknown as Record<string, unknown>[]);
        if (error) throw error;
      }
      await loadCloud();
    },
    resetLocalData: () => {
      const seed = buildSeedData();
      localStore.writeOffline(seed);
      if (modeRef.current === 'local') commitData(() => seed);
    },

    addHospital: async (input) => {
      const now = new Date().toISOString();
      return insertRow('hospitals', { ...input, id: newId(), created_at: now, updated_at: now });
    },
    updateHospital: (id, patch) => updateRow('hospitals', id, { ...patch, updated_at: new Date().toISOString() }),
    deleteHospital: (id) => deleteRow('hospitals', id),

    addContact: (input) => insertRow('contacts', { ...input, id: newId(), created_at: new Date().toISOString() }),
    updateContact: (id, patch) => updateRow('contacts', id, patch),
    deleteContact: (id) => deleteRow('contacts', id),

    addInventory: async (input) => {
      if (dataRef.current.inventory.some((i) => i.hospital_id === input.hospital_id && i.instrument_code === input.instrument_code)) {
        notify('Bu enstrüman bu hastanenin deposunda zaten kayıtlı.', 'error');
        return null;
      }
      return insertRow('inventory', { ...input, id: newId(), last_checked_at: new Date().toISOString() });
    },
    updateInventory: (id, patch) => updateRow('inventory', id, { ...patch, last_checked_at: new Date().toISOString() }),
    deleteInventory: (id) => deleteRow('inventory', id),
    consumeOne,
    openNewBox,
    applySurgeryCase,

    addVisit: (input) => insertRow('visits', { ...input, id: newId(), created_at: new Date().toISOString() }),
    updateVisit: (id, patch) => updateRow('visits', id, patch),
    deleteVisit: (id) => deleteRow('visits', id),
    toggleVisitAction: async (id) => {
      const v = dataRef.current.visits.find((x) => x.id === id);
      if (v) await updateRow('visits', id, { is_action_completed: !v.is_action_completed });
    },

    addDeal: (input) => insertRow('deals', { ...input, id: newId(), created_at: new Date().toISOString() }),
    updateDeal: (id, patch) => updateRow('deals', id, patch),
    deleteDeal: (id) => deleteRow('deals', id),
  };

  return <CRMContext.Provider value={value}>{children}</CRMContext.Provider>;
}

// eslint-disable-next-line react-refresh/only-export-components
export function useCRM(): CRMContextValue {
  const ctx = useContext(CRMContext);
  if (!ctx) throw new Error('useCRM, CRMProvider içinde kullanılmalı');
  return ctx;
}
