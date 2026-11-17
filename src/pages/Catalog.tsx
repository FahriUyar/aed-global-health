import { useMemo, useState } from 'react';
import {
  Check,
  FileCheck2,
  Layers,
  LayoutGrid,
  Pencil,
  Plus,
  RotateCcw,
  Save,
  Search,
  SlidersHorizontal,
  Sparkles,
  Stethoscope,
  Table2,
  Trash2,
} from 'lucide-react';
import { useCRM } from '../context/CRMContext';
import { useDocumentMeta } from '../hooks/useDocumentMeta';
import { Badge, Card, EmptyState, PageHeader, TextField, btn } from '../components/ui';
import { InstrumentEditModal, SpecialtyPresetModal } from '../components/modals/InstrumentEditModal';
import { useToast } from '../components/ui/Toast';
import { INSTRUMENT_CATEGORIES, type InstrumentCatalogItem, type SpecialtyPreset } from '../types/database';
import { caseSetCost, cn, fmtUSD, formatShaftDiameter } from '../lib/domain';

interface BulkRowDraft {
  unit_list_price_usd: number;
  default_max_uses: number;
  shaft_diameter: string;
  sut_code: string;
}

export default function Catalog() {
  useDocumentMeta('Enstrüman Kataloğu & Klinik Rehber', 'Toumai® MT-1000 için 17 adet 8 mm robotik cerrahi enstrüman, tam sarf malzemeler, dinamik fiyat/can yönetimi ve branş vaka setleri.');
  const { data, specialtyPresets, updateInstrument, deleteInstrument, resetCatalogToDefaults } = useCRM();
  const { notify } = useToast();

  const [cat, setCat] = useState<string>('Tümü');
  const [q, setQ] = useState('');
  const [activeSetId, setActiveSetId] = useState<string | null>(specialtyPresets[0]?.id ?? null);
  const [editModal, setEditModal] = useState<{ open: boolean; instrument?: InstrumentCatalogItem | null }>({ open: false });
  const [presetModal, setPresetModal] = useState<{ open: boolean; preset: SpecialtyPreset | null }>({ open: false, preset: null });
  const [bulkMode, setBulkMode] = useState(false);
  const [bulkDrafts, setBulkDrafts] = useState<Record<string, BulkRowDraft>>({});
  const [bulkSaving, setBulkSaving] = useState(false);

  const activeSet = specialtyPresets.find((s) => s.id === activeSetId) ?? null;
  const setBreakdown = useMemo(() => (activeSet ? caseSetCost(activeSet, data.catalog) : null), [activeSet, data.catalog]);

  const categories = useMemo(() => {
    const custom = Array.from(new Set(data.catalog.map((i) => i.category))).filter((c) => !(INSTRUMENT_CATEGORIES as readonly string[]).includes(c));
    return ['Tümü', ...INSTRUMENT_CATEGORIES.filter((c) => data.catalog.some((i) => i.category === c)), ...custom];
  }, [data.catalog]);

  const items = useMemo(() => {
    const term = q.trim().toLocaleLowerCase('tr');
    return data.catalog.filter((i) => {
      if (cat !== 'Tümü' && i.category !== cat) return false;
      if (
        term &&
        !`${i.code} ${i.name_tr} ${i.name_en} ${i.clinical_usage_description} ${i.typical_branches ?? ''} ${i.sut_code ?? ''} ${i.tender_spec_notes ?? ''}`
          .toLocaleLowerCase('tr')
          .includes(term)
      )
        return false;
      return true;
    });
  }, [data.catalog, cat, q]);

  const enterBulkMode = () => {
    const map: Record<string, BulkRowDraft> = {};
    for (const inst of data.catalog) {
      map[inst.code] = {
        unit_list_price_usd: inst.unit_list_price_usd,
        default_max_uses: inst.default_max_uses,
        shaft_diameter: formatShaftDiameter(inst),
        sut_code: inst.sut_code ?? '',
      };
    }
    setBulkDrafts(map);
    setBulkMode(true);
  };

  const updateBulkDraft = <K extends keyof BulkRowDraft>(code: string, key: K, value: BulkRowDraft[K]) =>
    setBulkDrafts((prev) => ({
      ...prev,
      [code]: {
        ...(prev[code] ?? { unit_list_price_usd: 0, default_max_uses: 1, shaft_diameter: '8 mm', sut_code: '' }),
        [key]: value,
      },
    }));

  const changedCount = useMemo(() => {
    if (!bulkMode) return 0;
    let count = 0;
    for (const inst of data.catalog) {
      const d = bulkDrafts[inst.code];
      if (!d) continue;
      if (
        Number(d.unit_list_price_usd) !== Number(inst.unit_list_price_usd) ||
        Number(d.default_max_uses) !== Number(inst.default_max_uses) ||
        d.shaft_diameter.trim() !== formatShaftDiameter(inst) ||
        d.sut_code.trim() !== (inst.sut_code ?? '')
      ) {
        count += 1;
      }
    }
    return count;
  }, [bulkMode, bulkDrafts, data.catalog]);

  const saveAllBulkChanges = async () => {
    setBulkSaving(true);
    let updated = 0;
    try {
      for (const inst of data.catalog) {
        const d = bulkDrafts[inst.code];
        if (!d) continue;
        const nextPrice = Math.max(0, Number(d.unit_list_price_usd) || 0);
        const nextUses = Math.max(1, Math.round(Number(d.default_max_uses) || 1));
        const nextDiam = d.shaft_diameter.trim() || '8 mm';
        const nextSut = d.sut_code.trim() || null;
        if (
          nextPrice !== Number(inst.unit_list_price_usd) ||
          nextUses !== Number(inst.default_max_uses) ||
          nextDiam !== formatShaftDiameter(inst) ||
          nextSut !== (inst.sut_code ?? null)
        ) {
          await updateInstrument(inst.code, {
            unit_list_price_usd: nextPrice,
            default_max_uses: nextUses,
            shaft_diameter: nextDiam,
            sut_code: nextSut,
          });
          updated += 1;
        }
      }
      notify(updated > 0 ? `${updated} kalemin fiyat / can / SUT bilgileri güncellendi.` : 'Değişiklik yapılmadı.', updated > 0 ? 'success' : 'info');
      setBulkMode(false);
    } finally {
      setBulkSaving(false);
    }
  };

  return (
    <>
      <PageHeader
        title="Enstrüman Kataloğu ve Klinik Rehber"
        subtitle={`Toumai® MT-1000 · ${data.catalog.length} kalem aktif katalog · Fiyat ve can güncellemeleri vaka setlerine ve ROI simülatörüne anında yansır`}
        actions={
          <>
            <button
              type="button"
              className={btn('primary')}
              onClick={() => setEditModal({ open: true, instrument: null })}
            >
              <Plus aria-hidden="true" className="size-4" /> Yeni Enstrüman / Sarf Ekle
            </button>
            <button
              type="button"
              aria-pressed={bulkMode}
              onClick={() => (bulkMode ? setBulkMode(false) : enterBulkMode())}
              className={btn(bulkMode ? 'success' : 'secondary')}
            >
              {bulkMode ? <LayoutGrid aria-hidden="true" className="size-4" /> : <Table2 aria-hidden="true" className="size-4" />}
              {bulkMode ? 'Kart Görünümüne Dön' : 'Hızlı Fiyat & Can Düzenleme Modu'}
            </button>
            <button
              type="button"
              className={btn('secondary')}
              onClick={async () => {
                if (!confirm('Katalogdaki tüm enstrümanlar ve branş vaka setleri orijinal 19 kalemlik Toumai® MT-1000 fabrika ayarlarına döndürülsün mü?')) return;
                await resetCatalogToDefaults();
                setBulkMode(false);
                notify('Katalog ve branş vaka setleri fabrika ayarlarına sıfırlandı.');
              }}
            >
              <RotateCcw aria-hidden="true" className="size-4 text-amber-600" /> Fabrika Ayarlarına Sıfırla
            </button>
          </>
        }
      />

      {/* Branşa göre hazır vaka setleri */}
      <Card className="mb-6 p-5" aria-labelledby="set-h">
        <header className="mb-3 flex flex-wrap items-center gap-2">
          <Stethoscope aria-hidden="true" className="size-5 text-medical" />
          <h2 id="set-h" className="font-semibold text-navy">
            Branşa Göre Hazır Vaka Setleri
          </h2>
          <small className="ml-auto text-xs text-slate-500">
            Fiyat/can değişiklikleri vaka başı maliyeti anında günceller · Ayar ikonuna tıklayarak seti özelleştirin
          </small>
        </header>
        <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {specialtyPresets.map((s) => {
            const { total, totalUnits } = caseSetCost(s, data.catalog);
            const active = activeSetId === s.id;
            return (
              <li key={s.id} className="relative">
                <article
                  className={cn(
                    'flex h-full flex-col justify-between rounded-xl border p-3.5 transition',
                    active ? 'border-medical bg-sky-50/70 ring-2 ring-medical/25' : 'border-slate-200 hover:bg-slate-50',
                  )}
                >
                  <div className="flex items-start justify-between gap-2">
                    <button
                      type="button"
                      aria-pressed={active}
                      onClick={() => setActiveSetId(active ? null : s.id)}
                      className="min-w-0 flex-1 text-left"
                    >
                      <strong className="block text-sm text-navy">{s.title}</strong>
                      <span className="mt-0.5 block text-xs text-slate-600">{s.procedures}</span>
                    </button>
                    <button
                      type="button"
                      aria-label={`${s.title} setini düzenle`}
                      title="Seti Düzenle"
                      onClick={() => setPresetModal({ open: true, preset: s })}
                      className="shrink-0 rounded-lg border border-slate-200 bg-white p-1.5 text-slate-600 hover:border-medical hover:text-medical"
                    >
                      <SlidersHorizontal aria-hidden="true" className="size-3.5" />
                    </button>
                  </div>
                  <button
                    type="button"
                    onClick={() => setActiveSetId(active ? null : s.id)}
                    className="mt-3 flex w-full items-baseline justify-between border-t border-slate-200/80 pt-2 text-left text-xs"
                  >
                    <span className="text-slate-500">
                      {s.items.length} kalem ({totalUnits} adet)
                    </span>
                    <strong className="text-sm text-emerald-700">{fmtUSD(total, 0)} / vaka</strong>
                  </button>
                </article>
              </li>
            );
          })}
        </ul>

        {activeSet && setBreakdown && (
          <section aria-label={`${activeSet.title} kombinasyonu`} className="mt-4 rounded-xl border border-sky-200 bg-white p-4">
            <header className="mb-2 flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-semibold text-navy">
                  {activeSet.title} — {activeSet.procedures}
                </h3>
                <button
                  type="button"
                  onClick={() => setPresetModal({ open: true, preset: activeSet })}
                  className="inline-flex items-center gap-1 rounded-lg bg-sky-50 px-2.5 py-1 text-xs font-semibold text-medical hover:bg-sky-100"
                >
                  <Pencil aria-hidden="true" className="size-3" /> Seti Düzenle
                </button>
              </div>
              <p className="text-sm">
                Canlı vaka başı sarf maliyeti: <strong className="text-lg text-emerald-700">{fmtUSD(setBreakdown.total, 0)} / vaka</strong>
              </p>
            </header>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="border-b border-slate-200 text-slate-500">
                  <tr>
                    <th scope="col" className="py-1.5 pr-3">Kod</th>
                    <th scope="col" className="py-1.5 pr-3">Enstrüman / Sarf</th>
                    <th scope="col" className="py-1.5 pr-3">Adet</th>
                    <th scope="col" className="py-1.5 pr-3">Ömür</th>
                    <th scope="col" className="py-1.5 pr-3">Liste Fiyatı</th>
                    <th scope="col" className="py-1.5 text-right">Vaka Başı Maliyet</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {setBreakdown.lines.map(({ instrument: inst, quantity, perCase }) => (
                    <tr key={inst.code}>
                      <td className="py-1.5 pr-3 font-mono text-slate-600">{inst.code}</td>
                      <td className="py-1.5 pr-3 font-medium text-slate-900">{inst.name_tr}</td>
                      <td className="py-1.5 pr-3 font-semibold text-navy">{quantity}x</td>
                      <td className="py-1.5 pr-3">{inst.default_max_uses === 1 ? 'Tek kullanımlık' : `${inst.default_max_uses} can`}</td>
                      <td className="py-1.5 pr-3">{fmtUSD(inst.unit_list_price_usd)}</td>
                      <td className="py-1.5 text-right font-semibold text-navy">{fmtUSD(perCase, 0)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}
      </Card>

      {/* Filtreler */}
      <Card className="mb-5 p-4" aria-label="Katalog filtreleri">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-end">
          <TextField
            label="Katalogda Ara"
            id="cat-q"
            type="search"
            placeholder="Kod (IN8036), Türkçe/İngilizce ad, SUT kodu veya klinik kullanım…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            className="lg:w-80"
          />
          <nav aria-label="Kategori filtresi" className="flex flex-wrap gap-1.5">
            {categories.map((c) => (
              <button
                key={c}
                type="button"
                aria-pressed={cat === c}
                onClick={() => setCat(c)}
                className={cn(
                  'rounded-full px-3 py-1.5 text-xs font-medium transition',
                  cat === c ? 'bg-navy text-white' : 'bg-slate-100 text-slate-700 hover:bg-slate-200',
                )}
              >
                {c}
              </button>
            ))}
          </nav>
        </div>
      </Card>

      {items.length === 0 ? (
        <EmptyState title="Eşleşen enstrüman bulunamadı" icon={<Search aria-hidden="true" className="size-8 text-slate-400" />} />
      ) : bulkMode ? (
        /* HIZLI FİYAT & CAN DÜZENLEME MODU (TABLO GÖRÜNÜMÜ) */
        <Card className="overflow-hidden" aria-labelledby="bulk-h">
          <header className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 bg-sky-50/70 px-5 py-3.5">
            <div>
              <h2 id="bulk-h" className="text-sm font-bold text-navy">
                Hızlı Fiyat & Can Düzenleme Tablosu (Excel Görünümü)
              </h2>
              <p className="text-xs text-slate-600">
                Liste fiyatlarını ($), maksimum can ömürlerini, şaft çaplarını ve SUT/ÜTS kodlarını satır içinde değiştirip tek tuşla kaydedin.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Badge className={changedCount > 0 ? 'bg-amber-100 text-amber-900' : 'bg-slate-100 text-slate-600'}>
                {changedCount} bekleyen değişiklik
              </Badge>
              <button
                type="button"
                disabled={bulkSaving}
                onClick={saveAllBulkChanges}
                className={btn('primary')}
              >
                <Save aria-hidden="true" className="size-4" /> {bulkSaving ? 'Kaydediliyor…' : 'Tüm Değişiklikleri Kaydet'}
              </button>
            </div>
          </header>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[920px] text-left text-sm">
              <thead className="border-b border-slate-200 bg-slate-50 text-xs font-semibold uppercase tracking-wide text-slate-600">
                <tr>
                  <th scope="col" className="px-4 py-3">Kod</th>
                  <th scope="col" className="px-4 py-3">Enstrüman / Kategori</th>
                  <th scope="col" className="px-4 py-3">Şaft Çapı</th>
                  <th scope="col" className="px-4 py-3">Liste Fiyatı ($ USD)</th>
                  <th scope="col" className="px-4 py-3">Maks. Ömür (Can)</th>
                  <th scope="col" className="px-4 py-3">Can Başına ($ / Can)</th>
                  <th scope="col" className="px-4 py-3">SUT / ÜTS Kodu</th>
                  <th scope="col" className="px-4 py-3 text-right">Detay</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {items.map((inst) => {
                  const d = bulkDrafts[inst.code] ?? {
                    unit_list_price_usd: inst.unit_list_price_usd,
                    default_max_uses: inst.default_max_uses,
                    shaft_diameter: formatShaftDiameter(inst),
                    sut_code: inst.sut_code ?? '',
                  };
                  const perUse = (Number(d.unit_list_price_usd) || 0) / Math.max(1, Number(d.default_max_uses) || 1);
                  const isDirty =
                    Number(d.unit_list_price_usd) !== Number(inst.unit_list_price_usd) ||
                    Number(d.default_max_uses) !== Number(inst.default_max_uses) ||
                    d.shaft_diameter.trim() !== formatShaftDiameter(inst) ||
                    d.sut_code.trim() !== (inst.sut_code ?? '');

                  return (
                    <tr key={inst.code} className={cn('hover:bg-slate-50/70', isDirty && 'bg-amber-50/40')}>
                      <td className="px-4 py-2.5 font-mono text-xs font-bold text-navy">{inst.code}</td>
                      <td className="px-4 py-2.5">
                        <strong className="block text-slate-900">{inst.name_tr}</strong>
                        <small className="text-xs text-slate-500">{inst.category}</small>
                      </td>
                      <td className="px-4 py-2.5">
                        <input
                          type="text"
                          aria-label={`${inst.name_tr} şaft çapı`}
                          value={d.shaft_diameter}
                          onChange={(e) => updateBulkDraft(inst.code, 'shaft_diameter', e.target.value)}
                          className="w-24 rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-900 focus:border-medical focus:outline-none"
                        />
                      </td>
                      <td className="px-4 py-2.5">
                        <input
                          type="number"
                          min={0}
                          step="10"
                          inputMode="decimal"
                          aria-label={`${inst.name_tr} liste fiyatı USD`}
                          value={d.unit_list_price_usd}
                          onChange={(e) => updateBulkDraft(inst.code, 'unit_list_price_usd', Math.max(0, Number(e.target.value) || 0))}
                          className="w-28 rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 font-mono text-xs font-semibold text-navy focus:border-medical focus:outline-none"
                        />
                      </td>
                      <td className="px-4 py-2.5">
                        <input
                          type="number"
                          min={1}
                          max={100}
                          inputMode="numeric"
                          aria-label={`${inst.name_tr} maksimum can ömrü`}
                          value={d.default_max_uses}
                          onChange={(e) => updateBulkDraft(inst.code, 'default_max_uses', Math.max(1, Math.round(Number(e.target.value) || 1)))}
                          className="w-20 rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 font-mono text-xs font-semibold text-emerald-700 focus:border-medical focus:outline-none"
                        />
                      </td>
                      <td className="px-4 py-2.5 font-mono text-xs font-bold text-emerald-700">{fmtUSD(perUse, 2)} / Can</td>
                      <td className="px-4 py-2.5">
                        <input
                          type="text"
                          aria-label={`${inst.name_tr} SUT veya ÜTS kodu`}
                          placeholder="SUT / ÜTS…"
                          value={d.sut_code}
                          onChange={(e) => updateBulkDraft(inst.code, 'sut_code', e.target.value)}
                          className="w-32 rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs text-slate-800 focus:border-medical focus:outline-none"
                        />
                      </td>
                      <td className="px-4 py-2.5 text-right">
                        <button
                          type="button"
                          onClick={() => setEditModal({ open: true, instrument: inst })}
                          aria-label={`${inst.name_tr} tüm alanları düzenle`}
                          className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-medium text-medical hover:bg-sky-50"
                        >
                          <Pencil aria-hidden="true" className="size-3.5" /> Detay
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <footer className="flex items-center justify-end gap-2 border-t border-slate-200 bg-slate-50 px-5 py-3">
            <button type="button" className={btn('secondary')} onClick={() => setBulkMode(false)}>
              Vazgeç
            </button>
            <button type="button" disabled={bulkSaving} onClick={saveAllBulkChanges} className={btn('primary')}>
              <Check aria-hidden="true" className="size-4" /> {bulkSaving ? 'Kaydediliyor…' : 'Tüm Değişiklikleri Kaydet'}
            </button>
          </footer>
        </Card>
      ) : (
        /* KART GÖRÜNÜMÜ */
        <ul className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {items.map((inst) => {
            const perUse = inst.unit_list_price_usd / Math.max(1, inst.default_max_uses);
            const inActiveSet = activeSet?.items.some((it) => it.code === inst.code);
            return (
              <li key={inst.code}>
                <Card as="article" className={cn('flex h-full flex-col justify-between p-5', inActiveSet && 'border-medical ring-2 ring-medical/20')}>
                  <header>
                    <div className="flex items-center justify-between gap-2">
                      <span className="rounded-lg bg-navy px-2.5 py-1 font-mono text-xs font-bold text-white">{inst.code}</span>
                      <div className="flex items-center gap-1">
                        <Badge className="bg-sky-50 text-sky-800">
                          <Layers aria-hidden="true" className="size-3" /> {inst.category}
                        </Badge>
                        <button
                          type="button"
                          onClick={() => setEditModal({ open: true, instrument: inst })}
                          aria-label={`${inst.name_tr} düzenle`}
                          title="Enstrümanı Düzenle"
                          className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100 hover:text-medical"
                        >
                          <Pencil aria-hidden="true" className="size-4" />
                        </button>
                        <button
                          type="button"
                          onClick={async () => {
                            if (!confirm(`${inst.code} — ${inst.name_tr} katalogdan silinsin mi?`)) return;
                            await deleteInstrument(inst.code);
                            notify(`${inst.code} katalogdan silindi.`);
                          }}
                          aria-label={`${inst.name_tr} sil`}
                          title="Enstrümanı Sil"
                          className="rounded-lg p-1.5 text-slate-500 hover:bg-red-50 hover:text-alert"
                        >
                          <Trash2 aria-hidden="true" className="size-4" />
                        </button>
                      </div>
                    </div>

                    {inst.image_url && (
                      <figure
                        role="img"
                        aria-label={`${inst.code} — ${inst.name_tr} ürün görseli`}
                        className="mt-3 h-32 w-full rounded-xl border border-slate-100 bg-slate-50 bg-contain bg-center bg-no-repeat"
                        style={{ backgroundImage: `url(${inst.image_url})` }}
                      />
                    )}

                    <h3 className="mt-3 text-base font-bold text-navy">{inst.name_tr}</h3>
                    <p className="text-xs italic text-slate-500">{inst.name_en}</p>
                  </header>

                  <p className="my-3 text-sm leading-relaxed text-slate-700">{inst.clinical_usage_description}</p>

                  <footer className="space-y-2.5 border-t border-slate-100 pt-3 text-xs">
                    <dl className="grid grid-cols-3 gap-2 rounded-xl bg-slate-50 p-2.5 text-center">
                      <div>
                        <dt className="text-[11px] text-slate-500">Şaft Çapı</dt>
                        <dd className="font-semibold text-navy">{formatShaftDiameter(inst)}</dd>
                      </div>
                      <div>
                        <dt className="text-[11px] text-slate-500">Maks. Ömür</dt>
                        <dd className="font-semibold text-emerald-700">{inst.default_max_uses === 1 ? 'Tek kull.' : `${inst.default_max_uses} Can`}</dd>
                      </div>
                      <div>
                        <dt className="text-[11px] text-slate-500">Liste / Can Başı</dt>
                        <dd className="font-semibold text-navy">
                          {fmtUSD(inst.unit_list_price_usd)} <span className="text-emerald-700">({fmtUSD(perUse, 0)}/can)</span>
                        </dd>
                      </div>
                    </dl>

                    {inst.typical_branches && (
                      <p className="text-slate-600">
                        <strong>Tipik branşlar:</strong> {inst.typical_branches}
                      </p>
                    )}

                    {(inst.sut_code || inst.tender_spec_notes || inst.competitor_comparison) && (
                      <div className="space-y-1.5 rounded-xl border border-sky-100 bg-sky-50/50 p-2.5">
                        {inst.sut_code && (
                          <p className="flex items-center gap-1.5 font-medium text-navy">
                            <FileCheck2 aria-hidden="true" className="size-3.5 shrink-0 text-medical" />
                            <span>
                              <strong>SUT / ÜTS:</strong> <span className="font-mono">{inst.sut_code}</span>
                            </span>
                          </p>
                        )}
                        {inst.tender_spec_notes && (
                          <p className="text-slate-700">
                            <strong className="text-navy">Şartname Notu:</strong> {inst.tender_spec_notes}
                          </p>
                        )}
                        {inst.competitor_comparison && (
                          <p className="flex items-start gap-1 text-emerald-800">
                            <Sparkles aria-hidden="true" className="mt-0.5 size-3.5 shrink-0" />
                            <span>
                              <strong>Avantaj:</strong> {inst.competitor_comparison}
                            </span>
                          </p>
                        )}
                      </div>
                    )}
                  </footer>
                </Card>
              </li>
            );
          })}
        </ul>
      )}

      <InstrumentEditModal open={editModal.open} onClose={() => setEditModal({ open: false, instrument: null })} instrument={editModal.instrument} />
      <SpecialtyPresetModal open={presetModal.open} onClose={() => setPresetModal({ open: false, preset: null })} preset={presetModal.preset} />
    </>
  );
}
