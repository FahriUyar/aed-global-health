import { useMemo, useState, type FormEvent } from 'react';
import { Calculator, Check, Plus, RotateCcw } from 'lucide-react';
import { Modal, TextField, SelectField, TextAreaField, Badge, btn } from '../ui';
import { useCRM } from '../../context/CRMContext';
import { useToast } from '../ui/Toast';
import { INSTRUMENT_CATEGORIES, SPECIALTY_TAGS, type InstrumentCatalogItem, type SpecialtyPreset } from '../../types/database';
import { caseSetCost, cn, DEFAULT_SPECIALTY_PRESETS, fmtUSD } from '../../lib/domain';

interface Props {
  open: boolean;
  onClose: () => void;
  instrument?: InstrumentCatalogItem | null;
}

const CUSTOM_CAT = '__custom__';
const PRESET_USES = [1, 10, 12, 16, 20, 30];
const PRESET_DIAMETERS = ['5 mm', '8 mm', '12 mm', 'Standart'];

export function InstrumentEditModal({ open, onClose, instrument }: Props) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      title={instrument ? `Enstrümanı Düzenle — ${instrument.code}` : 'Yeni Enstrüman / Sarf Ekle'}
      description="Fiyat, RFID can ömrü, SUT/ÜTS kodu, şartname maddesi ve klinik kullanım bilgilerini güncelleyin."
      size="xl"
    >
      <InstrumentForm instrument={instrument} onClose={onClose} />
    </Modal>
  );
}

function parseBranches(raw: string | null | undefined): { tags: Set<string>; extra: string } {
  if (!raw) return { tags: new Set(['Tüm Branşlar']), extra: '' };
  const parts = raw
    .split(',')
    .map((p) => p.trim())
    .filter(Boolean);
  const tags = new Set<string>();
  const extraParts: string[] = [];
  for (const part of parts) {
    const matched = SPECIALTY_TAGS.find((t) => part.toLocaleLowerCase('tr').startsWith(t.toLocaleLowerCase('tr')));
    if (matched) tags.add(matched);
    else extraParts.push(part);
  }
  return { tags, extra: extraParts.join(', ') };
}

function InstrumentForm({ instrument, onClose }: Omit<Props, 'open'>) {
  const { addInstrument, updateInstrument } = useCRM();
  const { notify } = useToast();

  const initialCatIsPreset = !instrument || (INSTRUMENT_CATEGORIES as readonly string[]).includes(instrument.category);
  const [code, setCode] = useState(instrument?.code ?? '');
  const [catSelect, setCatSelect] = useState<string>(
    instrument ? (initialCatIsPreset ? instrument.category : CUSTOM_CAT) : INSTRUMENT_CATEGORIES[0],
  );
  const [customCategory, setCustomCategory] = useState<string>(instrument && !initialCatIsPreset ? instrument.category : '');
  const [nameTr, setNameTr] = useState(instrument?.name_tr ?? '');
  const [nameEn, setNameEn] = useState(instrument?.name_en ?? '');
  const [shaftDiameter, setShaftDiameter] = useState(instrument?.shaft_diameter ?? `${instrument?.diameter_mm ?? 8} mm`);
  const [maxUses, setMaxUses] = useState<number>(instrument?.default_max_uses ?? 16);
  const [listPriceUsd, setListPriceUsd] = useState<number>(instrument?.unit_list_price_usd ?? 1800);
  const [description, setDescription] = useState(instrument?.clinical_usage_description ?? '');
  const initialBranches = useMemo(() => parseBranches(instrument?.typical_branches), [instrument]);
  const [selectedTags, setSelectedTags] = useState<Set<string>>(initialBranches.tags);
  const [extraBranchNote, setExtraBranchNote] = useState(initialBranches.extra);
  const [sutCode, setSutCode] = useState(instrument?.sut_code ?? '');
  const [tenderNotes, setTenderNotes] = useState(instrument?.tender_spec_notes ?? '');
  const [competitorNotes, setCompetitorNotes] = useState(instrument?.competitor_comparison ?? '');
  const [imageUrl, setImageUrl] = useState(instrument?.image_url ?? '');
  const [saving, setSaving] = useState(false);

  const perUseUsd = listPriceUsd / Math.max(1, maxUses);

  const toggleTag = (tag: string) =>
    setSelectedTags((prev) => {
      const next = new Set(prev);
      if (next.has(tag)) next.delete(tag);
      else next.add(tag);
      return next;
    });

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    const cleanCode = code.trim().toUpperCase();
    if (!cleanCode) return notify('Katalog kodu zorunludur.', 'error');
    if (!nameTr.trim()) return notify('Türkçe ürün adı zorunludur.', 'error');
    const finalCategory = (catSelect === CUSTOM_CAT ? customCategory : catSelect).trim();
    if (!finalCategory) return notify('Kategori seçin veya yazın.', 'error');
    if (imageUrl.trim() && !/^https:\/\//i.test(imageUrl.trim())) {
      return notify('Görsel bağlantısı güvenlik gereği https:// ile başlamalıdır.', 'error');
    }

    const branchList = [...Array.from(selectedTags), ...(extraBranchNote.trim() ? [extraBranchNote.trim()] : [])].join(', ');
    const parsedDiameter = Number.parseFloat(shaftDiameter.replace(',', '.'));

    const payload: InstrumentCatalogItem = {
      code: cleanCode,
      name_tr: nameTr.trim(),
      name_en: nameEn.trim() || nameTr.trim(),
      category: finalCategory,
      shaft_diameter: shaftDiameter.trim() || '8 mm',
      diameter_mm: Number.isFinite(parsedDiameter) && parsedDiameter > 0 ? parsedDiameter : 8,
      default_max_uses: Math.max(1, Math.round(Number(maxUses) || 1)),
      unit_list_price_usd: Math.max(0, Number(listPriceUsd) || 0),
      clinical_usage_description: description.trim() || `${nameTr.trim()} robotik cerrahi enstrümanı.`,
      typical_branches: branchList || null,
      sut_code: sutCode.trim() || null,
      tender_spec_notes: tenderNotes.trim() || null,
      competitor_comparison: competitorNotes.trim() || null,
      image_url: imageUrl.trim() || null,
    };

    setSaving(true);
    try {
      if (instrument) {
        await updateInstrument(instrument.code, payload);
        notify(`${payload.code} — ${payload.name_tr} güncellendi.`);
      } else {
        await addInstrument(payload);
        notify(`${payload.code} — ${payload.name_tr} kataloğa eklendi.`);
      }
      onClose();
    } catch {
      /* hata bildirimi CRMContext tarafından gösterilir */
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={submit} className="space-y-5">
      {/* 1. Kimlik ve Kategori */}
      <fieldset className="grid gap-4 sm:grid-cols-2">
        <legend className="mb-2 text-sm font-semibold text-navy">Ürün Kimliği & Kategori</legend>
        <TextField
          label="Katalog Kodu (code) *"
          id="ie-code"
          required
          value={code}
          onChange={(e) => setCode(e.target.value.toUpperCase())}
          placeholder="Örn: IN8031, DRAPE-SET"
          hint="Kodu değiştirirseniz hastane stokları ve vaka setleri de otomatik güncellenir"
        />
        <SelectField
          label="Kategori *"
          id="ie-cat"
          options={[...INSTRUMENT_CATEGORIES.map((c) => ({ value: c, label: c })), { value: CUSTOM_CAT, label: '+ Özel Kategori Yaz…' }]}
          value={catSelect}
          onChange={(e) => setCatSelect(e.target.value)}
        />
        {catSelect === CUSTOM_CAT && (
          <TextField
            label="Özel Kategori Adı *"
            id="ie-custom-cat"
            required
            className="sm:col-span-2"
            value={customCategory}
            onChange={(e) => setCustomCategory(e.target.value)}
            placeholder="Örn: Trokar & Kanül Sistemi, Stapler, Kamera Aksesuarı"
          />
        )}
        <TextField
          label="Türkçe Adı (name_tr) *"
          id="ie-nametr"
          required
          value={nameTr}
          onChange={(e) => setNameTr(e.target.value)}
          placeholder="Örn: Maryland Bipolar Penset"
        />
        <TextField
          label="İngilizce Orijinal Adı (name_en)"
          id="ie-nameen"
          value={nameEn}
          onChange={(e) => setNameEn(e.target.value)}
          placeholder="Örn: Maryland Bipolar Forceps"
        />
      </fieldset>

      {/* 2. Teknik Ömür, Şaft Çapı ve Fiyatlandırma */}
      <fieldset className="rounded-2xl border border-sky-200 bg-sky-50/50 p-4">
        <legend className="px-1 text-sm font-semibold text-navy">Şaft Çapı, RFID Can Ömrü & Fiyat Hesaplama</legend>
        <div className="grid gap-4 sm:grid-cols-3">
          <div>
            <TextField
              label="Şaft Çapı (shaft_diameter)"
              id="ie-diam"
              value={shaftDiameter}
              onChange={(e) => setShaftDiameter(e.target.value)}
              placeholder="8 mm"
            />
            <div className="mt-1.5 flex flex-wrap gap-1">
              {PRESET_DIAMETERS.map((d) => (
                <button
                  key={d}
                  type="button"
                  onClick={() => setShaftDiameter(d)}
                  className={cn(
                    'rounded-md px-2 py-0.5 text-[11px] font-medium transition',
                    shaftDiameter === d ? 'bg-navy text-white' : 'bg-white text-slate-600 ring-1 ring-slate-200 hover:bg-slate-100',
                  )}
                >
                  {d}
                </button>
              ))}
            </div>
          </div>

          <div>
            <TextField
              label="Maks. Kullanım Ömrü / Can *"
              id="ie-uses"
              type="number"
              min={1}
              max={100}
              inputMode="numeric"
              required
              value={maxUses}
              onChange={(e) => setMaxUses(Math.max(1, Math.round(Number(e.target.value) || 1)))}
            />
            <div className="mt-1.5 flex flex-wrap gap-1">
              {PRESET_USES.map((u) => (
                <button
                  key={u}
                  type="button"
                  onClick={() => setMaxUses(u)}
                  className={cn(
                    'rounded-md px-2 py-0.5 text-[11px] font-medium transition',
                    maxUses === u ? 'bg-emerald-600 text-white' : 'bg-white text-slate-600 ring-1 ring-slate-200 hover:bg-slate-100',
                  )}
                >
                  {u === 1 ? '1 (Tek kull.)' : `${u} Can`}
                </button>
              ))}
            </div>
          </div>

          <div>
            <TextField
              label="Liste Satış Fiyatı ($ USD) *"
              id="ie-price"
              type="number"
              min={0}
              step="0.01"
              inputMode="decimal"
              required
              value={listPriceUsd}
              onChange={(e) => setListPriceUsd(Math.max(0, Number(e.target.value) || 0))}
            />
            <output
              htmlFor="ie-price ie-uses"
              className="mt-2 flex items-center justify-between rounded-xl border border-emerald-200 bg-white px-3 py-1.5 text-xs"
            >
              <span className="flex items-center gap-1 font-medium text-slate-600">
                <Calculator aria-hidden="true" className="size-3.5 text-emerald-600" /> Can Başına Maliyet:
              </span>
              <strong className="font-mono text-sm font-bold text-emerald-700">{fmtUSD(perUseUsd, 2)} / Can</strong>
            </output>
          </div>
        </div>
      </fieldset>

      {/* 3. Klinik Açıklama & Branş Etiketleri */}
      <fieldset className="space-y-3">
        <legend className="text-sm font-semibold text-navy">Klinik Görev & Branşlar</legend>
        <TextAreaField
          label="Klinik Açıklama ve Görevi (description) *"
          id="ie-desc"
          required
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Hangi ameliyatta, hangi dokuda ve hangi kolda nasıl kullanıldığını açıklayın…"
        />

        <div>
          <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-600">
            Tipik Branşlar (Çoklu Seçim)
          </span>
          <div className="flex flex-wrap gap-1.5">
            {SPECIALTY_TAGS.map((tag) => {
              const active = selectedTags.has(tag);
              return (
                <button
                  key={tag}
                  type="button"
                  aria-pressed={active}
                  onClick={() => toggleTag(tag)}
                  className={cn(
                    'inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-medium transition',
                    active ? 'bg-medical text-white shadow-xs' : 'bg-slate-100 text-slate-700 hover:bg-slate-200',
                  )}
                >
                  {active && <Check aria-hidden="true" className="size-3.5" />}
                  <span>{tag}</span>
                </button>
              );
            })}
          </div>
          <TextField
            label="Ek Branş / Vaka Sıklığı Notu (İsteğe Bağlı)"
            id="ie-branch-extra"
            className="mt-2"
            value={extraBranchNote}
            onChange={(e) => setExtraBranchNote(e.target.value)}
            placeholder="Örn: Her vakada açılır, En hızlı tükenen sarf"
          />
        </div>
      </fieldset>

      {/* 4. SUT / ÜTS, Teknik Şartname, Rakip Karşılaştırma ve Görsel */}
      <fieldset className="grid gap-4 sm:grid-cols-2">
        <legend className="mb-2 text-sm font-semibold text-navy">SUT / ÜTS, İhale Şartnamesi & Satış Argümanları</legend>
        <TextField
          label="SUT / ÜTS Barkod Kodu (sut_code)"
          id="ie-sut"
          value={sutCode}
          onChange={(e) => setSutCode(e.target.value)}
          placeholder="Örn: OR2040 / 869..."
        />
        <TextField
          label="Ürün Görseli Linki (image_url, https://)"
          id="ie-img"
          type="url"
          inputMode="url"
          value={imageUrl}
          onChange={(e) => setImageUrl(e.target.value)}
          placeholder="https://..."
        />
        <TextAreaField
          label="Teknik Şartname / Satış Argümanı Notu (tender_spec_notes)"
          id="ie-tender"
          value={tenderNotes}
          onChange={(e) => setTenderNotes(e.target.value)}
          placeholder="Şartnameye yazdırılacak kritik özellik (örn: En az 16 sterilizasyon döngüsü ömrüne sahip olmalı, 540° dönebilmeli…)"
        />
        <TextAreaField
          label="Da Vinci Muadili Karşılaştırma Notu (competitor_comparison)"
          id="ie-comp"
          value={competitorNotes}
          onChange={(e) => setCompetitorNotes(e.target.value)}
          placeholder="Örn: Da Vinci muadili 10 can iken Toumai 16 can (+%60 ekstra kullanım ömrü)"
        />
      </fieldset>

      <footer className="flex justify-end gap-2 border-t border-slate-200 pt-4">
        <button type="button" className={btn('secondary')} onClick={onClose}>
          Vazgeç
        </button>
        <button type="submit" className={btn('primary')} disabled={saving}>
          {saving ? 'Kaydediliyor…' : instrument ? 'Değişiklikleri Kaydet' : 'Kataloğa Ekle'}
        </button>
      </footer>
    </form>
  );
}

// ---------------------------------------------------------------------------
// Branşa Göre Hazır Vaka Seti Düzenleme Modalı
// ---------------------------------------------------------------------------
interface PresetModalProps {
  open: boolean;
  onClose: () => void;
  preset: SpecialtyPreset | null;
}

export function SpecialtyPresetModal({ open, onClose, preset }: PresetModalProps) {
  return (
    <Modal
      open={open && !!preset}
      onClose={onClose}
      title={preset ? `${preset.title} — Vaka Setini Özelleştir` : 'Vaka Setini Özelleştir'}
      description="Bu branş ameliyatında açılan enstrümanları ve vaka başı kullanım adetlerini seçin. Maliyet ve ROI simülatörü anında güncellenir."
      size="xl"
    >
      {preset && <PresetForm preset={preset} onClose={onClose} />}
    </Modal>
  );
}

function PresetForm({ preset, onClose }: { preset: SpecialtyPreset; onClose: () => void }) {
  const { data, specialtyPresets, updateSpecialtyPresets } = useCRM();
  const { notify } = useToast();

  const [title, setTitle] = useState(preset.title);
  const [procedures, setProcedures] = useState(preset.procedures);
  const [qtyByCode, setQtyByCode] = useState<Record<string, number>>(() => {
    const map: Record<string, number> = {};
    for (const it of preset.items) map[it.code] = Math.max(1, it.quantity);
    return map;
  });

  const draftPreset: SpecialtyPreset = useMemo(
    () => ({
      ...preset,
      title: title.trim() || preset.title,
      procedures: procedures.trim() || preset.procedures,
      items: Object.entries(qtyByCode)
        .filter(([, q]) => q > 0)
        .map(([code, quantity]) => ({ code, quantity })),
    }),
    [preset, title, procedures, qtyByCode],
  );

  const preview = useMemo(() => caseSetCost(draftPreset, data.catalog), [draftPreset, data.catalog]);

  const toggleCode = (code: string) =>
    setQtyByCode((prev) => {
      const next = { ...prev };
      if (next[code]) delete next[code];
      else next[code] = 1;
      return next;
    });

  const setQty = (code: string, qty: number) =>
    setQtyByCode((prev) => ({
      ...prev,
      [code]: Math.max(1, Math.min(20, Math.round(qty) || 1)),
    }));

  const resetOne = () => {
    const def = DEFAULT_SPECIALTY_PRESETS.find((p) => p.id === preset.id);
    if (!def) return;
    setTitle(def.title);
    setProcedures(def.procedures);
    const map: Record<string, number> = {};
    for (const it of def.items) map[it.code] = it.quantity;
    setQtyByCode(map);
  };

  const save = (e: FormEvent) => {
    e.preventDefault();
    if (draftPreset.items.length === 0) {
      return notify('Sette en az 1 enstrüman veya sarf malzeme seçilmelidir.', 'error');
    }
    const next = specialtyPresets.map((p) => (p.id === preset.id ? draftPreset : p));
    updateSpecialtyPresets(next);
    notify(`${draftPreset.title} güncellendi (${fmtUSD(preview.total, 0)} / vaka).`);
    onClose();
  };

  return (
    <form onSubmit={save} className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2">
        <TextField label="Set Başlığı" id="sp-title" required value={title} onChange={(e) => setTitle(e.target.value)} />
        <TextField label="Tipik Prosedürler / Ameliyatlar" id="sp-proc" required value={procedures} onChange={(e) => setProcedures(e.target.value)} />
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-emerald-200 bg-emerald-50/60 px-4 py-2.5 text-sm">
        <span>
          Seçili: <strong>{draftPreset.items.length} farklı kalem</strong> ({preview.totalUnits} toplam adet)
        </span>
        <span className="font-bold text-emerald-800">Canlı Vaka Başı Sarf Maliyeti: {fmtUSD(preview.total, 0)} / vaka</span>
      </div>

      <fieldset className="max-h-96 overflow-y-auto rounded-xl border border-slate-200">
        <legend className="sr-only">Setteki enstrümanlar</legend>
        <ul className="divide-y divide-slate-100">
          {data.catalog.map((inst) => {
            const selected = (qtyByCode[inst.code] ?? 0) > 0;
            const qty = qtyByCode[inst.code] ?? 1;
            const perUse = inst.unit_list_price_usd / Math.max(1, inst.default_max_uses);
            return (
              <li key={inst.code} className={cn('flex flex-wrap items-center gap-3 px-4 py-2.5 text-sm', selected && 'bg-sky-50/60')}>
                <input
                  id={`preset-item-${inst.code}`}
                  type="checkbox"
                  checked={selected}
                  onChange={() => toggleCode(inst.code)}
                  className="size-4 accent-sky-600"
                />
                <label htmlFor={`preset-item-${inst.code}`} className="min-w-0 flex-1 cursor-pointer">
                  <span className="font-mono text-xs font-bold text-navy">{inst.code}</span> · <strong className="text-slate-900">{inst.name_tr}</strong>
                  <small className="block text-xs text-slate-500">
                    {inst.category} · {inst.default_max_uses === 1 ? 'Tek kullanımlık' : `${inst.default_max_uses} can`} · {fmtUSD(perUse, 0)}/can
                  </small>
                </label>
                {selected && (
                  <div className="flex items-center gap-2">
                    <label htmlFor={`preset-qty-${inst.code}`} className="text-xs font-medium text-slate-600">
                      Adet:
                    </label>
                    <input
                      id={`preset-qty-${inst.code}`}
                      type="number"
                      min={1}
                      max={20}
                      inputMode="numeric"
                      value={qty}
                      onChange={(e) => setQty(inst.code, Number(e.target.value))}
                      className="w-16 rounded-lg border border-slate-300 bg-white px-2 py-1 text-center text-xs font-semibold text-navy"
                    />
                    <Badge className="bg-emerald-100 text-emerald-800">{fmtUSD(perUse * qty, 0)}</Badge>
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      </fieldset>

      <footer className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-200 pt-4">
        <button type="button" className={btn('secondary', 'sm')} onClick={resetOne}>
          <RotateCcw aria-hidden="true" className="size-3.5" /> Bu Seti Varsayılana Döndür
        </button>
        <div className="flex gap-2">
          <button type="button" className={btn('secondary')} onClick={onClose}>
            Vazgeç
          </button>
          <button type="submit" className={btn('primary')}>
            <Plus aria-hidden="true" className="size-4" /> Seti Kaydet
          </button>
        </div>
      </footer>
    </form>
  );
}
