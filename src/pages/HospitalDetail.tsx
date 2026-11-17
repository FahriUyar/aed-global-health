import { useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import {
  ArrowLeft,
  Bot,
  Boxes,
  CheckCircle2,
  Circle,
  Clock,
  Coffee,
  Crown,
  Download,
  FileText,
  History,
  Mail,
  MessageCircle,
  Minus,
  PackageOpen,
  Pencil,
  Phone,
  Plus,
  Stethoscope,
  Trash2,
  Users,
} from 'lucide-react';
import { useCRM } from '../context/CRMContext';
import { useDocumentMeta } from '../hooks/useDocumentMeta';
import { Badge, Card, EmptyState, PageHeader, UsesBar, btn } from '../components/ui';
import { HospitalModal } from '../components/modals/HospitalModal';
import { ContactModal } from '../components/modals/ContactModal';
import { VisitModal } from '../components/modals/VisitModal';
import { DealModal, InventoryModal, OpenBoxPrompt } from '../components/modals/DealInventoryModals';
import { SurgeryCaseModal } from '../components/modals/SurgeryCaseModal';
import { useToast } from '../components/ui/Toast';
import type { Contact, DealOrder, InventoryItem, Visit } from '../types/database';
import { attitudeStyle, cn, downloadCSV, fmtDate, fmtUSD, forecastInventory, stageStyle, todayISO, weeklyCases, whatsappLink } from '../lib/domain';

type Tab = 'contacts' | 'inventory' | 'visits' | 'deals';

export default function HospitalDetail() {
  const { id = '' } = useParams();
  const { data, deleteContact, consumeOne, openNewBox, deleteInventory, deleteVisit, toggleVisitAction, updateDeal, deleteDeal } = useCRM();
  const { notify } = useToast();
  const hospital = data.hospitals.find((h) => h.id === id);

  useDocumentMeta(hospital ? hospital.name : 'Hastane Bulunamadı', hospital ? `${hospital.city} · ${hospital.hospital_type} · ${hospital.pipeline_stage}` : 'Hastane 360° detay kartı');

  const [tab, setTab] = useState<Tab>('contacts');
  const [editHosp, setEditHosp] = useState(false);
  const [contactModal, setContactModal] = useState<{ open: boolean; contact?: Contact | null }>({ open: false });
  const [invModal, setInvModal] = useState<{ open: boolean; item?: InventoryItem | null }>({ open: false });
  const [visitModal, setVisitModal] = useState<{ open: boolean; visit?: Visit | null }>({ open: false });
  const [dealModal, setDealModal] = useState<{ open: boolean; deal?: DealOrder | null }>({ open: false });
  const [surgeryOpen, setSurgeryOpen] = useState(false);
  const [boxPrompt, setBoxPrompt] = useState<string | null>(null);

  const contacts = useMemo(() => data.contacts.filter((c) => c.hospital_id === id), [data.contacts, id]);
  const inventory = useMemo(() => data.inventory.filter((i) => i.hospital_id === id), [data.inventory, id]);
  const visits = useMemo(() => data.visits.filter((v) => v.hospital_id === id).sort((a, b) => b.visit_date.localeCompare(a.visit_date)), [data.visits, id]);
  const deals = useMemo(() => data.deals.filter((d) => d.hospital_id === id), [data.deals, id]);

  if (!hospital) {
    return (
      <EmptyState title="Hastane bulunamadı">
        <Link to="/hospitals" className={btn('primary')}>
          <ArrowLeft aria-hidden="true" className="size-4" /> Hastane listesine dön
        </Link>
      </EmptyState>
    );
  }

  const tabs: { key: Tab; label: string; count: number; icon: typeof Users }[] = [
    { key: 'contacts', label: 'Karar Vericiler', count: contacts.length, icon: Users },
    { key: 'inventory', label: 'Depo & Enstrüman Can Durumu', count: inventory.length, icon: Boxes },
    { key: 'visits', label: 'Ziyaret Geçmişi & Notlar', count: visits.length, icon: History },
    { key: 'deals', label: 'Teklifler & ÜTS Siparişleri', count: deals.length, icon: FileText },
  ];

  const exportInvCSV = () => {
    downloadCSV(
      `stok-${hospital.name.toLocaleLowerCase('tr').replace(/\s+/g, '-')}-${todayISO()}.csv`,
      ['Katalog Kodu', 'Enstrüman', 'Kapalı Kutu / Adet', 'Aktif Kalan Can', 'Maks. Can', 'Toplam Kullanılabilir', 'Haftalık Tüketim', 'Tahmini Kalan Gün'],
      inventory.map((i) => {
        const f = forecastInventory(i, data.catalog.find((c) => c.code === i.instrument_code));
        return [i.instrument_code, f.instrument?.name_tr ?? '', i.boxed_stock_count, i.active_instrument_remaining_uses, f.maxUses, f.totalAvailableUses, i.avg_uses_per_week, f.daysLeft !== null ? Math.floor(f.daysLeft) : ''];
      }),
    );
    notify('Stok durumu CSV olarak indirildi.');
  };

  return (
    <>
      <nav aria-label="Geri" className="mb-3">
        <Link to="/hospitals" className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-600 hover:text-navy">
          <ArrowLeft aria-hidden="true" className="size-4" /> Tüm Hastaneler
        </Link>
      </nav>

      <PageHeader
        title={hospital.name}
        subtitle={`${hospital.city}${hospital.district ? ` · ${hospital.district}` : ''} · ${hospital.hospital_type} · ${hospital.acquisition_model}`}
        actions={
          <>
            <button type="button" className={btn('danger')} onClick={() => setSurgeryOpen(true)}>
              <Stethoscope aria-hidden="true" className="size-4" /> Ameliyat Girildi (Vaka Düş)
            </button>
            <button type="button" className={btn('secondary')} onClick={() => setEditHosp(true)}>
              <Pencil aria-hidden="true" className="size-4" /> Hastaneyi Düzenle
            </button>
          </>
        }
      />

      <Card className="mb-5 p-4">
        <section aria-label="Hastane özeti" className="flex flex-wrap items-center gap-2 text-xs">
          <Badge className={stageStyle[hospital.pipeline_stage]}>{hospital.pipeline_stage}</Badge>
          {hospital.toumai_installed && (
            <Badge className="bg-emerald-100 text-emerald-800">
              <Bot aria-hidden="true" className="size-3.5" /> Toumai® Kurulu {hospital.installation_date ? `(${fmtDate(hospital.installation_date)})` : ''}
            </Badge>
          )}
          {hospital.has_davinci && <Badge className="bg-red-50 text-red-700">Da Vinci Mevcut</Badge>}
          <span className="ml-auto font-medium text-slate-700">
            Haftalık potansiyel: <strong>{weeklyCases(hospital)} vaka</strong> (Üroloji {hospital.weekly_urology_cases} · G.Cerrahi {hospital.weekly_general_surgery_cases} · Jinekoloji {hospital.weekly_gynecology_cases} · Göğüs/Ped. {hospital.weekly_thoracic_cases})
          </span>
        </section>
        {(hospital.or_floor_info || hospital.davinci_model || hospital.general_notes) && (
          <dl className="mt-3 grid gap-2 border-t border-slate-100 pt-3 text-xs text-slate-600 sm:grid-cols-3">
            {hospital.or_floor_info && (
              <div>
                <dt className="font-semibold text-slate-800">Ameliyathane Tarifi</dt>
                <dd>{hospital.or_floor_info}</dd>
              </div>
            )}
            {hospital.davinci_model && (
              <div>
                <dt className="font-semibold text-red-800">Rakip Da Vinci İstihbaratı</dt>
                <dd>{hospital.davinci_model}</dd>
              </div>
            )}
            {hospital.general_notes && (
              <div>
                <dt className="font-semibold text-slate-800">Genel Notlar</dt>
                <dd>{hospital.general_notes}</dd>
              </div>
            )}
          </dl>
        )}
      </Card>

      {/* Sekmeler */}
      <nav aria-label="Hastane sekmeleri" role="tablist" className="mb-4 flex gap-1 overflow-x-auto rounded-xl border border-slate-200 bg-white p-1">
        {tabs.map((t) => {
          const active = tab === t.key;
          return (
            <button
              key={t.key}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => setTab(t.key)}
              className={cn(
                'inline-flex items-center gap-2 whitespace-nowrap rounded-lg px-3.5 py-2 text-sm font-medium transition',
                active ? 'bg-navy text-white shadow' : 'text-slate-600 hover:bg-slate-100',
              )}
            >
              <t.icon aria-hidden="true" className="size-4" />
              <span>{t.label}</span>
              <Badge className={active ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-700'}>{t.count}</Badge>
            </button>
          );
        })}
      </nav>

      {/* 1) KARAR VERİCİLER */}
      {tab === 'contacts' && (
        <section aria-label="Karar vericiler">
          <header className="mb-3 flex justify-end">
            <button type="button" className={btn('primary')} onClick={() => setContactModal({ open: true, contact: null })}>
              <Plus aria-hidden="true" className="size-4" /> Kişi Ekle
            </button>
          </header>
          {contacts.length === 0 ? (
            <EmptyState title="Henüz karar verici eklenmemiş">Cerrah, sorumlu hemşire, biyomedikal ve satın alma kişilerini ekleyin.</EmptyState>
          ) : (
            <ul className="grid gap-4 md:grid-cols-2">
              {contacts.map((c) => (
                <li key={c.id}>
                  <Card as="article" className="flex h-full flex-col justify-between p-4">
                    <header className="flex items-start justify-between gap-2">
                      <hgroup>
                        <h3 className="flex items-center gap-1.5 font-semibold text-navy">
                          {c.full_name}
                          {c.is_key_decision_maker && (
                            <span title="Kilit karar verici" className="text-amber-500">
                              <Crown aria-hidden="true" className="size-4" />
                              <span className="sr-only">Kilit karar verici</span>
                            </span>
                          )}
                        </h3>
                        <p className="text-xs text-slate-500">
                          {c.role}
                          {c.department ? ` · ${c.department}` : ''}
                        </p>
                      </hgroup>
                      <Badge className={attitudeStyle[c.attitude]}>{c.attitude}</Badge>
                    </header>

                    <dl className="my-3 space-y-1.5 text-xs text-slate-700">
                      {c.best_visit_time && (
                        <div className="flex items-start gap-2">
                          <dt className="sr-only">En uygun ziyaret saati</dt>
                          <Clock aria-hidden="true" className="mt-0.5 size-3.5 shrink-0 text-medical" />
                          <dd>
                            <strong>Ziyaret saati:</strong> {c.best_visit_time}
                          </dd>
                        </div>
                      )}
                      {c.personal_notes && (
                        <div className="flex items-start gap-2">
                          <dt className="sr-only">Kişisel istihbarat</dt>
                          <Coffee aria-hidden="true" className="mt-0.5 size-3.5 shrink-0 text-amber-600" />
                          <dd>{c.personal_notes}</dd>
                        </div>
                      )}
                    </dl>

                    <footer className="flex flex-wrap items-center gap-2 border-t border-slate-100 pt-3">
                      {c.phone && (
                        <>
                          <a href={`tel:${c.phone.replace(/\s/g, '')}`} className={btn('secondary', 'sm')}>
                            <Phone aria-hidden="true" className="size-3.5" /> {c.phone}
                          </a>
                          <a href={whatsappLink(c.phone)} target="_blank" rel="noopener noreferrer" className={btn('success', 'sm')}>
                            <MessageCircle aria-hidden="true" className="size-3.5" /> WhatsApp
                          </a>
                        </>
                      )}
                      {c.email && (
                        <a href={`mailto:${c.email}`} className={btn('secondary', 'sm')}>
                          <Mail aria-hidden="true" className="size-3.5" /> E-posta
                        </a>
                      )}
                      <span className="ml-auto flex gap-1">
                        <button type="button" aria-label={`${c.full_name} düzenle`} onClick={() => setContactModal({ open: true, contact: c })} className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100">
                          <Pencil aria-hidden="true" className="size-4" />
                        </button>
                        <button
                          type="button"
                          aria-label={`${c.full_name} sil`}
                          onClick={async () => {
                            if (confirm(`${c.full_name} silinsin mi?`)) {
                              await deleteContact(c.id);
                              notify('Kişi silindi.');
                            }
                          }}
                          className="rounded-lg p-1.5 text-slate-500 hover:bg-red-50 hover:text-alert"
                        >
                          <Trash2 aria-hidden="true" className="size-4" />
                        </button>
                      </span>
                    </footer>
                  </Card>
                </li>
              ))}
            </ul>
          )}
        </section>
      )}

      {/* 2) DEPO & ENSTRÜMAN CAN DURUMU */}
      {tab === 'inventory' && (
        <section aria-label="Depo ve enstrüman can durumu">
          <header className="mb-3 flex flex-wrap justify-end gap-2">
            {inventory.length > 0 && (
              <button type="button" className={btn('secondary')} onClick={exportInvCSV}>
                <Download aria-hidden="true" className="size-4" /> Stok CSV İndir
              </button>
            )}
            <button type="button" className={btn('danger')} onClick={() => setSurgeryOpen(true)}>
              <Stethoscope aria-hidden="true" className="size-4" /> Ameliyat Girildi (Vaka Düş)
            </button>
            <button type="button" className={btn('primary')} onClick={() => setInvModal({ open: true, item: null })}>
              <Plus aria-hidden="true" className="size-4" /> Enstrüman Ekle
            </button>
          </header>
          {inventory.length === 0 ? (
            <EmptyState title="Bu hastanede henüz stok/enstrüman kaydı yok" />
          ) : (
            <ul className="grid gap-3 md:grid-cols-2">
              {inventory.map((i) => {
                const f = forecastInventory(i, data.catalog.find((c) => c.code === i.instrument_code));
                const name = f.instrument?.name_tr ?? i.instrument_code;
                return (
                  <li key={i.id}>
                    <Card as="article" className={cn('p-4', f.isCritical && 'border-red-300 bg-red-50/20')}>
                      <header className="flex items-start justify-between gap-2">
                        <hgroup>
                          <h3 className="font-semibold text-navy">
                            <span className="font-mono text-xs text-slate-500">{i.instrument_code}</span> · {name}
                          </h3>
                          <p className="text-xs text-slate-500">{f.instrument?.category}</p>
                        </hgroup>
                        <Badge className={cn(f.level === 'critical' && 'bg-red-100 text-red-800', f.level === 'warning' && 'bg-amber-100 text-amber-800', f.level === 'ok' && 'bg-emerald-100 text-emerald-800')}>
                          {f.daysLeft !== null ? `~${Math.floor(f.daysLeft)} gün` : 'Hız tanımsız'}
                        </Badge>
                      </header>

                      {f.isDisposable ? (
                        <p className="my-3 text-sm text-slate-700">
                          Tek kullanımlık sarf — depoda <strong className={f.isCritical ? 'text-alert' : 'text-navy'}>{i.boxed_stock_count} adet</strong> · haftalık tüketim {i.avg_uses_per_week} adet.
                        </p>
                      ) : (
                        <div className="my-3 space-y-1.5">
                          <p className="flex justify-between text-xs text-slate-700">
                            <span>
                              Aktif can: <strong className={f.level === 'critical' ? 'text-alert' : 'text-navy'}>{i.active_instrument_remaining_uses}</strong> / {f.maxUses}
                            </span>
                            <span>
                              Kapalı kutu: <strong>{i.boxed_stock_count}</strong> · Toplam: <strong>{f.totalAvailableUses} can</strong>
                            </span>
                          </p>
                          <UsesBar value={i.active_instrument_remaining_uses} max={f.maxUses} level={f.level} label={`${name} aktif can`} />
                        </div>
                      )}

                      <footer className="flex flex-wrap items-center gap-2 border-t border-slate-100 pt-3">
                        <button
                          type="button"
                          className={btn('secondary', 'sm')}
                          onClick={async () => {
                            const r = await consumeOne(i.id);
                            if (r?.needsBoxPrompt) setBoxPrompt(i.id);
                            else notify(`${name}: 1 ${f.isDisposable ? 'adet' : 'can'} düşüldü.`);
                          }}
                        >
                          <Minus aria-hidden="true" className="size-3.5" /> {f.isDisposable ? '-1 Adet' : '-1 Can'}
                        </button>
                        {!f.isDisposable && (
                          <button
                            type="button"
                            className={btn('secondary', 'sm')}
                            disabled={i.boxed_stock_count <= 0}
                            onClick={async () => {
                              if (await openNewBox(i.id)) notify(`${name}: kutu açıldı (+${f.maxUses} can).`);
                            }}
                          >
                            <PackageOpen aria-hidden="true" className="size-3.5" /> Kutu Aç (+{f.maxUses})
                          </button>
                        )}
                        <span className="ml-auto flex gap-1">
                          <button type="button" aria-label={`${name} düzenle`} onClick={() => setInvModal({ open: true, item: i })} className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100">
                            <Pencil aria-hidden="true" className="size-4" />
                          </button>
                          <button
                            type="button"
                            aria-label={`${name} sil`}
                            onClick={async () => {
                              if (confirm(`${name} stok kaydı silinsin mi?`)) await deleteInventory(i.id);
                            }}
                            className="rounded-lg p-1.5 text-slate-500 hover:bg-red-50 hover:text-alert"
                          >
                            <Trash2 aria-hidden="true" className="size-4" />
                          </button>
                        </span>
                      </footer>
                    </Card>
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      )}

      {/* 3) ZİYARET GEÇMİŞİ */}
      {tab === 'visits' && (
        <section aria-label="Ziyaret geçmişi">
          <header className="mb-3 flex justify-end">
            <button type="button" className={btn('primary')} onClick={() => setVisitModal({ open: true, visit: null })}>
              <Plus aria-hidden="true" className="size-4" /> Ziyaret Ekle
            </button>
          </header>
          {visits.length === 0 ? (
            <EmptyState title="Henüz ziyaret kaydı yok" />
          ) : (
            <ol className="space-y-3 border-l-2 border-slate-200 pl-4">
              {visits.map((v) => {
                const person = contacts.find((c) => c.id === v.contact_id);
                return (
                  <li key={v.id}>
                    <Card as="article" className="p-4">
                      <header className="flex flex-wrap items-center justify-between gap-2">
                        <p className="text-sm font-semibold text-navy">
                          <time dateTime={v.visit_date}>{fmtDate(v.visit_date)}</time> · {v.visit_type}
                          {person && <span className="font-normal text-slate-600"> — {person.full_name}</span>}
                        </p>
                        <span className="flex gap-1">
                          <button type="button" aria-label="Ziyareti düzenle" onClick={() => setVisitModal({ open: true, visit: v })} className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100">
                            <Pencil aria-hidden="true" className="size-4" />
                          </button>
                          <button
                            type="button"
                            aria-label="Ziyareti sil"
                            onClick={async () => {
                              if (confirm('Ziyaret kaydı silinsin mi?')) await deleteVisit(v.id);
                            }}
                            className="rounded-lg p-1.5 text-slate-500 hover:bg-red-50 hover:text-alert"
                          >
                            <Trash2 aria-hidden="true" className="size-4" />
                          </button>
                        </span>
                      </header>
                      <p className="mt-2 text-sm text-slate-700">{v.summary}</p>
                      {v.objections_raised && <p className="mt-2 rounded-lg bg-red-50 px-3 py-2 text-xs text-red-900"><strong>İtiraz:</strong> {v.objections_raised}</p>}
                      {v.next_action && (
                        <footer className="mt-3 flex items-center gap-2 border-t border-slate-100 pt-2.5 text-xs">
                          <button type="button" onClick={() => toggleVisitAction(v.id)} aria-label="Aksiyon durumunu değiştir" aria-pressed={v.is_action_completed} className="text-slate-500 hover:text-emerald-600">
                            {v.is_action_completed ? <CheckCircle2 aria-hidden="true" className="size-4 text-emerald-600" /> : <Circle aria-hidden="true" className="size-4" />}
                          </button>
                          <span className={cn(v.is_action_completed && 'line-through text-slate-400')}>
                            <strong>Sonraki aksiyon:</strong> {v.next_action} {v.next_action_date && `(${fmtDate(v.next_action_date)})`}
                          </span>
                        </footer>
                      )}
                    </Card>
                  </li>
                );
              })}
            </ol>
          )}
        </section>
      )}

      {/* 4) TEKLİFLER & ÜTS SİPARİŞLERİ */}
      {tab === 'deals' && (
        <section aria-label="Teklifler ve siparişler">
          <header className="mb-3 flex justify-end">
            <button type="button" className={btn('primary')} onClick={() => setDealModal({ open: true, deal: null })}>
              <Plus aria-hidden="true" className="size-4" /> Yeni Teklif / Sipariş
            </button>
          </header>
          {deals.length === 0 ? (
            <EmptyState title="Henüz teklif veya sipariş yok" />
          ) : (
            <ul className="space-y-3">
              {deals.map((d) => (
                <li key={d.id}>
                  <Card as="article" className="flex flex-wrap items-center justify-between gap-4 p-4">
                    <div className="min-w-0 flex-1">
                      <p className="flex flex-wrap items-center gap-2">
                        <strong className="text-navy">{d.order_type}</strong>
                        <Badge className="bg-slate-100 text-slate-800">{d.status}</Badge>
                        <button
                          type="button"
                          onClick={() => updateDeal(d.id, { uts_notification_done: !d.uts_notification_done })}
                          aria-pressed={d.uts_notification_done}
                          className={cn('rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset', d.uts_notification_done ? 'bg-emerald-50 text-emerald-800 ring-emerald-600/20' : 'bg-amber-50 text-amber-800 ring-amber-600/20')}
                        >
                          ÜTS: {d.uts_notification_done ? 'Bildirildi ✓' : 'Bekliyor'}
                        </button>
                      </p>
                      {d.items_summary && <p className="mt-1 text-sm text-slate-700">{d.items_summary}</p>}
                      {d.expected_close_date && <small className="text-xs text-slate-500">Beklenen kapanış: {fmtDate(d.expected_close_date)}</small>}
                    </div>
                    <p className="text-lg font-bold text-navy">{fmtUSD(d.total_amount_usd)}</p>
                    <span className="flex gap-1">
                      <button type="button" aria-label="Teklifi düzenle" onClick={() => setDealModal({ open: true, deal: d })} className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100">
                        <Pencil aria-hidden="true" className="size-4" />
                      </button>
                      <button
                        type="button"
                        aria-label="Teklifi sil"
                        onClick={async () => {
                          if (confirm('Teklif/sipariş silinsin mi?')) await deleteDeal(d.id);
                        }}
                        className="rounded-lg p-1.5 text-slate-500 hover:bg-red-50 hover:text-alert"
                      >
                        <Trash2 aria-hidden="true" className="size-4" />
                      </button>
                    </span>
                  </Card>
                </li>
              ))}
            </ul>
          )}
        </section>
      )}

      <HospitalModal open={editHosp} onClose={() => setEditHosp(false)} hospital={hospital} />
      <ContactModal open={contactModal.open} onClose={() => setContactModal({ open: false })} hospitalId={hospital.id} contact={contactModal.contact} />
      <InventoryModal open={invModal.open} onClose={() => setInvModal({ open: false })} hospitalId={hospital.id} item={invModal.item} />
      <VisitModal open={visitModal.open} onClose={() => setVisitModal({ open: false })} hospitalId={hospital.id} visit={visitModal.visit} />
      <DealModal open={dealModal.open} onClose={() => setDealModal({ open: false })} hospitalId={hospital.id} deal={dealModal.deal} />
      <SurgeryCaseModal open={surgeryOpen} onClose={() => setSurgeryOpen(false)} hospitalId={hospital.id} />
      <OpenBoxPrompt itemId={boxPrompt} onClose={() => setBoxPrompt(null)} />
    </>
  );
}
