import { useMemo, useState } from 'react';
import { CheckCircle2, AlertTriangle, PackageOpen, Stethoscope, XCircle } from 'lucide-react';
import { Modal, btn, Badge } from '../ui';
import { useCRM, type SurgeryResult } from '../../context/CRMContext';
import { useToast } from '../ui/Toast';
import { caseSetCost, cn, fmtUSD } from '../../lib/domain';

interface Props {
  open: boolean;
  onClose: () => void;
  hospitalId: string;
}

/** Ameliyat girildiğinde seçilen branş setindeki enstrümanlardan setteki adet kadar can/stok düşer. */
export function SurgeryCaseModal({ open, onClose, hospitalId }: Props) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Ameliyat Girildi — Vaka Düş"
      description="Branş setini seçin; setteki aletlerin aktif canından ve tek kullanımlık sarflardan seçili adet kadar düşülür."
      size="xl"
    >
      <SurgeryForm hospitalId={hospitalId} onClose={onClose} />
    </Modal>
  );
}

function SurgeryForm({ hospitalId, onClose }: { hospitalId: string; onClose: () => void }) {
  const { data, specialtyPresets, applySurgeryCase, openNewBox } = useCRM();
  const { notify } = useToast();
  const [setId, setSetId] = useState(specialtyPresets[0]?.id ?? 'uro');
  const caseSet = specialtyPresets.find((s) => s.id === setId) ?? specialtyPresets[0];
  const hospitalInv = useMemo(() => data.inventory.filter((i) => i.hospital_id === hospitalId), [data.inventory, hospitalId]);
  const [selected, setSelected] = useState<Set<string>>(() => new Set(caseSet?.items.map((it) => it.code) ?? []));
  const [results, setResults] = useState<SurgeryResult[] | null>(null);
  const [busy, setBusy] = useState(false);
  const [opened, setOpened] = useState<Set<string>>(new Set());

  const chooseSet = (id: string) => {
    setSetId(id);
    const found = specialtyPresets.find((s) => s.id === id);
    setSelected(new Set(found?.items.map((it) => it.code) ?? []));
    setResults(null);
  };

  const toggle = (code: string) =>
    setSelected((prev) => {
      const n = new Set(prev);
      if (n.has(code)) n.delete(code);
      else n.add(code);
      return n;
    });

  const run = async () => {
    if (!caseSet) return;
    setBusy(true);
    const itemsToApply = caseSet.items.filter((it) => selected.has(it.code));
    const res = await applySurgeryCase(hospitalId, itemsToApply);
    setResults(res);
    setBusy(false);
    const ok = res.filter((r) => r.status === 'decremented').length;
    notify(`Vaka işlendi: ${ok} kalemden kontör düşüldü.`, ok ? 'success' : 'info');
  };

  if (!caseSet) return null;
  const setCost = caseSetCost(caseSet, data.catalog);

  if (results) {
    return (
      <section aria-labelledby="sr-h" className="space-y-4">
        <h3 id="sr-h" className="font-semibold text-navy">
          {caseSet.title} — Vaka Sonucu
        </h3>
        <ul className="divide-y divide-slate-100 rounded-xl border border-slate-200">
          {results.map((r) => (
            <li key={r.code} className="flex flex-wrap items-center gap-3 px-4 py-3 text-sm">
              {r.status === 'decremented' ? (
                <CheckCircle2 aria-hidden="true" className="size-5 text-emerald-600" />
              ) : r.status === 'empty' ? (
                <AlertTriangle aria-hidden="true" className="size-5 text-alert" />
              ) : (
                <XCircle aria-hidden="true" className="size-5 text-slate-400" />
              )}
              <span className="min-w-0 flex-1">
                <strong className="font-mono text-xs text-slate-500">{r.code}</strong> {r.name}{' '}
                {r.quantity > 1 && <Badge className="bg-slate-100 text-slate-700">{r.quantity}x</Badge>}
                <small className="block text-slate-600">
                  {r.status === 'decremented' && `Düşüldü (-${r.quantity}) → aktif can: ${r.remainingActive}, kapalı kutu/adet: ${r.boxed}`}
                  {r.status === 'empty' && 'Can/stok yok — düşülemedi!'}
                  {r.status === 'missing' && 'Bu hastanenin deposunda kayıtlı değil.'}
                </small>
              </span>
              {r.needsBoxPrompt && r.itemId && !opened.has(r.itemId) && (
                <button
                  type="button"
                  className={btn('success', 'sm')}
                  onClick={async () => {
                    if (await openNewBox(r.itemId!)) {
                      setOpened((p) => new Set(p).add(r.itemId!));
                      notify(`${r.name}: yeni kutu açıldı.`);
                    }
                  }}
                >
                  <PackageOpen aria-hidden="true" className="size-4" /> Canı bitti — kutu aç
                </button>
              )}
              {r.itemId && opened.has(r.itemId) && <Badge className="bg-emerald-50 text-emerald-700">Kutu açıldı</Badge>}
            </li>
          ))}
        </ul>
        <footer className="flex justify-end gap-2">
          <button type="button" className={btn('secondary')} onClick={() => setResults(null)}>
            Yeni Vaka Gir
          </button>
          <button type="button" className={btn('primary')} onClick={onClose}>
            Tamam
          </button>
        </footer>
      </section>
    );
  }

  return (
    <section className="space-y-4">
      <fieldset>
        <legend className="mb-2 text-sm font-semibold text-navy">Branş / Ameliyat Tipi</legend>
        <ul className="grid gap-2 sm:grid-cols-2">
          {specialtyPresets.map((s) => {
            const cost = caseSetCost(s, data.catalog);
            return (
              <li key={s.id}>
                <label
                  className={cn(
                    'flex cursor-pointer items-start gap-3 rounded-xl border p-3 text-sm transition',
                    setId === s.id ? 'border-medical bg-sky-50 ring-2 ring-medical/20' : 'border-slate-200 hover:bg-slate-50',
                  )}
                >
                  <input type="radio" name="case-set" value={s.id} checked={setId === s.id} onChange={() => chooseSet(s.id)} className="mt-1 accent-sky-600" />
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center justify-between gap-2">
                      <strong className="text-slate-900">{s.branch}</strong>
                      <Badge className="bg-emerald-50 text-emerald-700">{fmtUSD(cost.total, 0)} / vaka</Badge>
                    </span>
                    <span className="block text-xs text-slate-600">{s.procedures}</span>
                  </span>
                </label>
              </li>
            );
          })}
        </ul>
      </fieldset>

      <fieldset>
        <legend className="mb-2 flex w-full items-center justify-between text-sm font-semibold text-navy">
          <span>Bu vakada açılan enstrümanlar</span>
          <span className="text-xs font-normal text-slate-600">Set vaka maliyeti: {fmtUSD(setCost.total, 0)}</span>
        </legend>
        <ul className="divide-y divide-slate-100 rounded-xl border border-slate-200">
          {caseSet.items.map(({ code, quantity }) => {
            const inst = data.catalog.find((c) => c.code === code);
            const inv = hospitalInv.find((i) => i.instrument_code === code);
            const disposable = (inst?.default_max_uses ?? 1) === 1;
            const perCase = ((inst?.unit_list_price_usd ?? 0) / Math.max(1, inst?.default_max_uses ?? 1)) * quantity;
            return (
              <li key={code} className="flex items-center gap-3 px-4 py-2.5 text-sm">
                <input id={`sc-${code}`} type="checkbox" checked={selected.has(code)} onChange={() => toggle(code)} className="size-4 accent-sky-600" />
                <label htmlFor={`sc-${code}`} className="min-w-0 flex-1 cursor-pointer">
                  <span className="font-mono text-xs text-slate-500">{code}</span> {inst?.name_tr ?? code}{' '}
                  {quantity > 1 && <strong className="text-xs text-medical">({quantity}x)</strong>}
                  <small className="ml-2 text-xs text-slate-500">{fmtUSD(perCase, 0)}/vaka</small>
                </label>
                {inv ? (
                  <Badge
                    className={cn(
                      disposable
                        ? 'bg-slate-100 text-slate-700'
                        : inv.active_instrument_remaining_uses <= inv.min_critical_uses_threshold
                          ? 'bg-red-50 text-red-700'
                          : 'bg-emerald-50 text-emerald-700',
                    )}
                  >
                    {disposable ? `${inv.boxed_stock_count} adet` : `${inv.active_instrument_remaining_uses} can · ${inv.boxed_stock_count} kutu`}
                  </Badge>
                ) : (
                  <Badge className="bg-slate-100 text-slate-500">Depoda yok</Badge>
                )}
              </li>
            );
          })}
        </ul>
      </fieldset>

      <footer className="flex justify-end gap-2 border-t border-slate-200 pt-4">
        <button type="button" className={btn('secondary')} onClick={onClose}>
          Vazgeç
        </button>
        <button type="button" className={btn('danger')} onClick={run} disabled={busy || selected.size === 0}>
          <Stethoscope aria-hidden="true" className="size-4" /> {busy ? 'İşleniyor…' : 'Vakayı Düş'}
        </button>
      </footer>
    </section>
  );
}
