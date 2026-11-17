import { useState } from 'react';
import { CloudOff, Download, KeyRound, LogOut, RotateCcw, Upload } from 'lucide-react';
import { Modal, TextField, btn } from '../ui';
import { useCRM } from '../../context/CRMContext';
import { useToast } from '../ui/Toast';
import { getConfigSource, getSupabaseConfig, localStore, saveSupabaseConfig, setForceOffline } from '../../lib/supabase';
import { downloadJSON, todayISO } from '../../lib/domain';

export function SettingsModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { mode, data, signOut, resetLocalData, uploadLocalToCloud, session, continueOffline } = useCRM();
  const { notify } = useToast();
  const current = getSupabaseConfig();
  const source = getConfigSource();
  const [url, setUrl] = useState(current?.url ?? '');
  const [key, setKey] = useState(current?.anonKey ?? '');
  const [busy, setBusy] = useState(false);

  const save = () => {
    if (!/^https:\/\/.+\.supabase\.(co|in)\/?$/.test(url.trim()) && !/^https:\/\//.test(url.trim())) {
      notify('Geçerli bir https:// Supabase URL girin.', 'error');
      return;
    }
    if (key.trim().length < 20) {
      notify('Anon (public) anahtar geçersiz görünüyor.', 'error');
      return;
    }
    saveSupabaseConfig({ url: url.trim(), anonKey: key.trim() });
    setForceOffline(false);
    notify('Bağlantı kaydedildi, bulut moduna geçiliyor…', 'success');
    setTimeout(() => window.location.reload(), 600);
  };

  const hasLocal = !!localStore.readOffline();

  return (
    <Modal open={open} onClose={onClose} title="Bağlantı ve Veri Ayarları" description="Supabase bulut senkronizasyonu, yedekleme ve çevrimdışı veri yönetimi.">
      <section aria-labelledby="sb-h" className="space-y-3">
        <h3 id="sb-h" className="flex items-center gap-2 font-semibold text-navy">
          <KeyRound aria-hidden="true" className="size-4" /> Supabase Bağlantısı
        </h3>
        <p className="text-sm text-slate-600">
          {source === 'env'
            ? 'Bağlantı .env dosyasından okunuyor. Buradan girilen değerler .env ayarını geçersiz kılar.'
            : source === 'app'
              ? 'Bağlantı uygulama içinden kaydedildi (bu cihazda saklanır).'
              : 'Henüz bağlantı tanımlı değil. Bilgileri girdiğiniz an bulut senkronizasyonuna geçilir. Önce supabase/schema.sql dosyasını Supabase SQL Editor’de çalıştırın.'}
        </p>
        <TextField label="Project URL" id="sb-url" type="url" inputMode="url" placeholder="https://xxxx.supabase.co" value={url} onChange={(e) => setUrl(e.target.value)} autoComplete="off" />
        <TextField label="Anon (public) Key" id="sb-key" type="password" placeholder="eyJhbGciOi…" value={key} onChange={(e) => setKey(e.target.value)} autoComplete="off" />
        <p className="flex flex-wrap gap-2">
          <button type="button" className={btn('primary')} onClick={save}>
            Kaydet ve Bağlan
          </button>
          {source === 'app' && (
            <button
              type="button"
              className={btn('secondary')}
              onClick={() => {
                saveSupabaseConfig(null);
                window.location.reload();
              }}
            >
              Uygulama içi bağlantıyı kaldır
            </button>
          )}
          {(mode === 'cloud' || mode === 'cloud-offline') && (
            <button
              type="button"
              className={btn('secondary')}
              onClick={() => {
                continueOffline();
                onClose();
              }}
            >
              <CloudOff aria-hidden="true" className="size-4" /> Yerel moda geç
            </button>
          )}
          {mode === 'local' && current && (
            <button
              type="button"
              className={btn('secondary')}
              onClick={() => {
                setForceOffline(false);
                window.location.reload();
              }}
            >
              Buluta bağlan
            </button>
          )}
        </p>
      </section>

      <hr className="my-5 border-slate-200" />

      <section aria-labelledby="data-h" className="space-y-3">
        <h3 id="data-h" className="font-semibold text-navy">
          Veri Araçları
        </h3>
        <ul className="flex flex-wrap gap-2">
          <li>
            <button type="button" className={btn('secondary')} onClick={() => downloadJSON(`aed-crm-yedek-${todayISO()}.json`, data)}>
              <Download aria-hidden="true" className="size-4" /> JSON Yedek İndir
            </button>
          </li>
          {mode === 'cloud' && hasLocal && (
            <li>
              <button
                type="button"
                disabled={busy}
                className={btn('secondary')}
                onClick={async () => {
                  if (!confirm('Bu cihazdaki yerel (çevrimdışı) veriler Supabase’e yüklensin mi? Aynı kimlikli kayıtlar güncellenir.')) return;
                  setBusy(true);
                  try {
                    await uploadLocalToCloud();
                    notify('Yerel veriler buluta yüklendi.', 'success');
                  } catch (e) {
                    notify(`Yükleme başarısız: ${(e as Error).message}`, 'error');
                  } finally {
                    setBusy(false);
                  }
                }}
              >
                <Upload aria-hidden="true" className="size-4" /> Yerel Verileri Buluta Yükle
              </button>
            </li>
          )}
          {mode === 'local' && (
            <li>
              <button
                type="button"
                className={btn('secondary')}
                onClick={() => {
                  if (!confirm('Yerel veriler silinip örnek Türkiye veri seti yeniden yüklensin mi?')) return;
                  resetLocalData();
                  notify('Örnek veri seti yeniden yüklendi.', 'success');
                }}
              >
                <RotateCcw aria-hidden="true" className="size-4" /> Örnek Veriyi Sıfırla
              </button>
            </li>
          )}
          {session && (
            <li>
              <button
                type="button"
                className={btn('danger')}
                onClick={async () => {
                  await signOut();
                  onClose();
                }}
              >
                <LogOut aria-hidden="true" className="size-4" /> Oturumu Kapat
              </button>
            </li>
          )}
        </ul>
      </section>
    </Modal>
  );
}
