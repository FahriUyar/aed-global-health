import { useState, type FormEvent } from 'react';
import { Modal, TextField, SelectField, TextAreaField, CheckboxField, btn } from '../ui';
import { useCRM } from '../../context/CRMContext';
import { useToast } from '../ui/Toast';
import { ATTITUDES, CONTACT_ROLES, DEPARTMENTS, type Contact, type ContactInput } from '../../types/database';

interface Props {
  open: boolean;
  onClose: () => void;
  hospitalId: string;
  contact?: Contact | null;
}

export function ContactModal({ open, onClose, hospitalId, contact }: Props) {
  return (
    <Modal open={open} onClose={onClose} title={contact ? 'Kişiyi Düzenle' : 'Yeni Karar Verici Ekle'} description="İletişim bilgileri, tutum ve kişisel istihbarat notları" size="xl">
      <ContactForm onClose={onClose} hospitalId={hospitalId} contact={contact} />
    </Modal>
  );
}

function ContactForm({ onClose, hospitalId, contact }: Omit<Props, 'open'>) {
  const { addContact, updateContact } = useCRM();
  const { notify } = useToast();
  const [saving, setSaving] = useState(false);
  const [f, setF] = useState<ContactInput>(() =>
    contact
      ? (({ id: _i, created_at: _c, ...rest }) => (void _i, void _c, rest))(contact)
      : {
          hospital_id: hospitalId,
          full_name: '',
          title: '',
          role: 'Cerrah (Hoca)',
          department: 'Üroloji',
          phone: '',
          email: '',
          attitude: 'Nötr',
          best_visit_time: '',
          personal_notes: '',
          is_key_decision_maker: false,
        },
  );
  const set = <K extends keyof ContactInput>(k: K, v: ContactInput[K]) => setF((p) => ({ ...p, [k]: v }));

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!f.full_name.trim()) return notify('Ad soyad zorunludur.', 'error');
    setSaving(true);
    const payload: ContactInput = {
      ...f,
      full_name: f.full_name.trim(),
      title: f.title?.trim() || null,
      phone: f.phone?.trim() || null,
      email: f.email?.trim() || null,
      best_visit_time: f.best_visit_time?.trim() || null,
      personal_notes: f.personal_notes?.trim() || null,
    };
    try {
      if (contact) await updateContact(contact.id, payload);
      else await addContact(payload);
      notify(contact ? 'Kişi güncellendi.' : 'Kişi eklendi.');
      onClose();
    } catch {
      /* veri katmanı bildirir */
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={submit} className="grid gap-4 sm:grid-cols-2">
      <TextField label="Ad Soyad *" id="c-name" required value={f.full_name} onChange={(e) => set('full_name', e.target.value)} placeholder="Prof. Dr. Ahmet Yılmaz" />
      <TextField label="Unvan" id="c-title" value={f.title ?? ''} onChange={(e) => set('title', e.target.value)} placeholder="Prof. Dr., Başhemşire, Biyomedikal Müh." />
      <SelectField label="Rol" id="c-role" options={CONTACT_ROLES} value={f.role} onChange={(e) => set('role', e.target.value as ContactInput['role'])} />
      <SelectField label="Bölüm" id="c-dept" options={DEPARTMENTS} value={f.department ?? 'Diğer'} onChange={(e) => set('department', e.target.value as ContactInput['department'])} />
      <TextField label="Telefon" id="c-phone" type="tel" inputMode="tel" autoComplete="tel" value={f.phone ?? ''} onChange={(e) => set('phone', e.target.value)} placeholder="+90 5xx xxx xx xx" />
      <TextField label="E-posta" id="c-email" type="email" autoComplete="email" value={f.email ?? ''} onChange={(e) => set('email', e.target.value)} />
      <SelectField label="Tutum" id="c-att" options={ATTITUDES} value={f.attitude} onChange={(e) => set('attitude', e.target.value as ContactInput['attitude'])} />
      <TextField label="En Uygun Ziyaret Saati" id="c-time" value={f.best_visit_time ?? ''} onChange={(e) => set('best_visit_time', e.target.value)} placeholder="Salı-Perşembe 10:30 vizit sonrası" />
      <TextAreaField label="Kişisel Notlar" id="c-notes" className="sm:col-span-2" value={f.personal_notes ?? ''} onChange={(e) => set('personal_notes', e.target.value)} placeholder="Çay/kahve tercihi, sekreterinin adı, hassasiyetleri…" />
      <CheckboxField label="Kilit karar verici" id="c-key" checked={f.is_key_decision_maker} onChange={(e) => set('is_key_decision_maker', e.target.checked)} className="sm:col-span-2" />
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
