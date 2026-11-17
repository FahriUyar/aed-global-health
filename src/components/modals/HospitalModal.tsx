import { useState, type FormEvent } from 'react';
import { Modal, TextField, SelectField, TextAreaField, CheckboxField, btn } from '../ui';
import { useCRM } from '../../context/CRMContext';
import { useToast } from '../ui/Toast';
import { ACQUISITION_MODELS, HOSPITAL_TYPES, PIPELINE_STAGES, type Hospital, type HospitalInput } from '../../types/database';
import { TURKISH_CITIES } from '../../lib/domain';

const empty: HospitalInput = {
  city: 'Ankara',
  district: '',
  name: '',
  hospital_type: 'Şehir Hastanesi',
  pipeline_stage: 'İstihbarat',
  acquisition_model: 'Belirsiz',
  has_davinci: false,
  davinci_model: '',
  toumai_installed: false,
  installation_date: null,
  weekly_urology_cases: 0,
  weekly_general_surgery_cases: 0,
  weekly_gynecology_cases: 0,
  weekly_thoracic_cases: 0,
  or_floor_info: '',
  general_notes: '',
};

interface Props {
  open: boolean;
  onClose: () => void;
  hospital?: Hospital | null;
  onSaved?: (h: Hospital) => void;
}

export function HospitalModal({ open, onClose, hospital, onSaved }: Props) {
  return (
    <Modal open={open} onClose={onClose} title={hospital ? 'Hastaneyi Düzenle' : 'Yeni Hastane Ekle'} description="Hastane istihbaratı, vaka potansiyeli ve rakip durumu" size="xl">
      <HospitalForm hospital={hospital} onClose={onClose} onSaved={onSaved} />
    </Modal>
  );
}

function HospitalForm({ hospital, onClose, onSaved }: Omit<Props, 'open'>) {
  const { addHospital, updateHospital } = useCRM();
  const { notify } = useToast();
  const [f, setF] = useState<HospitalInput>(() => {
    if (!hospital) return empty;
    const { id: _id, created_at: _c, updated_at: _u, ...rest } = hospital;
    void _id; void _c; void _u;
    return rest;
  });
  const [saving, setSaving] = useState(false);
  const set = <K extends keyof HospitalInput>(k: K, v: HospitalInput[K]) => setF((p) => ({ ...p, [k]: v }));
  const num = (v: string) => Math.max(0, Math.round(Number(v) || 0));

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!f.name.trim()) return notify('Hastane adı zorunludur.', 'error');
    setSaving(true);
    const payload: HospitalInput = {
      ...f,
      name: f.name.trim(),
      district: f.district?.trim() || null,
      davinci_model: f.has_davinci ? f.davinci_model?.trim() || null : null,
      installation_date: f.toumai_installed ? f.installation_date || null : null,
      or_floor_info: f.or_floor_info?.trim() || null,
      general_notes: f.general_notes?.trim() || null,
      pipeline_stage: f.toumai_installed && f.pipeline_stage !== 'Askıda / Kaybedildi' ? 'Kurulum Yapıldı (Aktif Sarf Müşterisi)' : f.pipeline_stage,
    };
    try {
      if (hospital) {
        await updateHospital(hospital.id, payload);
        notify('Hastane güncellendi.');
        onSaved?.({ ...hospital, ...payload });
      } else {
        const h = await addHospital(payload);
        notify('Hastane eklendi.');
        onSaved?.(h);
      }
      onClose();
    } catch {
      /* hata bildirimi veri katmanında */
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={submit} className="space-y-5">
      <fieldset className="grid gap-4 sm:grid-cols-2">
        <legend className="mb-2 text-sm font-semibold text-navy">Temel Bilgiler</legend>
        <TextField label="Hastane Adı *" id="h-name" required value={f.name} onChange={(e) => set('name', e.target.value)} placeholder="Örn: Bilkent Şehir Hastanesi" className="sm:col-span-2" />
        <SelectField label="Şehir *" id="h-city" options={TURKISH_CITIES} value={f.city} onChange={(e) => set('city', e.target.value)} />
        <TextField label="İlçe" id="h-district" value={f.district ?? ''} onChange={(e) => set('district', e.target.value)} placeholder="Örn: Çankaya" />
        <SelectField label="Hastane Tipi" id="h-type" options={HOSPITAL_TYPES} value={f.hospital_type} onChange={(e) => set('hospital_type', e.target.value as HospitalInput['hospital_type'])} />
        <SelectField label="Pipeline Aşaması" id="h-stage" options={PIPELINE_STAGES} value={f.pipeline_stage} onChange={(e) => set('pipeline_stage', e.target.value as HospitalInput['pipeline_stage'])} />
        <SelectField label="Edinim Modeli" id="h-model" options={ACQUISITION_MODELS} value={f.acquisition_model} onChange={(e) => set('acquisition_model', e.target.value as HospitalInput['acquisition_model'])} className="sm:col-span-2" />
      </fieldset>

      <fieldset className="grid gap-4 sm:grid-cols-4">
        <legend className="mb-2 text-sm font-semibold text-navy">Haftalık Robotik Vaka Potansiyeli</legend>
        <TextField label="Üroloji" id="h-uro" type="number" min={0} inputMode="numeric" value={f.weekly_urology_cases} onChange={(e) => set('weekly_urology_cases', num(e.target.value))} />
        <TextField label="Genel Cerrahi" id="h-gs" type="number" min={0} inputMode="numeric" value={f.weekly_general_surgery_cases} onChange={(e) => set('weekly_general_surgery_cases', num(e.target.value))} />
        <TextField label="Jinekoloji" id="h-gyn" type="number" min={0} inputMode="numeric" value={f.weekly_gynecology_cases} onChange={(e) => set('weekly_gynecology_cases', num(e.target.value))} />
        <TextField label="Göğüs / Pediatrik" id="h-tho" type="number" min={0} inputMode="numeric" value={f.weekly_thoracic_cases} onChange={(e) => set('weekly_thoracic_cases', num(e.target.value))} />
      </fieldset>

      <fieldset className="grid gap-4 sm:grid-cols-2">
        <legend className="mb-2 text-sm font-semibold text-navy">Rakip & Kurulum Durumu</legend>
        <CheckboxField label="Hastanede Da Vinci (Intuitive) robotu var" id="h-dv" checked={f.has_davinci} onChange={(e) => set('has_davinci', e.target.checked)} />
        <CheckboxField label="Toumai® MT-1000 kuruldu" id="h-tm" checked={f.toumai_installed} onChange={(e) => set('toumai_installed', e.target.checked)} />
        {f.has_davinci && (
          <TextField label="Da Vinci Modeli & Şikayetler" id="h-dvm" value={f.davinci_model ?? ''} onChange={(e) => set('davinci_model', e.target.value)} placeholder="Xi / X / Si — sarf maliyeti, servis süresi…" className="sm:col-span-2" />
        )}
        {f.toumai_installed && (
          <TextField label="Kurulum Tarihi" id="h-idate" type="date" value={f.installation_date ?? ''} onChange={(e) => set('installation_date', e.target.value || null)} />
        )}
      </fieldset>

      <fieldset className="grid gap-4">
        <legend className="mb-2 text-sm font-semibold text-navy">Saha Notları</legend>
        <TextAreaField label="Ameliyathane Kat / Giriş Tarifi" id="h-or" value={f.or_floor_info ?? ''} onChange={(e) => set('or_floor_info', e.target.value)} placeholder="-1 kat, B blok personel girişi…" />
        <TextAreaField label="Genel Notlar / İstihbarat" id="h-notes" value={f.general_notes ?? ''} onChange={(e) => set('general_notes', e.target.value)} />
      </fieldset>

      <footer className="flex justify-end gap-2 border-t border-slate-200 pt-4">
        <button type="button" className={btn('secondary')} onClick={onClose}>
          Vazgeç
        </button>
        <button type="submit" className={btn('primary')} disabled={saving}>
          {saving ? 'Kaydediliyor…' : 'Kaydet'}
        </button>
      </footer>
    </form>
  );
}
