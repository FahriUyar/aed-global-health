import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Bot, Columns3, Download, Pencil, Plus, Search, Table2, Trash2 } from 'lucide-react';
import { useCRM } from '../context/CRMContext';
import { useDocumentMeta } from '../hooks/useDocumentMeta';
import { Badge, Card, EmptyState, PageHeader, SelectField, TextField, btn } from '../components/ui';
import { HospitalModal } from '../components/modals/HospitalModal';
import { useToast } from '../components/ui/Toast';
import { HOSPITAL_TYPES, PIPELINE_STAGES, type Hospital, type PipelineStage } from '../types/database';
import { cn, downloadCSV, stageStyle, todayISO, weeklyCases } from '../lib/domain';

export default function Hospitals() {
  useDocumentMeta('Türkiye Hastane & İstihbarat Haritası', '81 ildeki hedef hastaneler, Da Vinci istihbaratı, haftalık robotik vaka potansiyeli ve pipeline yönetimi.');
  const { data, updateHospital, deleteHospital } = useCRM();
  const { notify } = useToast();

  const [q, setQ] = useState('');
  const [city, setCity] = useState('Tümü');
  const [type, setType] = useState('Tümü');
  const [stage, setStage] = useState('Tümü');
  const [onlyDavinci, setOnlyDavinci] = useState(false);
  const [onlyToumai, setOnlyToumai] = useState(false);
  const [view, setView] = useState<'table' | 'kanban'>('table');
  const [editing, setEditing] = useState<Hospital | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [dragId, setDragId] = useState<string | null>(null);

  const cities = useMemo(() => ['Tümü', ...Array.from(new Set(data.hospitals.map((h) => h.city))).sort((a, b) => a.localeCompare(b, 'tr'))], [data.hospitals]);

  const filtered = useMemo(() => {
    const term = q.trim().toLocaleLowerCase('tr');
    return data.hospitals.filter((h) => {
      if (city !== 'Tümü' && h.city !== city) return false;
      if (type !== 'Tümü' && h.hospital_type !== type) return false;
      if (stage !== 'Tümü' && h.pipeline_stage !== stage) return false;
      if (onlyDavinci && !h.has_davinci) return false;
      if (onlyToumai && !h.toumai_installed) return false;
      if (term && !`${h.name} ${h.city} ${h.district ?? ''} ${h.general_notes ?? ''}`.toLocaleLowerCase('tr').includes(term)) return false;
      return true;
    });
  }, [data.hospitals, q, city, type, stage, onlyDavinci, onlyToumai]);

  const exportCSV = () => {
    downloadCSV(
      `hastaneler-${todayISO()}.csv`,
      ['Şehir', 'İlçe', 'Hastane Adı', 'Tip', 'Pipeline Aşaması', 'Edinim Modeli', 'Toumai Kurulu', 'Da Vinci Var', 'Da Vinci Notu', 'Haftalık Üroloji', 'Haftalık Genel Cerrahi', 'Haftalık Jinekoloji', 'Haftalık Göğüs/Ped.', 'Toplam Haftalık Vaka'],
      filtered.map((h) => [
        h.city,
        h.district,
        h.name,
        h.hospital_type,
        h.pipeline_stage,
        h.acquisition_model,
        h.toumai_installed,
        h.has_davinci,
        h.davinci_model,
        h.weekly_urology_cases,
        h.weekly_general_surgery_cases,
        h.weekly_gynecology_cases,
        h.weekly_thoracic_cases,
        weeklyCases(h),
      ]),
    );
    notify(`${filtered.length} hastane CSV olarak indirildi.`);
  };

  const changeStage = async (h: Hospital, nextStage: PipelineStage) => {
    if (h.pipeline_stage === nextStage) return;
    await updateHospital(h.id, {
      pipeline_stage: nextStage,
      toumai_installed: nextStage === 'Kurulum Yapıldı (Aktif Sarf Müşterisi)' ? true : h.toumai_installed,
    });
    notify(`${h.name} → ${nextStage}`);
  };

  return (
    <>
      <PageHeader
        title="Türkiye Hastane & İstihbarat Haritası"
        subtitle={`${filtered.length} / ${data.hospitals.length} hastane gösteriliyor · Toplam haftalık potansiyel: ${filtered.reduce((s, h) => s + weeklyCases(h), 0)} vaka`}
        actions={
          <>
            <button type="button" className={btn('secondary')} onClick={exportCSV}>
              <Download aria-hidden="true" className="size-4" /> CSV İndir
            </button>
            <button
              type="button"
              className={btn('primary')}
              onClick={() => {
                setEditing(null);
                setModalOpen(true);
              }}
            >
              <Plus aria-hidden="true" className="size-4" /> Yeni Hastane
            </button>
          </>
        }
      />

      <Card className="mb-5 p-4" aria-label="Filtreler">
        <form onSubmit={(e) => e.preventDefault()} className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <TextField label="Ara" id="f-q" type="search" placeholder="Hastane, şehir, not…" value={q} onChange={(e) => setQ(e.target.value)} />
          <SelectField label="Şehir" id="f-city" options={cities} value={city} onChange={(e) => setCity(e.target.value)} />
          <SelectField label="Hastane Tipi" id="f-type" options={['Tümü', ...HOSPITAL_TYPES]} value={type} onChange={(e) => setType(e.target.value)} />
          <SelectField label="Pipeline Aşaması" id="f-stage" options={['Tümü', ...PIPELINE_STAGES]} value={stage} onChange={(e) => setStage(e.target.value)} />
        </form>
        <footer className="mt-3 flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-3">
          <fieldset className="flex flex-wrap items-center gap-2">
            <legend className="sr-only">Hızlı filtreler</legend>
            <button
              type="button"
              aria-pressed={onlyDavinci}
              onClick={() => setOnlyDavinci((v) => !v)}
              className={cn('rounded-full px-3 py-1.5 text-xs font-medium ring-1 ring-inset transition', onlyDavinci ? 'bg-red-600 text-white ring-red-600' : 'bg-white text-slate-700 ring-slate-300 hover:bg-slate-50')}
            >
              Sadece Da Vinci Olanları Göster
            </button>
            <button
              type="button"
              aria-pressed={onlyToumai}
              onClick={() => setOnlyToumai((v) => !v)}
              className={cn('rounded-full px-3 py-1.5 text-xs font-medium ring-1 ring-inset transition', onlyToumai ? 'bg-emerald-600 text-white ring-emerald-600' : 'bg-white text-slate-700 ring-slate-300 hover:bg-slate-50')}
            >
              Sadece Toumai® Kurulu Olanları Göster
            </button>
          </fieldset>
          <nav aria-label="Görünüm seçimi" className="inline-flex rounded-lg border border-slate-300 p-0.5">
            <button type="button" aria-pressed={view === 'table'} onClick={() => setView('table')} className={cn('inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-medium', view === 'table' ? 'bg-navy text-white' : 'text-slate-700')}>
              <Table2 aria-hidden="true" className="size-3.5" /> Tablo
            </button>
            <button type="button" aria-pressed={view === 'kanban'} onClick={() => setView('kanban')} className={cn('inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-medium', view === 'kanban' ? 'bg-navy text-white' : 'text-slate-700')}>
              <Columns3 aria-hidden="true" className="size-3.5" /> Kanban
            </button>
          </nav>
        </footer>
      </Card>

      {filtered.length === 0 ? (
        <EmptyState title="Filtrelere uyan hastane bulunamadı" icon={<Search aria-hidden="true" className="size-8 text-slate-400" />}>
          Filtreleri temizleyin veya yeni bir hastane ekleyin.
        </EmptyState>
      ) : view === 'table' ? (
        <Card className="overflow-x-auto">
          <table className="w-full min-w-[780px] text-left text-sm">
            <thead className="border-b border-slate-200 bg-slate-50 text-xs font-semibold uppercase tracking-wide text-slate-600">
              <tr>
                <th scope="col" className="px-4 py-3">Hastane</th>
                <th scope="col" className="px-4 py-3">Şehir / Tip</th>
                <th scope="col" className="px-4 py-3">Pipeline Aşaması</th>
                <th scope="col" className="px-4 py-3">Robot Durumu</th>
                <th scope="col" className="px-4 py-3">Haftalık Vaka (Ü/GC/J/G)</th>
                <th scope="col" className="px-4 py-3 text-right">İşlem</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.map((h) => (
                <tr key={h.id} className="hover:bg-slate-50/70">
                  <td className="px-4 py-3">
                    <Link to={`/hospitals/${h.id}`} className="font-semibold text-navy hover:text-medical hover:underline">
                      {h.name}
                    </Link>
                    {h.acquisition_model !== 'Belirsiz' && <small className="block text-xs text-slate-500">{h.acquisition_model}</small>}
                  </td>
                  <td className="px-4 py-3">
                    <span className="font-medium text-slate-800">{h.city}</span>
                    {h.district && <span className="text-slate-500"> · {h.district}</span>}
                    <small className="block text-xs text-slate-500">{h.hospital_type}</small>
                  </td>
                  <td className="px-4 py-3">
                    <select
                      aria-label={`${h.name} pipeline aşaması`}
                      value={h.pipeline_stage}
                      onChange={(e) => changeStage(h, e.target.value as PipelineStage)}
                      className={cn('rounded-full border-0 px-2.5 py-1 text-xs font-medium ring-1 ring-inset ring-black/10', stageStyle[h.pipeline_stage])}
                    >
                      {PIPELINE_STAGES.map((s) => (
                        <option key={s} value={s}>
                          {s}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="space-x-1 px-4 py-3">
                    {h.toumai_installed && (
                      <Badge className="bg-emerald-100 text-emerald-800">
                        <Bot aria-hidden="true" className="size-3.5" /> Toumai® Kurulu
                      </Badge>
                    )}
                    {h.has_davinci && (
                      <Badge className="bg-red-50 text-red-700" title={h.davinci_model ?? undefined}>
                        Da Vinci
                      </Badge>
                    )}
                    {!h.toumai_installed && !h.has_davinci && <span className="text-xs text-slate-400">Robot yok</span>}
                  </td>
                  <td className="px-4 py-3 font-mono text-xs text-slate-700">
                    <strong className="font-sans text-sm text-navy">{weeklyCases(h)}</strong> ({h.weekly_urology_cases}/{h.weekly_general_surgery_cases}/{h.weekly_gynecology_cases}/{h.weekly_thoracic_cases})
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button
                      type="button"
                      aria-label={`${h.name} düzenle`}
                      onClick={() => {
                        setEditing(h);
                        setModalOpen(true);
                      }}
                      className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100 hover:text-slate-900"
                    >
                      <Pencil aria-hidden="true" className="size-4" />
                    </button>
                    <button
                      type="button"
                      aria-label={`${h.name} sil`}
                      onClick={async () => {
                        if (!confirm(`${h.name} ve bağlı tüm kayıtlar silinsin mi?`)) return;
                        await deleteHospital(h.id);
                        notify('Hastane silindi.');
                      }}
                      className="rounded-lg p-1.5 text-slate-500 hover:bg-red-50 hover:text-alert"
                    >
                      <Trash2 aria-hidden="true" className="size-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      ) : (
        <section aria-label="Pipeline panosu" className="grid gap-3 overflow-x-auto pb-2 md:grid-cols-2 xl:grid-cols-4">
          {PIPELINE_STAGES.map((st) => {
            const list = filtered.filter((h) => h.pipeline_stage === st);
            return (
              <section
                key={st}
                aria-label={st}
                onDragOver={(e) => e.preventDefault()}
                onDrop={() => {
                  const h = data.hospitals.find((x) => x.id === dragId);
                  setDragId(null);
                  if (h) void changeStage(h, st);
                }}
                className="flex flex-col rounded-2xl border border-slate-200 bg-slate-100/70 p-3"
              >
                <header className="mb-2 flex items-center justify-between gap-2 px-1">
                  <h2 className="text-xs font-bold uppercase tracking-wide text-slate-700">{st}</h2>
                  <Badge className="bg-white text-slate-700">{list.length}</Badge>
                </header>
                <ul className="space-y-2">
                  {list.map((h) => (
                    <li
                      key={h.id}
                      draggable
                      onDragStart={() => setDragId(h.id)}
                      className="cursor-grab rounded-xl border border-slate-200 bg-white p-3 shadow-xs active:cursor-grabbing"
                    >
                      <article>
                        <Link to={`/hospitals/${h.id}`} className="font-semibold text-navy hover:text-medical hover:underline">
                          {h.name}
                        </Link>
                        <p className="mt-0.5 text-xs text-slate-500">
                          {h.city} · {h.hospital_type} · <strong>{weeklyCases(h)} vaka/hf</strong>
                        </p>
                        <p className="mt-2 flex flex-wrap gap-1">
                          {h.toumai_installed && <Badge className="bg-emerald-100 text-emerald-800">Toumai®</Badge>}
                          {h.has_davinci && <Badge className="bg-red-50 text-red-700">Da Vinci</Badge>}
                        </p>
                        <select
                          aria-label={`${h.name} aşama değiştir`}
                          value={h.pipeline_stage}
                          onChange={(e) => changeStage(h, e.target.value as PipelineStage)}
                          className="mt-2 w-full rounded-lg border border-slate-200 bg-slate-50 px-2 py-1 text-xs text-slate-700"
                        >
                          {PIPELINE_STAGES.map((s) => (
                            <option key={s} value={s}>
                              {s}
                            </option>
                          ))}
                        </select>
                      </article>
                    </li>
                  ))}
                </ul>
              </section>
            );
          })}
        </section>
      )}

      <HospitalModal open={modalOpen} onClose={() => setModalOpen(false)} hospital={editing} />
    </>
  );
}
