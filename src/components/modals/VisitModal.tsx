import { useMemo, useState, type FormEvent } from 'react';
import { Modal, TextField, SelectField, TextAreaField, CheckboxField, btn } from '../ui';
import { useCRM } from '../../context/CRMContext';
import { useToast } from '../ui/Toast';
import { VISIT_TYPES, type Visit, type VisitInput } from '../../types/database';
import { todayISO } from '../../lib/domain';

interface Props {
  open: boolean;
  onClose: () => void;
  hospitalId?: string;
  visit?: Visit | null;
}

export function VisitModal({ open, onClose, hospitalId, visit }: Props) {
  return (
    <Modal open={open} onClose={onClose} title={visit ? 'Ziyareti Düzenle' : 'Ziyaret / Görüşme Kaydı'} description="Görüşme tutanağı, itirazlar ve sonraki aksiyon hatırlatıcısı" size="xl">
      <VisitForm onClose={onClose} hospitalId={hospitalId} visit={visit} />
    </Modal>
  );
}

function VisitForm({ onClose, hospitalId, visit }: Omit<Props, 'open'>) {
  const { data, addVisit, updateVisit } = useCRM();
  const { notify } = useToast();
  const [saving, setSaving] = useState(false);
  const [f, setF] = useState<VisitInput>(() =>
    visit
      ? (({ id: _i, created_at: _c, ...rest }) => (void _i, void _c, rest))(visit)
      : {
          hospital_id: hospitalId ?? data.hospitals[0]?.id ?? '',
          contact_id: null,
          visit_date: todayISO(),
          visit_type: 'Tanışma / İlk Ziyaret',
          summary: '',
          objections_raised: '',
          next_action: '',
          next_action_date: null,
          is_action_completed: false,
        },
  );
  const set = <K extends keyof VisitInput>(k: K, v: VisitInput[K]) => setF((p) => ({ ...p, [k]: v }));
  const contacts = useMemo(() => data.contacts.filter((c) => c.hospital_id === f.hospital_id), [data.contacts, f.hospital_id]);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!f.hospital_id) return notify('Hastane seçin.', 'error');
    if (!f.summary.trim()) return notify('Görüşme özeti zorunludur.', 'error');
    setSaving(true);
    const payload: VisitInput = {
      ...f,
      summary: f.summary.trim(),
      objections_raised: f.objections_raised?.trim() || null,
      next_action: f.next_action?.trim() || null,
      next_action_date: f.next_action_date || null,
    };
    try {
      if (visit) await updateVisit(visit.id, payload);
      else await addVisit(payload);
      notify(visit ? 'Ziyaret güncellendi.' : 'Ziyaret kaydedildi.');
      onClose();
    } catch {
      /* veri katmanı bildirir */
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={submit} className="grid gap-4 sm:grid-cols-2">
      {!hospitalId && (
        <SelectField
          label="Hastane *"
          id="v-h"
          className="sm:col-span-2"
          options={data.hospitals.map((h) => ({ value: h.id, label: `${h.city} — ${h.name}` }))}
          value={f.hospital_id}
          onChange={(e) => setF((p) => ({ ...p, hospital_id: e.target.value, contact_id: null }))}
        />
      )}
      <TextField label="Ziyaret Tarihi" id="v-date" type="date" required value={f.visit_date} onChange={(e) => set('visit_date', e.target.value)} />
      <SelectField label="Görüşme Tipi" id="v-type" options={VISIT_TYPES} value={f.visit_type} onChange={(e) => set('visit_type', e.target.value as VisitInput['visit_type'])} />
      <SelectField
        label="Görüşülen Kişi"
        id="v-contact"
        className="sm:col-span-2"
        options={[{ value: '', label: '— Seçilmedi —' }, ...contacts.map((c) => ({ value: c.id, label: `${c.full_name} (${c.role})` }))]}
        value={f.contact_id ?? ''}
        onChange={(e) => set('contact_id', e.target.value || null)}
      />
      <TextAreaField label="Görüşme Özeti *" id="v-sum" required className="sm:col-span-2" value={f.summary} onChange={(e) => set('summary', e.target.value)} />
      <TextAreaField label="Dile Getirilen İtirazlar" id="v-obj" className="sm:col-span-2" value={f.objections_raised ?? ''} onChange={(e) => set('objections_raised', e.target.value)} />
      <TextField label="Sonraki Aksiyon" id="v-next" value={f.next_action ?? ''} onChange={(e) => set('next_action', e.target.value)} placeholder="Teklif gönder, demo tarihi kesinleştir…" />
      <TextField label="Hatırlatıcı Tarihi" id="v-ndate" type="date" value={f.next_action_date ?? ''} onChange={(e) => set('next_action_date', e.target.value || null)} />
      {visit && <CheckboxField label="Aksiyon tamamlandı" id="v-done" checked={f.is_action_completed} onChange={(e) => set('is_action_completed', e.target.checked)} />}
      <footer className="flex justify-end gap-2 border-t border-slate-200 pt-4 sm:col-span-2">
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
