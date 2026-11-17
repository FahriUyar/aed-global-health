import { useMemo, useState } from 'react';
import { CheckCircle2, AlertTriangle, PackageOpen, Stethoscope, XCircle } from 'lucide-react';
import { Modal, btn, Badge } from '../ui';
import { useCRM, type SurgeryResult } from '../../context/CRMContext';
import { useToast } from '../ui/Toast';
import { CASE_SETS, cn } from '../../lib/domain';

interface Props {
  open: boolean;
  onClose: () => void;
  hospitalId: string;
}

/** Ameliyat girildiğinde seçilen branş setindeki enstrümanlardan 1'er can, tek kullanımlıklardan 1'er adet düşer. */
export function SurgeryCaseModal({ open, onClose, hospitalId }: Props) {
  return (
    <Modal open={open} onClose={onClose} title="Ameliyat Girildi — Vaka Düş" description="Branş setini seçin; setteki aletlerin aktif canından 1'er kontör ve 1 adet steril drape düşülür." size="xl">
      <SurgeryForm hospitalId={hospitalId} onClose={onClose} />
    </Modal>
  );
}

function SurgeryForm({ hospitalId, onClose }: { hospitalId: string; onClose: () => void }) {
  const { data, applySurgeryCase, openNewBox } = useCRM();
  const { notify } = useToast();
  const [setId, setSetId] = useState(CASE_SETS[0].id);
  const caseSet = CASE_SETS.find((s) => s.id === setId)!;
  const hospitalInv = useMemo(() => data.inventory.filter((i) => i.hospital_id === hospitalId), [data.inventory, hospitalId]);
  const [selected, setSelected] = useState<Set<string>>(() => new Set(CASE_SETS[0].codes));
  const [results, setResults] = useState<SurgeryResult[] | null>(null);
  const [busy, setBusy] = useState(false);
  const [opened, setOpened] = useState<Set<string>>(new Set());

  const chooseSet = (id: string) => {
    setSetId(id);
    setSelected(new Set(CASE_SETS.find((s) => s.id === id)!.codes));
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
    setBusy(true);
    const res = await applySurgeryCase(hospitalId, caseSet.codes.filter((c) => selected.has(c)));
    setResults(res);
    setBusy(false);
    const ok = res.filter((r) => r.status === 'decremented').length;
    notify(`Vaka işlendi: ${ok} kalemden kontör düşüldü.`, ok ? 'success' : 'info');
  };

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
                <strong className="font-mono text-xs text-slate-500">{r.code}</strong> {r.name}
                <small className="block text-slate-600">
                  {r.status === 'decremented' && `Düşüldü → aktif can: ${r.remainingActive}, kapalı kutu/adet: ${r.boxed}`}
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
          {CASE_SETS.map((s) => (
            <li key={s.id}>
              <label className={cn('flex cursor-pointer items-start gap-3 rounded-xl border p-3 text-sm transition', setId === s.id ? 'border-medical bg-sky-50 ring-2 ring-medical/20' : 'border-slate-200 hover:bg-slate-50')}>
                <input type="radio" name="case-set" value={s.id} checked={setId === s.id} onChange={() => chooseSet(s.id)} className="mt-1 accent-sky-600" />
                <span>
                  <strong className="block text-slate-900">{s.branch}</strong>
                  <span className="text-slate-600">{s.procedures}</span>
                </span>
              </label>
            </li>
          ))}
        </ul>
      </fieldset>

      <fieldset>
        <legend className="mb-2 text-sm font-semibold text-navy">Bu vakada açılan enstrümanlar</legend>
        <ul className="divide-y divide-slate-100 rounded-xl border border-slate-200">
          {caseSet.codes.map((code) => {
            const inst = data.catalog.find((c) => c.code === code);
            const inv = hospitalInv.find((i) => i.instrument_code === code);
            const disposable = (inst?.default_max_uses ?? 1) === 1;
            return (
              <li key={code} className="flex items-center gap-3 px-4 py-2.5 text-sm">
                <input id={`sc-${code}`} type="checkbox" checked={selected.has(code)} onChange={() => toggle(code)} className="size-4 accent-sky-600" />
                <label htmlFor={`sc-${code}`} className="min-w-0 flex-1 cursor-pointer">
                  <span className="font-mono text-xs text-slate-500">{code}</span> {inst?.name_tr ?? code}
                </label>
                {inv ? (
                  <Badge className={cn(disposable ? 'bg-slate-100 text-slate-700' : inv.active_instrument_remaining_uses <= inv.min_critical_uses_threshold ? 'bg-red-50 text-red-700' : 'bg-emerald-50 text-emerald-700')}>
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
          <Stethoscope aria-hidden="true" className="size-4" /> {busy ? 'İşleniyor…' : 'Vakayı Düş (-1 Can)'}
        </button>
      </footer>
    </section>
  );
}
