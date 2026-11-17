// Supabase tablolarının sıkı TypeScript arayüzleri (supabase/schema.sql ile birebir)

export const HOSPITAL_TYPES = [
  'Şehir Hastanesi',
  'Üniversite',
  'Özel Zincir',
  'Özel Bağımsız',
  'Devlet Eğitim Araştırma',
] as const;
export type HospitalType = (typeof HOSPITAL_TYPES)[number];

export const PIPELINE_STAGES = [
  'İstihbarat',
  'İlk Temas Kuruldu',
  'Klinik Demo Planlandı',
  'Şartname / Biyomedikal Aşamasında',
  'Ticari Pazarlık / İhale',
  'Kurulum Yapıldı (Aktif Sarf Müşterisi)',
  'Askıda / Kaybedildi',
] as const;
export type PipelineStage = (typeof PIPELINE_STAGES)[number];

export const ACQUISITION_MODELS = [
  'Belirsiz',
  'Doğrudan Satış',
  'Sarf Karşılığı Kurulum (Konsinye)',
  'Leasing',
  'DMO / Kamu İhalesi',
] as const;
export type AcquisitionModel = (typeof ACQUISITION_MODELS)[number];

export const CONTACT_ROLES = [
  'Cerrah (Hoca)',
  'Anabilim Dalı / Klinik Şefi',
  'Ameliyathane Sorumlu Hemşiresi',
  'Sarf Depo Sorumlusu',
  'Biyomedikal Mühendisi / Müdürü',
  'Satın Alma Müdürü / İhale Komisyonu',
  'Başhekim / Hastane Direktörü',
  'Bölüm Sekreteri / Asistan',
] as const;
export type ContactRole = (typeof CONTACT_ROLES)[number];

export const DEPARTMENTS = [
  'Üroloji',
  'Genel Cerrahi',
  'Jinekoloji',
  'Göğüs Cerrahisi',
  'Pediatrik Cerrahi',
  'Ameliyathane / MSÜ',
  'İdari / Satın Alma',
  'Biyomedikal',
  'Diğer',
] as const;
export type Department = (typeof DEPARTMENTS)[number];

export const ATTITUDES = [
  'Çok Sıcak (Destekçi)',
  'Sıcak',
  'Nötr',
  'Mesafeli',
  'Rakip (Da Vinci) Yanlısı',
] as const;
export type Attitude = (typeof ATTITUDES)[number];

export const INSTRUMENT_CATEGORIES = [
  'İğne Tutucu (Needle Driver)',
  'Bipolar Enerji',
  'Monopolar Enerji',
  'Doku Tutucu (Grasper)',
  'Klip Aplikatörü',
  'Ultrasonik Enerji',
  'Tam Sarf (Disposable)',
  'Eğitim Serisi (-T)',
] as const;
export type InstrumentCategory = (typeof INSTRUMENT_CATEGORIES)[number];

export const VISIT_TYPES = [
  'Tanışma / İlk Ziyaret',
  'Klinik Sunum / Video Gösterimi',
  'Ameliyathane Vaka Desteği / Demo',
  'Sarf Stok & Can Kontrolü',
  'Biyomedikal / Şartname Görüşmesi',
  'Satın Alma / Fiyat Pazarlığı',
  'Telefon / Online Görüşme',
] as const;
export type VisitType = (typeof VISIT_TYPES)[number];

export const ORDER_TYPES = [
  'Demirbaş Robot Satışı',
  'Sarf Karşılığı Cihaz Kurulumu',
  'Rutin Sarf & Enstrüman Siparişi',
  'DMO / Kamu İhalesi',
] as const;
export type OrderType = (typeof ORDER_TYPES)[number];

export const ORDER_STATUSES = [
  'Hazırlık',
  'Teklif Verildi',
  'İhale / Komisyon Bekliyor',
  'Onaylandı / Sevk Edildi',
  'Faturalandı',
  'İptal',
] as const;
export type OrderStatus = (typeof ORDER_STATUSES)[number];

/** Açık (henüz sonuçlanmamış) teklif durumları */
export const OPEN_ORDER_STATUSES: OrderStatus[] = ['Hazırlık', 'Teklif Verildi', 'İhale / Komisyon Bekliyor'];

export interface Hospital {
  id: string;
  city: string;
  district: string | null;
  name: string;
  hospital_type: HospitalType;
  pipeline_stage: PipelineStage;
  acquisition_model: AcquisitionModel;
  has_davinci: boolean;
  davinci_model: string | null;
  toumai_installed: boolean;
  installation_date: string | null;
  weekly_urology_cases: number;
  weekly_general_surgery_cases: number;
  weekly_gynecology_cases: number;
  weekly_thoracic_cases: number;
  or_floor_info: string | null;
  general_notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface Contact {
  id: string;
  hospital_id: string;
  full_name: string;
  title: string | null;
  role: ContactRole;
  department: Department | null;
  phone: string | null;
  email: string | null;
  attitude: Attitude;
  best_visit_time: string | null;
  personal_notes: string | null;
  is_key_decision_maker: boolean;
  created_at: string;
}

export const SPECIALTY_TAGS = [
  'Tüm Branşlar',
  'Üroloji',
  'Genel Cerrahi',
  'Jinekoloji',
  'Göğüs Cerrahisi',
  'Pediatrik Cerrahi',
  'Bariatrik',
  'Kolorektal',
] as const;

export interface Instrument {
  code: string;
  name_en: string;
  name_tr: string;
  category: InstrumentCategory | string;
  diameter_mm: number;
  shaft_diameter?: string | null;
  default_max_uses: number;
  unit_list_price_usd: number;
  clinical_usage_description: string;
  typical_branches: string | null;
  sut_code?: string | null;
  tender_spec_notes?: string | null;
  competitor_comparison?: string | null;
  image_url?: string | null;
}

export type InstrumentCatalogItem = Instrument;

export interface SpecialtyPresetItem {
  code: string;
  quantity: number;
}

export interface SpecialtyPreset {
  id: string;
  branch: string;
  title: string;
  procedures: string;
  items: SpecialtyPresetItem[];
}

export interface InventoryItem {
  id: string;
  hospital_id: string;
  instrument_code: string;
  boxed_stock_count: number;
  active_instrument_remaining_uses: number;
  min_critical_uses_threshold: number;
  avg_uses_per_week: number;
  last_checked_at: string;
  notes: string | null;
}

export interface Visit {
  id: string;
  hospital_id: string;
  contact_id: string | null;
  visit_date: string;
  visit_type: VisitType;
  summary: string;
  objections_raised: string | null;
  next_action: string | null;
  next_action_date: string | null;
  is_action_completed: boolean;
  created_at: string;
}

export interface DealOrder {
  id: string;
  hospital_id: string;
  order_type: OrderType;
  status: OrderStatus;
  total_amount_usd: number;
  uts_notification_done: boolean;
  items_summary: string | null;
  expected_close_date: string | null;
  notes: string | null;
  created_at: string;
}

export type HospitalInput = Omit<Hospital, 'id' | 'created_at' | 'updated_at'>;
export type ContactInput = Omit<Contact, 'id' | 'created_at'>;
export type InventoryInput = Omit<InventoryItem, 'id' | 'last_checked_at'>;
export type VisitInput = Omit<Visit, 'id' | 'created_at'>;
export type DealInput = Omit<DealOrder, 'id' | 'created_at'>;

export interface CRMData {
  hospitals: Hospital[];
  contacts: Contact[];
  catalog: Instrument[];
  inventory: InventoryItem[];
  visits: Visit[];
  deals: DealOrder[];
}

export type TableName = 'hospitals' | 'contacts' | 'instrument_catalog' | 'hospital_inventory' | 'visits' | 'deals_orders';
