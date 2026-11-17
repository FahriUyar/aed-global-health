import { useMemo, useState } from 'react';
import { Bot, DollarSign, Hourglass, Percent, Printer, TrendingDown } from 'lucide-react';
import { useCRM } from '../context/CRMContext';
import { useDocumentMeta } from '../hooks/useDocumentMeta';
import { Badge, Card, PageHeader, SelectField, TextField, btn } from '../components/ui';
import { CASE_SETS, averageReusableLife, cn, fmtNum, fmtTRY, fmtUSD, todayISO } from '../lib/domain';

type Model = 'capex' | 'reagent';

export default function RoiCalculator() {
  useDocumentMeta('Canlı ROI & Maliyet Avantajı Simülatörü', 'Toumai® MT-1000 ile Da Vinci X/Xi arasındaki yıllık ve 5 yıllık sarf, enstrüman ömrü ve toplam sahip olma maliyeti karşılaştırması.');
  const { data } = useCRM();

  const [selectedHospId, setSelectedHospId] = useState<string>('');
  const [hospitalTitle, setHospitalTitle] = useState('Örnek Şehir / Üniversite Hastanesi');
  const [uro, setUro] = useState(15);
  const [gs, setGs] = useState(10);
  const [gyn, setGyn] = useState(10);
  const [model, setModel] = useState<Model>('capex');
  const [davinciPerCase, setDavinciPerCase] = useState(2650);
  const [toumaiPerCase, setToumaiPerCase] = useState(1450);
  const [capexDiff, setCapexDiff] = useState(450000); // Yatırım / geri dönüş hesabı için baz tutar ($)
  const [usdTry, setUsdTry] = useState(38.5);

  const loadHospital = (id: string) => {
    setSelectedHospId(id);
    const h = data.hospitals.find((x) => x.id === id);
    if (!h) return;
    setHospitalTitle(`${h.name} (${h.city})`);
    setUro(Math.max(1, (h.weekly_urology_cases || 3) * 4));
    setGs(Math.max(1, (h.weekly_general_surgery_cases || 2) * 4));
    setGyn(Math.max(1, (h.weekly_gynecology_cases || 2) * 4));
    if (h.acquisition_model === 'Sarf Karşılığı Kurulum (Konsinye)') setModel('reagent');
  };

  const calc = useMemo(() => {
    const monthlyCases = uro + gs + gyn;
    const annualCases = monthlyCases * 12;

    // Branş ağırlıklı ortalama yeniden kullanılabilir enstrüman ömrü (Toumai 12-20 can vs Da Vinci 10 can)
    const uroLife = averageReusableLife(CASE_SETS[0], data.catalog);
    const gsLife = averageReusableLife(CASE_SETS[1], data.catalog);
    const gynLife = averageReusableLife(CASE_SETS[2], data.catalog);
    const weightedToumaiLife = monthlyCases > 0 ? (uro * uroLife + gs * gsLife + gyn * gynLife) / monthlyCases : 16.5;
    const davinciLife = 10;

    // Bir ameliyatta ortalama 4 yeniden kullanılabilir kol enstrümanı açılır
    const armsPerCase = 4;
    const annualInstrumentUses = annualCases * armsPerCase;
    const davinciBoxes = Math.ceil(annualInstrumentUses / davinciLife);
    const toumaiBoxes = Math.ceil(annualInstrumentUses / weightedToumaiLife);
    const boxReductionPct = davinciBoxes > 0 ? Math.round(((davinciBoxes - toumaiBoxes) / davinciBoxes) * 100) : 40;
    const savedBoxesPerYear = Math.max(0, davinciBoxes - toumaiBoxes);

    // Sarf maliyeti (konsinye modelde birim sarf fiyatına +%18 cihaz kullanım payı yansıtılır, peşin CAPEX = 0)
    const effectiveToumaiPerCase = model === 'reagent' ? Math.round(toumaiPerCase * 1.18) : toumaiPerCase;
    const annualDavinciUSD = annualCases * davinciPerCase;
    const annualToumaiUSD = annualCases * effectiveToumaiPerCase;
    const annualSavingsUSD = Math.max(0, annualDavinciUSD - annualToumaiUSD);
    const fiveYearSavingsUSD = annualSavingsUSD * 5;
    const monthlySavingsUSD = annualSavingsUSD / 12;
    const paybackMonths = model === 'reagent' ? 0 : monthlySavingsUSD > 0 ? Math.ceil(capexDiff / monthlySavingsUSD) : null;

    return {
      monthlyCases,
      annualCases,
      weightedToumaiLife,
      davinciBoxes,
      toumaiBoxes,
      boxReductionPct,
      savedBoxesPerYear,
      effectiveToumaiPerCase,
      annualDavinciUSD,
      annualToumaiUSD,
      annualSavingsUSD,
      fiveYearSavingsUSD,
      paybackMonths,
    };
  }, [uro, gs, gyn, model, davinciPerCase, toumaiPerCase, capexDiff, data.catalog]);

  const maxBar = Math.max(1, calc.annualDavinciUSD, calc.annualToumaiUSD);

  return (
    <>
      <PageHeader
        title="Canlı ROI & Maliyet Avantajı Simülatörü"
        subtitle="Toumai® MT-1000 vs. Da Vinci X/Xi · Satın alma ve başhekimlik sunumları için canlı karar destek aracı"
        actions={
          <button type="button" className={btn('primary')} onClick={() => window.print()}>
            <Printer aria-hidden="true" className="size-4" /> Bu Simülasyonu Hastane İçin Yazdır / PDF Özeti Al
          </button>
        }
      />

      {/* Yalnızca yazdırmada görünen kurumsal başlık */}
      <header className="print-only mb-4 border-b-2 border-slate-900 pb-3">
        <p className="text-xs font-semibold uppercase tracking-wider text-slate-600">AED Global Health · MicroPort® MedBot™ Türkiye Distribütörü</p>
        <h2 className="text-xl font-bold text-slate-900">Toumai® MT-1000 vs. Da Vinci — 5 Yıllık Maliyet ve Yatırım Getirisi (ROI) Özeti</h2>
        <p className="text-xs text-slate-600">
          Kurum: <strong>{hospitalTitle}</strong> · Tarih: {todayISO()} · Kur baz: 1 USD = {usdTry} TL
        </p>
      </header>

      <section className="grid gap-6 lg:grid-cols-12">
        {/* Girdi kontrolleri */}
        <Card className="space-y-4 p-5 lg:col-span-5" aria-labelledby="roi-in">
          <h2 id="roi-in" className="font-semibold text-navy">
            Hastane & Vaka Parametreleri
          </h2>

          <SelectField
            label="Kayıtlı Hastaneden Doldur (İsteğe Bağlı)"
            id="roi-h"
            className="no-print"
            options={[{ value: '', label: '— Manuel giriş —' }, ...data.hospitals.map((h) => ({ value: h.id, label: `${h.city} — ${h.name}` }))]}
            value={selectedHospId}
            onChange={(e) => loadHospital(e.target.value)}
          />
          <TextField label="Teklif Başlığında Görünecek Kurum Adı" id="roi-title" value={hospitalTitle} onChange={(e) => setHospitalTitle(e.target.value)} />

          <SliderRow id="s-uro" label="Aylık Üroloji Vaka Sayısı" value={uro} min={0} max={60} onChange={setUro} />
          <SliderRow id="s-gs" label="Aylık Genel Cerrahi Vaka Sayısı" value={gs} min={0} max={60} onChange={setGs} />
          <SliderRow id="s-gyn" label="Aylık Jinekoloji Vaka Sayısı" value={gyn} min={0} max={60} onChange={setGyn} />

          <fieldset>
            <legend className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-slate-600">Ticari Model Seçimi</legend>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                aria-pressed={model === 'capex'}
                onClick={() => setModel('capex')}
                className={cn('rounded-xl border p-3 text-left text-xs transition', model === 'capex' ? 'border-medical bg-sky-50 font-semibold text-navy ring-2 ring-medical/20' : 'border-slate-200 hover:bg-slate-50')}
              >
                <strong className="block">Doğrudan Demirbaş Satın Alma</strong>
                <span className="text-slate-600">En düşük vaka başı sarf maliyeti</span>
              </button>
              <button
                type="button"
                aria-pressed={model === 'reagent'}
                onClick={() => setModel('reagent')}
                className={cn('rounded-xl border p-3 text-left text-xs transition', model === 'reagent' ? 'border-medical bg-sky-50 font-semibold text-navy ring-2 ring-medical/20' : 'border-slate-200 hover:bg-slate-50')}
              >
                <strong className="block">Sarf Karşılığı Kurulum (Konsinye)</strong>
                <span className="text-slate-600">0 $ peşin demirbaş, vaka taahhütlü</span>
              </button>
            </div>
          </fieldset>

          <div className="grid gap-3 sm:grid-cols-2">
            <TextField
              label="Da Vinci Vaka Başı Sarf ($)"
              id="roi-dv"
              type="number"
              min={500}
              step={50}
              inputMode="numeric"
              value={davinciPerCase}
              onChange={(e) => setDavinciPerCase(Math.max(0, Number(e.target.value) || 0))}
            />
            <TextField
              label="Toumai® Baz Vaka Başı Sarf ($)"
              id="roi-tm"
              type="number"
              min={300}
              step={50}
              inputMode="numeric"
              value={toumaiPerCase}
              onChange={(e) => setToumaiPerCase(Math.max(0, Number(e.target.value) || 0))}
            />
            {model === 'capex' && (
              <TextField
                label="Amortisman Baz Yatırım ($)"
                id="roi-capex"
                type="number"
                min={50000}
                step={25000}
                inputMode="numeric"
                value={capexDiff}
                onChange={(e) => setCapexDiff(Math.max(0, Number(e.target.value) || 0))}
              />
            )}
            <TextField
              label="USD / TL Kuru"
              id="roi-fx"
              type="number"
              min={1}
              step="0.5"
              inputMode="decimal"
              value={usdTry}
              onChange={(e) => setUsdTry(Math.max(1, Number(e.target.value) || 1))}
            />
          </div>
        </Card>

        {/* Çıktı ve grafikler */}
        <section className="space-y-4 lg:col-span-7" aria-label="Simülasyon sonuçları">
          <div className="grid gap-3 sm:grid-cols-2">
            <Card as="article" className="border-emerald-200 bg-emerald-50/40 p-4">
              <span className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase text-emerald-800">
                <DollarSign aria-hidden="true" className="size-4" /> Yıllık Net Sarf Tasarrufu
              </span>
              <p className="mt-1 text-2xl font-extrabold text-emerald-700">{fmtUSD(calc.annualSavingsUSD)}</p>
              <p className="text-xs font-medium text-emerald-900">{fmtTRY(calc.annualSavingsUSD * usdTry)}</p>
            </Card>

            <Card as="article" className="border-sky-200 bg-sky-50/40 p-4">
              <span className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase text-sky-900">
                <TrendingDown aria-hidden="true" className="size-4" /> 5 Yıllık Toplam Döviz Tasarrufu
              </span>
              <p className="mt-1 text-2xl font-extrabold text-navy">{fmtUSD(calc.fiveYearSavingsUSD)}</p>
              <p className="text-xs font-medium text-sky-900">{fmtTRY(calc.fiveYearSavingsUSD * usdTry)}</p>
            </Card>

            <Card as="article" className="p-4">
              <span className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase text-slate-600">
                <Percent aria-hidden="true" className="size-4 text-medical" /> Enstrüman Kutu Tüketim Avantajı
              </span>
              <p className="mt-1 text-2xl font-extrabold text-navy">%{calc.boxReductionPct} Daha Az Kutu</p>
              <p className="text-xs text-slate-600">
                Yılda <strong>{calc.davinciBoxes}</strong> yerine <strong>{calc.toumaiBoxes}</strong> kutu ({calc.savedBoxesPerYear} kutu tasarruf · ort. {fmtNum(calc.weightedToumaiLife, 1)} can vs. 10 can)
              </p>
            </Card>

            <Card as="article" className="p-4">
              <span className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase text-slate-600">
                <Hourglass aria-hidden="true" className="size-4 text-amber-600" /> Yatırımın Geri Dönüş Süresi (Payback)
              </span>
              <p className="mt-1 text-2xl font-extrabold text-navy">
                {model === 'reagent' ? '0 Ay (Peşin Yatırım Yok)' : calc.paybackMonths ? `${calc.paybackMonths} Ay` : '—'}
              </p>
              <p className="text-xs text-slate-600">
                Aylık {calc.monthlyCases} vaka · yılda {calc.annualCases} robotik ameliyat baz alındı
              </p>
            </Card>
          </div>

          {/* Karşılaştırma çubukları */}
          <Card className="p-5" aria-labelledby="bar-h">
            <h3 id="bar-h" className="mb-3 font-semibold text-navy">
              Yıllık Sarf Maliyeti Karşılaştırması ({calc.annualCases} vaka/yıl)
            </h3>
            <div className="space-y-3 text-sm">
              <div>
                <p className="mb-1 flex justify-between">
                  <span className="font-medium text-slate-700">Rakip Da Vinci (10 can enstrüman ömrü · {fmtUSD(davinciPerCase)}/vaka)</span>
                  <strong className="text-red-700">{fmtUSD(calc.annualDavinciUSD)}</strong>
                </p>
                <span className="block h-4 w-full overflow-hidden rounded-full bg-slate-100">
                  <span className="block h-full rounded-full bg-red-500" style={{ width: `${(calc.annualDavinciUSD / maxBar) * 100}%` }} />
                </span>
              </div>
              <div>
                <p className="mb-1 flex justify-between">
                  <span className="font-medium text-slate-700">
                    Toumai® MT-1000 (12–20 can enstrüman ömrü · {fmtUSD(calc.effectiveToumaiPerCase)}/vaka)
                  </span>
                  <strong className="text-emerald-700">{fmtUSD(calc.annualToumaiUSD)}</strong>
                </p>
                <span className="block h-4 w-full overflow-hidden rounded-full bg-slate-100">
                  <span className="block h-full rounded-full bg-emerald-500" style={{ width: `${(calc.annualToumaiUSD / maxBar) * 100}%` }} />
                </span>
              </div>
            </div>

            <dl className="mt-4 grid gap-3 border-t border-slate-100 pt-4 text-xs sm:grid-cols-3">
              <div>
                <dt className="text-slate-500">Enstrüman Ömrü Avantajı</dt>
                <dd className="mt-0.5 font-semibold text-slate-800">Grasper & Klip: 20 can · Bipolar & İğne Tutucu: 16 can · Monopolar: 12 can</dd>
              </div>
              <div>
                <dt className="text-slate-500">Seçilen Ticari Model</dt>
                <dd className="mt-0.5 font-semibold text-slate-800">{model === 'capex' ? 'Doğrudan Demirbaş Satın Alma' : 'Sarf Karşılığı Kurulum (Konsinye)'}</dd>
              </div>
              <div>
                <dt className="text-slate-500">Servis & Yedek Parça</dt>
                <dd className="mt-0.5 font-semibold text-slate-800">AED Global Ankara 7/24 teknik servis · %95 uptime SLA</dd>
              </div>
            </dl>
          </Card>

          <Card className="p-4">
            <footer className="flex flex-wrap items-center justify-between gap-3">
              <p className="flex items-center gap-2 text-xs text-slate-600">
                <Bot aria-hidden="true" className="size-4 text-medical" />
                <span>
                  Hesaplama <strong>{hospitalTitle}</strong> için aylık {calc.monthlyCases} vaka ({uro} Üroloji, {gs} Genel Cerrahi, {gyn} Jinekoloji) üzerinden yapılmıştır.
                </span>
              </p>
              <Badge className="bg-emerald-100 text-emerald-800">5 yılda {fmtUSD(calc.fiveYearSavingsUSD)} avantaj</Badge>
            </footer>
          </Card>
        </section>
      </section>
    </>
  );
}

function SliderRow({ id, label, value, min, max, onChange }: { id: string; label: string; value: number; min: number; max: number; onChange: (v: number) => void }) {
  return (
    <div>
      <div className="mb-1 flex items-center justify-between">
        <label htmlFor={id} className="text-xs font-semibold uppercase tracking-wide text-slate-600">
          {label}
        </label>
        <output htmlFor={id} className="rounded-md bg-navy px-2 py-0.5 font-mono text-xs font-bold text-white">
          {value} vaka/ay
        </output>
      </div>
      <input
        id={id}
        type="range"
        min={min}
        max={max}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full accent-sky-600"
      />
    </div>
  );
}
