import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { AlertTriangle, CheckCircle2, Circle, Clock, Crown, MapPin, MessageCircle, Phone, Printer, Route as RouteIcon } from 'lucide-react';
import { useCRM } from '../context/CRMContext';
import { useDocumentMeta } from '../hooks/useDocumentMeta';
import { Badge, Card, EmptyState, PageHeader, btn } from '../components/ui';
import { attitudeStyle, cn, fmtDate, forecastInventory, stageStyle, whatsappLink } from '../lib/domain';

const PRESET_TOURS: { label: string; cities: string[] }[] = [
  { label: 'Çukurova & Güneydoğu Turu', cities: ['Adana', 'Mersin', 'Gaziantep'] },
  { label: 'İç Anadolu Turu', cities: ['Ankara', 'Kayseri', 'Konya'] },
  { label: 'Ege & Marmara Turu', cities: ['İzmir', 'Bursa', 'İstanbul'] },
];

const LS_CHECK = 'aedcrm:route-checklist:v1';

export default function RoutePlanner() {
  useDocumentMeta('Şehir Dışı Seyahat & Rota Planlayıcı', 'Gideceğiniz şehirlerdeki hastaneler, kilit hocaların uygun ziyaret saatleri ve depolarda eksilen sarf malzemeler.');
  const { data, toggleVisitAction } = useCRM();

  const allCities = useMemo(
    () => Array.from(new Set(data.hospitals.map((h) => h.city))).sort((a, b) => a.localeCompare(b, 'tr')),
    [data.hospitals],
  );
  const [selectedCities, setSelectedCities] = useState<string[]>(() => {
    const cukurova = ['Adana', 'Mersin', 'Gaziantep'].filter((c) => data.hospitals.some((h) => h.city === c));
    return cukurova.length ? cukurova : allCities.slice(0, 2);
  });
  const [checked, setChecked] = useState<Record<string, boolean>>(() => {
    try {
      return JSON.parse(localStorage.getItem(LS_CHECK) ?? '{}') as Record<string, boolean>;
    } catch {
      return {};
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem(LS_CHECK, JSON.stringify(checked));
    } catch {
      /* yok say */
    }
  }, [checked]);

  const toggleCity = (c: string) =>
    setSelectedCities((prev) => (prev.includes(c) ? prev.filter((x) => x !== c) : [...prev, c]));
  const toggleCheck = (key: string) => setChecked((p) => ({ ...p, [key]: !p[key] }));

  const hospitals = useMemo(
    () => data.hospitals.filter((h) => selectedCities.includes(h.city)).sort((a, b) => a.city.localeCompare(b.city, 'tr') || a.name.localeCompare(b.name, 'tr')),
    [data.hospitals, selectedCities],
  );

  return (
    <>
      <PageHeader
        title="Şehir Dışı Seyahat & Rota Planlayıcı"
        subtitle="Şehirleri seçin; ziyaret edilecek hastaneler, hocaların uygun saatleri ve kritik sarf eksikleri tek listede hazırlansın."
        actions={
          <button type="button" className={btn('secondary')} onClick={() => window.print()}>
            <Printer aria-hidden="true" className="size-4" /> Seyahat Planını Yazdır
          </button>
        }
      />

      <Card className="mb-5 p-4 no-print" aria-label="Şehir ve tur seçimi">
        <div className="mb-3 flex flex-wrap items-center gap-2">
          <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">Hazır Turlar:</span>
          {PRESET_TOURS.map((t) => (
            <button
              key={t.label}
              type="button"
              onClick={() => setSelectedCities(t.cities)}
              className={cn('rounded-full border border-slate-300 bg-white px-3 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50')}
            >
              <RouteIcon aria-hidden="true" className="mr-1 inline size-3.5 text-medical" />
              {t.label} ({t.cities.join(' · ')})
            </button>
          ))}
          <button type="button" onClick={() => setSelectedCities(allCities)} className="ml-auto text-xs font-medium text-medical hover:underline">
            Tümünü Seç
          </button>
        </div>

        <fieldset>
          <legend className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-600">Ziyaret Edilecek Şehirler</legend>
          <div className="flex flex-wrap gap-1.5">
            {allCities.map((c) => {
              const active = selectedCities.includes(c);
              const count = data.hospitals.filter((h) => h.city === c).length;
              return (
                <button
                  key={c}
                  type="button"
                  aria-pressed={active}
                  onClick={() => toggleCity(c)}
                  className={cn(
                    'inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition',
                    active ? 'bg-navy text-white shadow' : 'bg-slate-100 text-slate-700 hover:bg-slate-200',
                  )}
                >
                  <MapPin aria-hidden="true" className="size-3.5" />
                  <span>{c}</span>
                  <span className={cn('rounded-full px-1.5 text-[10px]', active ? 'bg-white/20 text-white' : 'bg-white text-slate-600')}>{count}</span>
                </button>
              );
            })}
          </div>
        </fieldset>
      </Card>

      {hospitals.length === 0 ? (
        <EmptyState title="Seçili şehirlerde kayıtlı hastane yok">Yukarıdan en az bir şehir seçin veya Hastane & İstihbarat ekranından yeni hastane ekleyin.</EmptyState>
      ) : (
        <ol className="space-y-4">
          {hospitals.map((h) => {
            const hContacts = data.contacts
              .filter((c) => c.hospital_id === h.id)
              .sort((a, b) => Number(b.is_key_decision_maker) - Number(a.is_key_decision_maker));
            const lowStock = data.inventory
              .filter((i) => i.hospital_id === h.id)
              .map((i) => forecastInventory(i, data.catalog.find((c) => c.code === i.instrument_code)))
              .filter((f) => f.level !== 'ok');
            const openActions = data.visits.filter((v) => v.hospital_id === h.id && !v.is_action_completed && v.next_action);
            const hKey = `h:${h.id}`;

            return (
              <li key={h.id}>
                <Card as="article" className="p-5">
                  <header className="flex flex-wrap items-start justify-between gap-3 border-b border-slate-100 pb-3">
                    <div className="flex items-start gap-3">
                      <button
                        type="button"
                        onClick={() => toggleCheck(hKey)}
                        aria-label={`${h.name} ziyareti tamamlandı`}
                        aria-pressed={!!checked[hKey]}
                        className="mt-0.5 text-slate-400 hover:text-emerald-600"
                      >
                        {checked[hKey] ? <CheckCircle2 aria-hidden="true" className="size-6 text-emerald-600" /> : <Circle aria-hidden="true" className="size-6" />}
                      </button>
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-wide text-medical">
                          {h.city} {h.district ? `· ${h.district}` : ''} · {h.hospital_type}
                        </p>
                        <h2 className={cn('text-lg font-bold text-navy', checked[hKey] && 'line-through text-slate-400')}>
                          <Link to={`/hospitals/${h.id}`} className="hover:text-medical hover:underline">
                            {h.name}
                          </Link>
                        </h2>
                        {h.or_floor_info && <p className="mt-0.5 text-xs text-slate-600">Ameliyathane: {h.or_floor_info}</p>}
                      </div>
                    </div>
                    <Badge className={stageStyle[h.pipeline_stage]}>{h.pipeline_stage}</Badge>
                  </header>

                  <div className="mt-4 grid gap-4 lg:grid-cols-3">
                    {/* Kilit kişiler ve ziyaret saatleri */}
                    <section aria-label="Görüşülecek kişiler">
                      <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">Karar Vericiler & Uygun Saatler</h3>
                      {hContacts.length === 0 ? (
                        <p className="text-xs text-slate-500">Kayıtlı kişi yok.</p>
                      ) : (
                        <ul className="space-y-2">
                          {hContacts.map((c) => {
                            const cKey = `c:${c.id}`;
                            return (
                              <li key={c.id} className="rounded-xl border border-slate-200 p-2.5 text-xs">
                                <div className="flex items-start gap-2">
                                  <button
                                    type="button"
                                    onClick={() => toggleCheck(cKey)}
                                    aria-label={`${c.full_name} ile görüşüldü`}
                                    aria-pressed={!!checked[cKey]}
                                    className="mt-0.5 text-slate-400 hover:text-emerald-600"
                                  >
                                    {checked[cKey] ? <CheckCircle2 aria-hidden="true" className="size-4 text-emerald-600" /> : <Circle aria-hidden="true" className="size-4" />}
                                  </button>
                                  <div className="min-w-0 flex-1">
                                    <p className="flex flex-wrap items-center gap-1 font-semibold text-navy">
                                      <span className={cn(checked[cKey] && 'line-through text-slate-400')}>{c.full_name}</span>
                                      {c.is_key_decision_maker && <Crown aria-hidden="true" className="size-3.5 text-amber-500" />}
                                      <Badge className={attitudeStyle[c.attitude]}>{c.attitude}</Badge>
                                    </p>
                                    <p className="text-slate-500">{c.role}</p>
                                    {c.best_visit_time && (
                                      <p className="mt-1 flex items-center gap-1 font-medium text-sky-800">
                                        <Clock aria-hidden="true" className="size-3.5" /> {c.best_visit_time}
                                      </p>
                                    )}
                                    {c.personal_notes && <p className="mt-0.5 text-slate-600">{c.personal_notes}</p>}
                                    {c.phone && (
                                      <p className="mt-1.5 flex gap-2 no-print">
                                        <a href={`tel:${c.phone.replace(/\s/g, '')}`} className="inline-flex items-center gap-1 font-medium text-medical hover:underline">
                                          <Phone aria-hidden="true" className="size-3" /> Ara
                                        </a>
                                        <a href={whatsappLink(c.phone)} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 font-medium text-emerald-700 hover:underline">
                                          <MessageCircle aria-hidden="true" className="size-3" /> WhatsApp
                                        </a>
                                      </p>
                                    )}
                                  </div>
                                </div>
                              </li>
                            );
                          })}
                        </ul>
                      )}
                    </section>

                    {/* Depoda eksilen sarf malzemeler */}
                    <section aria-label="Depoda eksilen sarf malzemeler">
                      <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">Depoda Eksilen Sarf / Can Kontrolü</h3>
                      {lowStock.length === 0 ? (
                        <p className="text-xs text-slate-500">Kritik veya uyarı seviyesinde sarf yok.</p>
                      ) : (
                        <ul className="space-y-2">
                          {lowStock.map((f) => (
                            <li key={f.item.id} className="flex items-start gap-2 rounded-xl border border-red-200 bg-red-50/50 p-2.5 text-xs">
                              <AlertTriangle aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-alert" />
                              <div>
                                <strong className="text-slate-900">
                                  {f.instrument?.name_tr ?? f.item.instrument_code} ({f.item.instrument_code})
                                </strong>
                                <p className="text-slate-700">
                                  {f.isDisposable ? `${f.totalAvailableUses} adet kaldı` : `Aktif ${f.item.active_instrument_remaining_uses} can · ${f.item.boxed_stock_count} kutu`}
                                  {f.daysLeft !== null && ` · ~${Math.floor(f.daysLeft)} gün`}
                                </p>
                              </div>
                            </li>
                          ))}
                        </ul>
                      )}
                    </section>

                    {/* Bekleyen saha görevleri */}
                    <section aria-label="Bekleyen görevler">
                      <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">Seyahat Görev Listesi (Checklist)</h3>
                      {openActions.length === 0 ? (
                        <p className="text-xs text-slate-500">Bu hastane için açık aksiyon kaydı yok.</p>
                      ) : (
                        <ul className="space-y-2">
                          {openActions.map((v) => (
                            <li key={v.id} className="flex items-start gap-2 rounded-xl border border-slate-200 p-2.5 text-xs">
                              <button
                                type="button"
                                onClick={() => toggleVisitAction(v.id)}
                                aria-label={`Görevi tamamla: ${v.next_action}`}
                                aria-pressed={v.is_action_completed}
                                className="mt-0.5 text-slate-400 hover:text-emerald-600"
                              >
                                {v.is_action_completed ? <CheckCircle2 aria-hidden="true" className="size-4 text-emerald-600" /> : <Circle aria-hidden="true" className="size-4" />}
                              </button>
                              <div>
                                <p className="font-medium text-slate-900">{v.next_action}</p>
                                {v.next_action_date && <small className="text-slate-500">Hedef: {fmtDate(v.next_action_date)}</small>}
                              </div>
                            </li>
                          ))}
                        </ul>
                      )}
                    </section>
                  </div>
                </Card>
              </li>
            );
          })}
        </ol>
      )}
    </>
  );
}
