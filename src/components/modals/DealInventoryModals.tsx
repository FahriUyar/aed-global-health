import { useState, type FormEvent } from 'react';
import { Modal, TextField, SelectField, TextAreaField, CheckboxField, btn } from '../ui';
import { useCRM } from '../../context/CRMContext';
import { useToast } from '../ui/Toast';
import { ORDER_STATUSES, ORDER_TYPES, type DealInput, type DealOrder, type InventoryInput, type InventoryItem } from '../../types/database';

// ---------------------------------------------------------------------------
// Teklif / Sipariş modalı
// ---------------------------------------------------------------------------
interface DealProps {
  open: boolean;
  onClose: () => void;
  hospitalId?: string;
  deal?: DealOrder | null;
  prefill?: Partial<DealInput>;
}

export function DealModal({ open, onClose, hospitalId, deal, prefill }: DealProps) {
  return (
    <Modal open={open} onClose={onClose} title={deal ? 'Teklifi / Siparişi Düzenle' : 'Yeni Teklif / Sipariş'} description="Robot, sarf ve ihale teklifleri ile ÜTS bildirim takibi" size="xl">
      <DealForm onClose={onClose} hospitalId={hospitalId} deal={deal} prefill={prefill} />
    </Modal>
  );
}

function DealForm({ onClose, hospitalId, deal, prefill }: Omit<DealProps, 'open'>) {
  const { data, addDeal, updateDeal } = useCRM();
  const { notify } = useToast();
  const [saving, setSaving] = useState(false);
  const [f, setF] = useState<DealInput>(() =>
    deal
      ? (({ id: _i, created_at: _c, ...rest }) => (void _i, void _c, rest))(deal)
      : {
          hospital_id: hospitalId ?? data.hospitals[0]?.id ?? '',
          order_type: 'Rutin Sarf & Enstrüman Siparişi',
          status: 'Hazırlık',
          total_amount_usd: 0,
          uts_notification_done: false,
          items_summary: '',
          expected_close_date: null,
          notes: '',
          ...prefill,
        },
  );
  const set = <K extends keyof DealInput>(k: K, v: DealInput[K]) => setF((p) => ({ ...p, [k]: v }));

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!f.hospital_id) return notify('Hastane seçin.', 'error');
    setSaving(true);
    const payload: DealInput = { ...f, items_summary: f.items_summary?.trim() || null, notes: f.notes?.trim() || null, expected_close_date: f.expected_close_date || null };
    try {
      if (deal) await updateDeal(deal.id, payload);
      else await addDeal(payload);
      notify(deal ? 'Kayıt güncellendi.' : 'Teklif / sipariş oluşturuldu.');
      onClose();
    } catch {
      /* veri katmanı bildirir */
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={submit} className="grid gap-4 sm:grid-cols-2">
      {!hospitalId && (
        <SelectField
          label="Hastane *"
          id="d-h"
          className="sm:col-span-2"
          options={data.hospitals.map((h) => ({ value: h.id, label: `${h.city} — ${h.name}` }))}
          value={f.hospital_id}
          onChange={(e) => set('hospital_id', e.target.value)}
        />
      )}
      <SelectField label="Tip" id="d-type" options={ORDER_TYPES} value={f.order_type} onChange={(e) => set('order_type', e.target.value as DealInput['order_type'])} />
      <SelectField label="Durum" id="d-status" options={ORDER_STATUSES} value={f.status} onChange={(e) => set('status', e.target.value as DealInput['status'])} />
      <TextField label="Toplam Tutar (USD)" id="d-amount" type="number" min={0} step="0.01" inputMode="decimal" value={f.total_amount_usd} onChange={(e) => set('total_amount_usd', Math.max(0, Number(e.target.value) || 0))} />
      <TextField label="Beklenen Kapanış Tarihi" id="d-date" type="date" value={f.expected_close_date ?? ''} onChange={(e) => set('expected_close_date', e.target.value || null)} />
      <TextAreaField label="Kalemler" id="d-items" className="sm:col-span-2" value={f.items_summary ?? ''} onChange={(e) => set('items_summary', e.target.value)} placeholder="5x Maryland, 5x Monopolar Makas, 50x Steril Drape" />
      <TextAreaField label="Notlar" id="d-notes" className="sm:col-span-2" value={f.notes ?? ''} onChange={(e) => set('notes', e.target.value)} />
      <CheckboxField label="ÜTS verme bildirimi yapıldı" id="d-uts" checked={f.uts_notification_done} onChange={(e) => set('uts_notification_done', e.target.checked)} className="sm:col-span-2" />
      <footer className="flex justify-end gap-2 border-t border-slate-200 pt-4 sm:col-span-2">
        <button type="button" className={btn('secondary')} onClick={onClose}>
          Vazgeç
        </button>
        <button type="submit" className={btn('primary')} disabled={saving}>
          {saving ? 'Kaydediliyor…' : 'Kaydet'}
        </button>
      </footer>
    </form>
  );
}

// ---------------------------------------------------------------------------
// Depo / enstrüman stok modalı
// ---------------------------------------------------------------------------
interface InvProps {
  open: boolean;
  onClose: () => void;
  hospitalId: string;
  item?: InventoryItem | null;
}

export function InventoryModal({ open, onClose, hospitalId, item }: InvProps) {
  return (
    <Modal open={open} onClose={onClose} title={item ? 'Stok Kaydını Düzenle' : 'Depoya Enstrüman Ekle'} description="Kapalı kutu, aktif can ve haftalık tüketim hızı" size="lg">
      <InventoryForm onClose={onClose} hospitalId={hospitalId} item={item} />
    </Modal>
  );
}

function InventoryForm({ onClose, hospitalId, item }: Omit<InvProps, 'open'>) {
  const { data, addInventory, updateInventory } = useCRM();
  const { notify } = useToast();
  const used = new Set(data.inventory.filter((i) => i.hospital_id === hospitalId).map((i) => i.instrument_code));
  const available = data.catalog.filter((c) => !used.has(c.code) || c.code === item?.instrument_code);
  const [f, setF] = useState<InventoryInput>(() =>
    item
      ? (({ id: _i, last_checked_at: _l, ...rest }) => (void _i, void _l, rest))(item)
      : {
          hospital_id: hospitalId,
          instrument_code: available[0]?.code ?? '',
          boxed_stock_count: 0,
          active_instrument_remaining_uses: available[0]?.default_max_uses && available[0].default_max_uses > 1 ? available[0].default_max_uses : 0,
          min_critical_uses_threshold: 5,
          avg_uses_per_week: 2,
          notes: '',
        },
  );
  const set = <K extends keyof InventoryInput>(k: K, v: InventoryInput[K]) => setF((p) => ({ ...p, [k]: v }));
  const inst = data.catalog.find((c) => c.code === f.instrument_code);
  const disposable = (inst?.default_max_uses ?? 1) === 1;
  const int = (v: string) => Math.max(0, Math.round(Number(v) || 0));

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!f.instrument_code) return notify('Enstrüman seçin.', 'error');
    const payload = { ...f, active_instrument_remaining_uses: disposable ? 0 : f.active_instrument_remaining_uses, notes: f.notes?.trim() || null };
    try {
      if (item) {
        await updateInventory(item.id, payload);
        notify('Stok güncellendi.');
      } else {
        const r = await addInventory(payload);
        if (!r) return;
        notify('Enstrüman depoya eklendi.');
      }
      onClose();
    } catch {
      /* veri katmanı bildirir */
    }
  };

  return (
    <form onSubmit={submit} className="grid gap-4 sm:grid-cols-2">
      <SelectField
        label="Enstrüman / Sarf"
        id="i-code"
        className="sm:col-span-2"
        disabled={!!item}
        options={available.map((c) => ({ value: c.code, label: `${c.code} — ${c.name_tr} (${c.default_max_uses} can)` }))}
        value={f.instrument_code}
        onChange={(e) => {
          const c = data.catalog.find((x) => x.code === e.target.value);
          setF((p) => ({ ...p, instrument_code: e.target.value, active_instrument_remaining_uses: c && c.default_max_uses > 1 ? c.default_max_uses : 0 }));
        }}
      />
      <TextField label={disposable ? 'Depodaki Adet' : 'Kapalı Kutu Adedi'} id="i-box" type="number" min={0} inputMode="numeric" value={f.boxed_stock_count} onChange={(e) => set('boxed_stock_count', int(e.target.value))} />
      {!disposable && (
        <TextField
          label="Aktif Enstrüman Kalan Can"
          id="i-active"
          type="number"
          min={0}
          inputMode="numeric"
          hint={`Yeni enstrüman ${inst?.default_max_uses ?? '—'} can ile başlar`}
          value={f.active_instrument_remaining_uses}
          onChange={(e) => set('active_instrument_remaining_uses', int(e.target.value))}
        />
      )}
      <TextField label="Kritik Eşik (can/adet)" id="i-thr" type="number" min={0} inputMode="numeric" value={f.min_critical_uses_threshold} onChange={(e) => set('min_critical_uses_threshold', int(e.target.value))} />
      <TextField label="Haftalık Ortalama Tüketim" id="i-rate" type="number" min={0} step="0.5" inputMode="decimal" value={f.avg_uses_per_week} onChange={(e) => set('avg_uses_per_week', Math.max(0, Number(e.target.value) || 0))} />
      <TextAreaField label="Notlar" id="i-notes" className="sm:col-span-2" value={f.notes ?? ''} onChange={(e) => set('notes', e.target.value)} />
      <footer className="flex justify-end gap-2 border-t border-slate-200 pt-4 sm:col-span-2">
        <button type="button" className={btn('secondary')} onClick={onClose}>
          Vazgeç
        </button>
        <button type="submit" className={btn('primary')}>
          Kaydet
        </button>
      </footer>
    </form>
  );
}

// ---------------------------------------------------------------------------
// "Aktif enstrümanın canı bitti — kutu açılsın mı?" akıllı tetikleyici
// ---------------------------------------------------------------------------
export function OpenBoxPrompt({ itemId, onClose }: { itemId: string | null; onClose: () => void }) {
  const { data, openNewBox } = useCRM();
  const { notify } = useToast();
  const item = data.inventory.find((i) => i.id === itemId);
  const inst = item ? data.catalog.find((c) => c.code === item.instrument_code) : undefined;
  return (
    <Modal
      open={!!itemId && !!item}
      onClose={onClose}
      size="md"
      title="Aktif enstrümanın ömrü (canı) bitti!"
      footer={
        <>
          <button type="button" className={btn('secondary')} onClick={onClose}>
            Şimdi Değil
          </button>
          <button
            type="button"
            className={btn('success')}
            onClick={async () => {
              if (item && (await openNewBox(item.id))) notify(`${inst?.name_tr ?? 'Enstrüman'}: yeni kutu açıldı (+${inst?.default_max_uses} can).`);
              onClose();
            }}
          >
            Kutuyu Aç (+{inst?.default_max_uses ?? 0} Can)
          </button>
        </>
      }
    >
      <p className="text-sm text-slate-700">
        <strong>{inst?.code} — {inst?.name_tr}</strong> enstrümanının RFID canı sıfırlandı ve kilitlendi. Depodaki{' '}
        <strong>{item?.boxed_stock_count}</strong> kapalı kutudan 1 adet açılıp <strong>+{inst?.default_max_uses} can</strong> tanımlansın mı?
      </p>
    </Modal>
  );
}
