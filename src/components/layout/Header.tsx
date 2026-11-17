import { useState } from 'react';
import { Bot, Cloud, CloudOff, Database, RefreshCw, Settings } from 'lucide-react';
import { useCRM } from '../../context/CRMContext';
import { SettingsModal } from '../modals/SettingsModal';
import { cn, fmtDate } from '../../lib/domain';

export function Header() {
  const { mode, pendingOps, refresh, lastSyncedAt, session } = useCRM();
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [spinning, setSpinning] = useState(false);

  const status =
    mode === 'cloud'
      ? { icon: Cloud, text: 'Bulut Senkronizasyonu Aktif', cls: 'bg-emerald-50 text-emerald-800 ring-emerald-600/20' }
      : mode === 'cloud-offline'
        ? { icon: CloudOff, text: `Çevrimdışı — Son senkron: ${fmtDate(lastSyncedAt)}${pendingOps ? ` · ${pendingOps} bekleyen değişiklik` : ''}`, cls: 'bg-amber-50 text-amber-900 ring-amber-600/30' }
        : { icon: Database, text: 'Çevrimdışı / Yerel Depolama Modu Aktif — Supabase Bağlantısı Bekleniyor', cls: 'bg-sky-50 text-sky-900 ring-sky-600/20' };
  const Icon = status.icon;

  return (
    <header className="no-print sticky top-0 z-30 border-b border-slate-200 bg-white/90 backdrop-blur">
      <section className="flex items-center gap-3 px-4 py-3 lg:px-8">
        <span className="grid size-9 place-items-center rounded-xl bg-navy text-white lg:hidden">
          <Bot aria-hidden="true" className="size-5" />
        </span>
        <p className="min-w-0 flex-1">
          <button
            type="button"
            onClick={() => setSettingsOpen(true)}
            className={cn('inline-flex max-w-full items-center gap-1.5 truncate rounded-full px-3 py-1 text-xs font-medium ring-1 ring-inset', status.cls)}
            title={status.text}
          >
            <Icon aria-hidden="true" className="size-3.5 shrink-0" />
            <span className="truncate">{status.text}</span>
            {mode !== 'cloud' && mode !== 'cloud-offline' && <span className="relative ml-1 hidden size-2 rounded-full bg-sky-500 sm:inline-block" aria-hidden="true" />}
          </button>
        </p>
        {session?.user?.email && <span className="hidden text-xs text-slate-500 md:inline">{session.user.email}</span>}
        <button
          type="button"
          aria-label="Verileri yenile"
          onClick={async () => {
            setSpinning(true);
            await refresh();
            setSpinning(false);
          }}
          className="rounded-lg p-2 text-slate-600 hover:bg-slate-100"
        >
          <RefreshCw aria-hidden="true" className={cn('size-5', spinning && 'animate-spin')} />
        </button>
        <button type="button" aria-label="Bağlantı ve veri ayarları" onClick={() => setSettingsOpen(true)} className="rounded-lg p-2 text-slate-600 hover:bg-slate-100">
          <Settings aria-hidden="true" className="size-5" />
        </button>
      </section>
      <SettingsModal open={settingsOpen} onClose={() => setSettingsOpen(false)} />
    </header>
  );
}
