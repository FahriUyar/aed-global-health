import { useMemo, useState } from 'react';
import { Layers, Search, Stethoscope } from 'lucide-react';
import { useCRM } from '../context/CRMContext';
import { useDocumentMeta } from '../hooks/useDocumentMeta';
import { Badge, Card, EmptyState, PageHeader, TextField } from '../components/ui';
import { INSTRUMENT_CATEGORIES } from '../types/database';
import { CASE_SETS, caseSetCost, cn, fmtUSD } from '../lib/domain';

export default function Catalog() {
  useDocumentMeta('Enstrüman Kataloğu & Klinik Rehber', 'Toumai® MT-1000 için 17 adet 8 mm robotik cerrahi enstrüman, tam sarf malzemeler ve branş vaka setleri.');
  const { data } = useCRM();
  const [cat, setCat] = useState<string>('Tümü');
  const [q, setQ] = useState('');
  const [activeSetId, setActiveSetId] = useState<string | null>(CASE_SETS[0].id);

  const activeSet = CASE_SETS.find((s) => s.id === activeSetId) ?? null;
  const setBreakdown = useMemo(() => (activeSet ? caseSetCost(activeSet, data.catalog) : null), [activeSet, data.catalog]);

  const categories = useMemo(
    () => ['Tümü', ...INSTRUMENT_CATEGORIES.filter((c) => data.catalog.some((i) => i.category === c))],
    [data.catalog],
  );

  const items = useMemo(() => {
    const term = q.trim().toLocaleLowerCase('tr');
    return data.catalog.filter((i) => {
      if (cat !== 'Tümü' && i.category !== cat) return false;
      if (term && !`${i.code} ${i.name_tr} ${i.name_en} ${i.clinical_usage_description} ${i.typical_branches ?? ''}`.toLocaleLowerCase('tr').includes(term)) return false;
      return true;
    });
  }, [data.catalog, cat, q]);

  return (
    <>
      <PageHeader
        title="Enstrüman Kataloğu ve Klinik Rehber"
        subtitle="Toumai® MT-1000 · 8 mm şaft çaplı RFID çipli cerrahi enstrümanlar ve tek kullanımlık sarf malzemeler"
      />

      {/* Branşa göre hazır vaka setleri */}
      <Card className="mb-6 p-5" aria-labelledby="set-h">
        <header className="mb-3 flex items-center gap-2">
          <Stethoscope aria-hidden="true" className="size-5 text-medical" />
          <h2 id="set-h" className="font-semibold text-navy">
            Branşa Göre Hazır Vaka Setleri
          </h2>
          <small className="ml-auto text-xs text-slate-500">Bir sete tıklayarak açılacak kombinasyonu ve vaka başı sarf maliyetini görün</small>
        </header>
        <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {CASE_SETS.map((s) => {
            const { total } = caseSetCost(s, data.catalog);
            const active = activeSetId === s.id;
            return (
              <li key={s.id}>
                <button
                  type="button"
                  aria-pressed={active}
                  onClick={() => setActiveSetId(active ? null : s.id)}
                  className={cn(
                    'flex h-full w-full flex-col justify-between rounded-xl border p-3.5 text-left transition',
                    active ? 'border-medical bg-sky-50/70 ring-2 ring-medical/25' : 'border-slate-200 hover:bg-slate-50',
                  )}
                >
                  <div>
                    <strong className="block text-sm text-navy">{s.title}</strong>
                    <span className="mt-0.5 block text-xs text-slate-600">{s.procedures}</span>
                  </div>
                  <p className="mt-3 flex items-baseline justify-between border-t border-slate-200/80 pt-2 text-xs">
                    <span className="text-slate-500">{s.codes.length} kalem</span>
                    <strong className="text-sm text-emerald-700">{fmtUSD(total, 0)} / vaka</strong>
                  </p>
                </button>
              </li>
            );
          })}
        </ul>

        {activeSet && setBreakdown && (
          <section aria-label={`${activeSet.title} kombinasyonu`} className="mt-4 rounded-xl border border-sky-200 bg-white p-4">
            <header className="mb-2 flex flex-wrap items-center justify-between gap-2">
              <h3 className="text-sm font-semibold text-navy">
                {activeSet.title} — {activeSet.procedures}
              </h3>
              <p className="text-sm">
                Vaka başı toplam sarf maliyeti: <strong className="text-lg text-emerald-700">{fmtUSD(setBreakdown.total, 0)}</strong>
              </p>
            </header>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="border-b border-slate-200 text-slate-500">
                  <tr>
                    <th scope="col" className="py-1.5 pr-3">Kod</th>
                    <th scope="col" className="py-1.5 pr-3">Enstrüman / Sarf</th>
                    <th scope="col" className="py-1.5 pr-3">Ömür</th>
                    <th scope="col" className="py-1.5 pr-3">Liste Fiyatı</th>
                    <th scope="col" className="py-1.5 text-right">Vaka Başı Maliyet</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {setBreakdown.lines.map(({ instrument: inst, perCase }) => (
                    <tr key={inst.code}>
                      <td className="py-1.5 pr-3 font-mono text-slate-600">{inst.code}</td>
                      <td className="py-1.5 pr-3 font-medium text-slate-900">{inst.name_tr}</td>
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
          <TextField label="Katalogda Ara" id="cat-q" type="search" placeholder="Kod (IN8036), Türkçe/İngilizce ad, branş veya klinik kullanım…" value={q} onChange={(e) => setQ(e.target.value)} className="lg:w-80" />
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
      ) : (
        <ul className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {items.map((inst) => {
            const perUse = inst.unit_list_price_usd / Math.max(1, inst.default_max_uses);
            const inActiveSet = activeSet?.codes.includes(inst.code);
            return (
              <li key={inst.code}>
                <Card as="article" className={cn('flex h-full flex-col justify-between p-5', inActiveSet && 'border-medical ring-2 ring-medical/20')}>
                  <header>
                    <div className="flex items-center justify-between gap-2">
                      <span className="rounded-lg bg-navy px-2.5 py-1 font-mono text-xs font-bold text-white">{inst.code}</span>
                      <Badge className="bg-sky-50 text-sky-800">
                        <Layers aria-hidden="true" className="size-3" /> {inst.category}
                      </Badge>
                    </div>
                    <h3 className="mt-3 text-base font-bold text-navy">{inst.name_tr}</h3>
                    <p className="text-xs italic text-slate-500">{inst.name_en}</p>
                  </header>

                  <p className="my-3 text-sm leading-relaxed text-slate-700">{inst.clinical_usage_description}</p>

                  <footer className="space-y-2 border-t border-slate-100 pt-3 text-xs">
                    <dl className="grid grid-cols-3 gap-2 rounded-xl bg-slate-50 p-2.5 text-center">
                      <div>
                        <dt className="text-[11px] text-slate-500">Şaft Çapı</dt>
                        <dd className="font-semibold text-navy">{inst.diameter_mm} mm</dd>
                      </div>
                      <div>
                        <dt className="text-[11px] text-slate-500">Maks. Ömür</dt>
                        <dd className="font-semibold text-emerald-700">{inst.default_max_uses === 1 ? 'Tek kull.' : `${inst.default_max_uses} Can`}</dd>
                      </div>
                      <div>
                        <dt className="text-[11px] text-slate-500">Liste / Can</dt>
                        <dd className="font-semibold text-navy">
                          {fmtUSD(inst.unit_list_price_usd)} <span className="text-slate-500">({fmtUSD(perUse, 0)})</span>
                        </dd>
                      </div>
                    </dl>
                    {inst.typical_branches && (
                      <p className="text-slate-600">
                        <strong>Tipik branşlar:</strong> {inst.typical_branches}
                      </p>
                    )}
                  </footer>
                </Card>
              </li>
            );
          })}
        </ul>
      )}
    </>
  );
}
