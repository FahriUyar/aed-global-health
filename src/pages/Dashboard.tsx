import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { AlertTriangle, Bot, CalendarClock, DollarSign, Minus, PackageOpen, Phone, Plus, ShoppingCart, CheckCircle2, Circle, Siren } from 'lucide-react';
import { useCRM } from '../context/CRMContext';
import { useDocumentMeta } from '../hooks/useDocumentMeta';
import { Badge, Card, EmptyState, PageHeader, UsesBar, btn } from '../components/ui';
import { DealModal, OpenBoxPrompt } from '../components/modals/DealInventoryModals';
import { VisitModal } from '../components/modals/VisitModal';
import { useToast } from '../components/ui/Toast';
import { OPEN_ORDER_STATUSES, type DealInput } from '../types/database';
import { addDaysISO, cn, fmtDate, fmtNum, fmtUSD, forecastInventory, todayISO } from '../lib/domain';

function weekBounds(): [string, string] {
  const today = todayISO();
  const d = new Date(`${today}T00:00:00`);
  const dow = (d.getDay() + 6) % 7; // Pazartesi = 0
  const start = addDaysISO(today, -dow);
  return [start, addDaysISO(start, 6)];
}

export default function Dashboard() {
  useDocumentMeta('Komuta Merkezi', 'Toumai® kurulumları, kritik enstrüman can uyarıları, haftalık aksiyonlar ve bekleyen teklif hacmi tek ekranda.');
  const { data, consumeOne, openNewBox, toggleVisitAction } = useCRM();
  const { notify } = useToast();
  const [boxPrompt, setBoxPrompt] = useState<string | null>(null);
  const [dealPrefill, setDealPrefill] = useState<Partial<DealInput> | null>(null);
  const [visitOpen, setVisitOpen] = useState(false);

  const today = todayISO();
  const hospitalById = useMemo(() => new Map(data.hospitals.map((h) => [h.id, h])), [data.hospitals]);

  const forecasts = useMemo(
    () =>
      data.inventory
        .map((i) => forecastInventory(i, data.catalog.find((c) => c.code === i.instrument_code)))
        .filter((f) => hospitalById.has(f.item.hospital_id)),
    [data.inventory, data.catalog, hospitalById],
  );
  const critical = useMemo(() => forecasts.filter((f) => f.isCritical).sort((a, b) => (a.daysLeft ?? 9999) - (b.daysLeft ?? 9999)), [forecasts]);
  const criticalHospitals = new Set(critical.map((c) => c.item.hospital_id)).size;

  const installed = data.hospitals.filter((h) => h.toumai_installed).length;
  const targets = data.hospitals.filter((h) => !h.toumai_installed && h.pipeline_stage !== 'Askıda / Kaybedildi').length;

  const [wStart, wEnd] = weekBounds();
  const weekActions = data.visits.filter((v) => !v.is_action_completed && v.next_action_date && v.next_action_date >= wStart && v.next_action_date <= wEnd).length;
  const openDeals = data.deals.filter((d) => OPEN_ORDER_STATUSES.includes(d.status));
  const openVolume = openDeals.reduce((s, d) => s + (Number(d.total_amount_usd) || 0), 0);

  const dueActions = data.visits
    .filter((v) => !v.is_action_completed && v.next_action && v.next_action_date && v.next_action_date <= today)
    .sort((a, b) => (a.next_action_date ?? '').localeCompare(b.next_action_date ?? ''));
  const upcoming = data.visits
    .filter((v) => !v.is_action_completed && v.next_action && v.next_action_date && v.next_action_date > today && v.next_action_date <= addDaysISO(today, 7))
    .sort((a, b) => (a.next_action_date ?? '').localeCompare(b.next_action_date ?? ''));

  const kpis = [
    { label: 'Kurulu Toumai® / Hedef Hastane', value: `${installed} / ${targets}`, icon: Bot, tone: 'text-medical bg-sky-50' },
    { label: 'Kritik Can Uyarısı Veren Hastane', value: String(criticalHospitals), icon: Siren, tone: 'text-alert bg-red-50', highlight: criticalHospitals > 0 },
    { label: 'Bu Hafta Planlanan Aksiyon', value: String(weekActions), icon: CalendarClock, tone: 'text-amber-600 bg-amber-50' },
    { label: `Bekleyen Teklif / İhale (${openDeals.length})`, value: fmtUSD(openVolume), icon: DollarSign, tone: 'text-emerald-600 bg-emerald-50' },
  ];

  return (
    <>
      <PageHeader
        title="Komuta Merkezi"
        subtitle={`Türkiye operasyon özeti · ${new Date().toLocaleDateString('tr-TR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}`}
        actions={
          <button type="button" className={btn('primary')} onClick={() => setVisitOpen(true)}>
            <Plus aria-hidden="true" className="size-4" /> Ziyaret Kaydı
          </button>
        }
      />

      <section aria-label="Temel göstergeler" className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
        {kpis.map((k) => (
          <Card as="article" key={k.label} className={cn('p-4', k.highlight && 'border-red-300 ring-2 ring-red-100')}>
            <span className={cn('mb-3 grid size-10 place-items-center rounded-xl', k.tone)}>
              <k.icon aria-hidden="true" className="size-5" />
            </span>
            <p className={cn('text-2xl font-bold tracking-tight text-navy', k.highlight && 'text-alert')}>{k.value}</p>
            <h2 className="mt-0.5 text-xs font-medium text-slate-600">{k.label}</h2>
          </Card>
        ))}
      </section>

      <section className="grid gap-6 xl:grid-cols-5">
        <Card className="xl:col-span-3" aria-labelledby="crit-h">
          <header className="flex items-center gap-2 border-b border-red-100 bg-red-50/60 px-5 py-3.5">
            <AlertTriangle aria-hidden="true" className="size-5 text-alert" />
            <h2 id="crit-h" className="font-semibold text-red-900">
              Acil Sarf Siparişi Gereken Hastaneler
            </h2>
            <Badge className="ml-auto bg-red-100 text-red-800">{critical.length} kalem</Badge>
          </header>
          {critical.length === 0 ? (
            <p className="p-6 text-center text-sm text-slate-600">Tüm hastanelerde enstrüman ömrü güvenli seviyede. 👍</p>
          ) : (
            <ul className="divide-y divide-slate-100">
              {critical.map((f) => {
                const h = hospitalById.get(f.item.hospital_id)!;
                const nurse =
                  data.contacts.find((c) => c.hospital_id === h.id && c.role === 'Ameliyathane Sorumlu Hemşiresi') ??
                  data.contacts.find((c) => c.hospital_id === h.id && c.role === 'Sarf Depo Sorumlusu');
                const name = f.instrument?.name_tr ?? f.item.instrument_code;
                return (
                  <li key={f.item.id} className="px-5 py-4">
                    <article>
                      <header className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
                        <h3 className="font-semibold text-slate-900">
                          <Link to={`/hospitals/${h.id}`} className="hover:text-medical hover:underline">
                            {h.name}
                          </Link>
                        </h3>
                        <span className="text-xs text-slate-500">{h.city}</span>
                      </header>
                      <p className="mt-1 text-sm text-slate-700">
                        <strong>{name}</strong> <span className="font-mono text-xs text-slate-500">({f.item.instrument_code})</span>{' '}
                        {f.isDisposable ? (
                          <>
                            — depoda sadece <strong className="text-alert">{f.totalAvailableUses} adet</strong> kaldı!
                          </>
                        ) : (
                          <>
                            — aktif enstrümanda <strong className="text-alert">{f.item.active_instrument_remaining_uses} can</strong>, depoda {f.item.boxed_stock_count} kutu (toplam {f.totalAvailableUses} can).
                          </>
                        )}{' '}
                        {f.daysLeft !== null && (
                          <>
                            Tahmini bitiş: <strong>{Math.floor(f.daysLeft) <= 0 ? 'bugün' : `${Math.floor(f.daysLeft)} gün sonra`}</strong> ({fmtDate(f.depletionDate)}).
                          </>
                        )}
                        {nurse?.phone && (
                          <>
                            {' '}
                            <a href={`tel:${nurse.phone.replace(/\s/g, '')}`} className="inline-flex items-center gap-1 font-medium text-medical hover:underline">
                              <Phone aria-hidden="true" className="size-3.5" />
                              {nurse.full_name}’ı ara
                            </a>
                          </>
                        )}
                      </p>
                      {!f.isDisposable && (
                        <span className="mt-2 block max-w-sm">
                          <UsesBar value={f.item.active_instrument_remaining_uses} max={f.maxUses} level={f.level} label={`${name} aktif can: ${f.item.active_instrument_remaining_uses}/${f.maxUses}`} />
                        </span>
                      )}
                      <footer className="mt-3 flex flex-wrap gap-2">
                        <button
                          type="button"
                          className={btn('secondary', 'sm')}
                          onClick={async () => {
                            const r = await consumeOne(f.item.id);
                            if (r?.needsBoxPrompt) setBoxPrompt(f.item.id);
                            else notify(`${name}: 1 ${f.isDisposable ? 'adet' : 'can'} düşüldü.`);
                          }}
                        >
                          <Minus aria-hidden="true" className="size-3.5" /> {f.isDisposable ? '1 Adet Düş' : '1 Can Düş (-1)'}
                        </button>
                        {!f.isDisposable && (
                          <button
                            type="button"
                            className={btn('secondary', 'sm')}
                            disabled={f.item.boxed_stock_count <= 0}
                            title={f.item.boxed_stock_count <= 0 ? 'Depoda kapalı kutu yok' : undefined}
                            onClick={async () => {
                              if (await openNewBox(f.item.id)) notify(`${name}: yeni kutu açıldı (+${f.maxUses} can).`);
                            }}
                          >
                            <PackageOpen aria-hidden="true" className="size-3.5" /> Yeni Kutu Aç (+{f.maxUses} Can)
                          </button>
                        )}
                        <button
                          type="button"
                          className={btn('danger', 'sm')}
                          onClick={() => {
                            const qty = Math.max(1, Math.ceil(((Number(f.item.avg_uses_per_week) || 1) * 8) / f.maxUses)); // ~8 haftalık ihtiyaç
                            setDealPrefill({
                              hospital_id: h.id,
                              order_type: 'Rutin Sarf & Enstrüman Siparişi',
                              status: 'Hazırlık',
                              items_summary: `${qty}x ${name} (${f.item.instrument_code})`,
                              total_amount_usd: qty * (f.instrument?.unit_list_price_usd ?? 0),
                              expected_close_date: addDaysISO(today, 7),
                              notes: `Kritik can uyarısından oluşturuldu. Kalan: ${f.totalAvailableUses} ${f.isDisposable ? 'adet' : 'can'}.`,
                            });
                          }}
                        >
                          <ShoppingCart aria-hidden="true" className="size-3.5" /> Sipariş Oluştur
                        </button>
                      </footer>
                    </article>
                  </li>
                );
              })}
            </ul>
          )}
        </Card>

        <Card className="xl:col-span-2" aria-labelledby="act-h">
          <header className="flex items-center gap-2 border-b border-slate-100 px-5 py-3.5">
            <CalendarClock aria-hidden="true" className="size-5 text-medical" />
            <h2 id="act-h" className="font-semibold text-navy">
              Yaklaşan Aksiyonlar ve Ziyaret Takvimi
            </h2>
          </header>
          <section aria-labelledby="due-h" className="px-5 py-4">
            <h3 id="due-h" className="mb-2 text-xs font-semibold uppercase tracking-wide text-alert">
              Bugün & Gecikmiş ({dueActions.length})
            </h3>
            {dueActions.length === 0 ? (
              <EmptyState title="Bekleyen acil aksiyon yok" />
            ) : (
              <ActionList visits={dueActions} hospitalName={(id) => hospitalById.get(id)?.name ?? '—'} onToggle={toggleVisitAction} today={today} />
            )}
          </section>
          <section aria-labelledby="up-h" className="border-t border-slate-100 px-5 py-4">
            <h3 id="up-h" className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
              Önümüzdeki 7 Gün ({upcoming.length})
            </h3>
            {upcoming.length === 0 ? (
              <p className="text-sm text-slate-500">Planlanmış aksiyon yok.</p>
            ) : (
              <ActionList visits={upcoming} hospitalName={(id) => hospitalById.get(id)?.name ?? '—'} onToggle={toggleVisitAction} today={today} />
            )}
          </section>
          <footer className="border-t border-slate-100 px-5 py-3 text-xs text-slate-500">
            Takip edilen {fmtNum(data.hospitals.length)} hastane · {fmtNum(data.contacts.length)} karar verici · {fmtNum(data.visits.length)} görüşme kaydı
          </footer>
        </Card>
      </section>

      <OpenBoxPrompt itemId={boxPrompt} onClose={() => setBoxPrompt(null)} />
      <DealModal open={!!dealPrefill} onClose={() => setDealPrefill(null)} prefill={dealPrefill ?? undefined} />
      <VisitModal open={visitOpen} onClose={() => setVisitOpen(false)} />
    </>
  );
}

function ActionList({
  visits,
  hospitalName,
  onToggle,
  today,
}: {
  visits: { id: string; hospital_id: string; next_action: string | null; next_action_date: string | null; is_action_completed: boolean }[];
  hospitalName: (id: string) => string;
  onToggle: (id: string) => Promise<void>;
  today: string;
}) {
  return (
    <ul className="space-y-2">
      {visits.map((v) => {
        const overdue = (v.next_action_date ?? '') < today;
        return (
          <li key={v.id} className="flex items-start gap-3 rounded-xl border border-slate-200 p-3">
            <button
              type="button"
              onClick={() => onToggle(v.id)}
              aria-label={`Aksiyonu tamamlandı olarak işaretle: ${v.next_action}`}
              aria-pressed={v.is_action_completed}
              className="mt-0.5 rounded-full text-slate-400 hover:text-emerald-600"
            >
              {v.is_action_completed ? <CheckCircle2 aria-hidden="true" className="size-5 text-emerald-600" /> : <Circle aria-hidden="true" className="size-5" />}
            </button>
            <p className="min-w-0 flex-1 text-sm">
              <span className="block font-medium text-slate-900">{v.next_action}</span>
              <Link to={`/hospitals/${v.hospital_id}`} className="text-xs text-slate-600 hover:text-medical hover:underline">
                {hospitalName(v.hospital_id)}
              </Link>
            </p>
            <Badge className={overdue ? 'bg-red-50 text-red-700' : 'bg-slate-100 text-slate-700'}>
              <time dateTime={v.next_action_date ?? undefined}>{fmtDate(v.next_action_date)}</time>
            </Badge>
          </li>
        );
      })}
    </ul>
  );
}
