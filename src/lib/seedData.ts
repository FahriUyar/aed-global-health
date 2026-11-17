import type { CRMData, Contact, DealOrder, Hospital, Instrument, InventoryItem, Visit } from '../types/database';

// ---------------------------------------------------------------------------
// 1) RESMİ TOUMAI® MT-1000 ENSTRÜMAN VE SARF KATALOĞU (supabase/schema.sql ile aynı)
// ---------------------------------------------------------------------------
type CatalogRow = Omit<Instrument, 'diameter_mm'>;

const rows: CatalogRow[] = [
  { code: 'IN8031', name_en: 'Needle Driver', name_tr: 'Standart İğne Tutucu', category: 'İğne Tutucu (Needle Driver)', default_max_uses: 16, unit_list_price_usd: 1800, clinical_usage_description: 'İnce ve orta boy cerrahi iğneleri kavrayarak iç organlarda dikiş (sütür) atılmasını ve düğüm bağlanmasını sağlar.', typical_branches: 'Tüm Branşlar' },
  { code: 'IN8038', name_en: 'Large Needle Driver', name_tr: 'Büyük İğne Tutucu', category: 'İğne Tutucu (Needle Driver)', default_max_uses: 16, unit_list_price_usd: 1850, clinical_usage_description: 'Kalın dokularda (prostat anastomozu, rahim duvarı, mide) büyük eğri iğneleri kaydırmadan tutmak için güçlü çene yapısına sahiptir.', typical_branches: 'Üroloji, Jinekoloji, Genel Cerrahi' },
  { code: 'IN803E', name_en: 'Small Scissors Needle Driver', name_tr: 'Küçük Makaslı İğne Tutucu', category: 'İğne Tutucu (Needle Driver)', default_max_uses: 16, unit_list_price_usd: 1950, clinical_usage_description: 'Hem dikiş atar hem de çenesinin dip kısmındaki mini bıçakla dikiş ipini keser. Alet değişimini azaltır.', typical_branches: 'Üroloji, Pediatrik Cerrahi' },
  { code: 'IN803F', name_en: 'Large Scissors Needle Driver', name_tr: 'Büyük Makaslı İğne Tutucu', category: 'İğne Tutucu (Needle Driver)', default_max_uses: 16, unit_list_price_usd: 2000, clinical_usage_description: 'Kalın sütür iplerini hem dikmek hem de doğrudan kesmek için kullanılan kombine büyük boy iğne tutucudur.', typical_branches: 'Jinekoloji, Genel Cerrahi' },
  { code: 'IN8031-M', name_en: 'Micro Needle Driver', name_tr: 'Mikro İğne Tutucu (5. Varyant)', category: 'İğne Tutucu (Needle Driver)', default_max_uses: 16, unit_list_price_usd: 1900, clinical_usage_description: 'Dar açılı vasküler veya pediatrik rekonstrüksiyonlarda hassas sütür kontrolü sağlar.', typical_branches: 'Üroloji, Pediatrik, Göğüs' },
  { code: 'IN8036', name_en: 'Maryland Bipolar Forceps', name_tr: 'Maryland Bipolar Penset', category: 'Bipolar Enerji', default_max_uses: 16, unit_list_price_usd: 2100, clinical_usage_description: 'Cerrahların en çok kullandığı alettir. İnce kıvrık ucuyla hassas doku diseksiyonu yapar ve bipolar enerjiyle damarları yakarak kanamayı durdurur.', typical_branches: 'Tüm Branşlar (Her vakada açılır)' },
  { code: 'IN8033', name_en: 'Fenestrated Bipolar Forceps', name_tr: 'Pencereli Bipolar Penset', category: 'Bipolar Enerji', default_max_uses: 16, unit_list_price_usd: 2100, clinical_usage_description: 'Ortası pencereli geniş çenesiyle dokuyu nazikçe tutar ve geniş yüzeyli damar koagülasyonu yapar.', typical_branches: 'Genel Cerrahi, Jinekoloji, Üroloji' },
  { code: 'IN8035', name_en: 'Monopolar Curved Scissors', name_tr: 'Monopolar Eğri Makas', category: 'Monopolar Enerji', default_max_uses: 12, unit_list_price_usd: 1950, clinical_usage_description: 'Her ameliyatta mutlaka 1 adet açılır! Sağ kolda kullanılır; dokuları hem mekanik olarak keser hem de monopolar enerji ile yakar.', typical_branches: 'Tüm Branşlar (En hızlı tükenen sarf)' },
  { code: 'IN8032', name_en: 'Small Monopolar Cautery Hook', name_tr: 'Monopolar Koter Kancası', category: 'Monopolar Enerji', default_max_uses: 12, unit_list_price_usd: 1750, clinical_usage_description: 'L-şeklindeki kanca ucuyla safra kesesi, mide ve kolorektal cerrahide ince zarları askıya alıp yakarak kesmek için kullanılır.', typical_branches: 'Genel Cerrahi, Göğüs Cerrahisi' },
  { code: 'IN8037', name_en: 'Permanent Cautery Spatula', name_tr: 'Kalıcı Koter Spatulası', category: 'Monopolar Enerji', default_max_uses: 12, unit_list_price_usd: 1750, clinical_usage_description: 'Künt spatula ucuyla karaciğer yatağı veya geniş tümör yüzeylerinde künt diseksiyon ve yüzeysel kanama kontrolü sağlar.', typical_branches: 'Genel Cerrahi' },
  { code: 'IN803A', name_en: 'Cadiere Forceps', name_tr: 'Cadiere Doku Tutucu', category: 'Doku Tutucu (Grasper)', default_max_uses: 20, unit_list_price_usd: 1700, clinical_usage_description: 'Atravmatik diş yapısına sahiptir; bağırsak, mesane veya damar gibi hassas dokuları ezmeden tutmak ve çekmek için kullanılır.', typical_branches: 'Tüm Branşlar' },
  { code: 'IN803B', name_en: 'Strong Cadiere Forceps', name_tr: 'Güçlü Cadiere (ProGrasp Muadili)', category: 'Doku Tutucu (Grasper)', default_max_uses: 20, unit_list_price_usd: 1800, clinical_usage_description: 'Yüksek kavrama gücüne sahiptir; 4. kolda organları ameliyat boyunca sabit tutup ekarte etmekte (retraksiyon) kullanılır.', typical_branches: 'Üroloji, Genel Cerrahi' },
  { code: 'IN8039', name_en: 'Claw Forceps', name_tr: 'Pençe Dişli Tutucu', category: 'Doku Tutucu (Grasper)', default_max_uses: 20, unit_list_price_usd: 1750, clinical_usage_description: 'Sert ve kaygan dokuları (fasya, çıkarılacak tümörlü doku) kaçırmadan güçlü şekilde yakalamak için kullanılır.', typical_branches: 'Genel Cerrahi, Üroloji' },
  { code: 'IN803D', name_en: 'Tenaculum Forceps', name_tr: 'Tenakulum Tutucu', category: 'Doku Tutucu (Grasper)', default_max_uses: 20, unit_list_price_usd: 1800, clinical_usage_description: 'Jinekologların vazgeçilmezidir. Miyomektomi ve histerektomi ameliyatlarında sert rahim miyomlarını çengelli ucuyla tutup çekmek için kullanılır.', typical_branches: 'Jinekoloji' },
  { code: 'IN803G', name_en: 'Medium-Large Clip Applier', name_tr: 'Orta-Büyük Klip Atıcı (Yeşil Hem-o-Lok)', category: 'Klip Aplikatörü', default_max_uses: 20, unit_list_price_usd: 2200, clinical_usage_description: 'Damarları bağlamak için kullanılan Yeşil (Green) WECK Hem-o-Lok polimer klipleri damara takan 540° dönebilen aplikatördür.', typical_branches: 'Üroloji, Genel Cerrahi' },
  { code: 'IN803H', name_en: 'Large Clip Applier', name_tr: 'Büyük Klip Atıcı (Mor Hem-o-Lok)', category: 'Klip Aplikatörü', default_max_uses: 20, unit_list_price_usd: 2200, clinical_usage_description: 'Böbrek arteri gibi kalın damarları kapatmak için Mor (Purple) WECK Hem-o-Lok büyük boy kliplerle kullanılır.', typical_branches: 'Üroloji, Genel Cerrahi' },
  { code: 'IN803C', name_en: 'Ultrasound Shears', name_tr: 'Ultrasonik Harmonik Makas', category: 'Ultrasonik Enerji', default_max_uses: 1, unit_list_price_usd: 850, clinical_usage_description: 'TEK KULLANIMLIKTIR! Yüksek frekanslı ultrasonik titreşimle dokuyu keser ve 5 mm ye kadar damarları mühürler. Her vakada 1 adet satılır.', typical_branches: 'Genel Cerrahi, Bariatrik, Kolorektal' },
  { code: 'DRAPE-SET', name_en: 'Sterile Arm & Camera Drape Set', name_tr: 'Steril Robot Kol Kılıfı Seti (4 Kol)', category: 'Tam Sarf (Disposable)', default_max_uses: 1, unit_list_price_usd: 220, clinical_usage_description: 'Her ameliyatta robotun 4 koluna giydirilen tek kullanımlık steril şeffaf örtü setidir. Ayda kaç vaka varsa o kadar harcanır.', typical_branches: 'Tüm Branşlar (Her vakada 1 set)' },
  { code: 'SEAL-SET', name_en: '8mm Force Sensing Trocar Cannula Seal', name_tr: '8mm Trokar Kanül Contası ve Valf Seti', category: 'Tam Sarf (Disposable)', default_max_uses: 1, unit_list_price_usd: 95, clinical_usage_description: 'Hastanın karnındaki karbondioksit gazının kaçmasını önleyen tek kullanımlık trokar contasıdır.', typical_branches: 'Tüm Branşlar' },
];

export const INSTRUMENT_CATALOG: Instrument[] = rows.map((r) => ({
  ...r,
  diameter_mm: 8,
  shaft_diameter: '8 mm',
  sut_code: null,
  tender_spec_notes: null,
  competitor_comparison: null,
  image_url: null,
}));

// ---------------------------------------------------------------------------
// 2) TÜRKİYE ÖRNEK HASTANE / KİŞİ / STOK / ZİYARET / TEKLİF VERİLERİ (çevrimdışı mod)
//    Not: Kişi isimleri kurgusaldır.
// ---------------------------------------------------------------------------
const day = (offset: number): string => {
  const d = new Date();
  d.setDate(d.getDate() + offset);
  return d.toISOString().slice(0, 10);
};
const ts = (offset: number): string => {
  const d = new Date();
  d.setDate(d.getDate() + offset);
  return d.toISOString();
};

const H = {
  bilkent: '0b1e6f0a-0001-4a00-8000-000000000001',
  etlik: '0b1e6f0a-0002-4a00-8000-000000000002',
  hacettepe: '0b1e6f0a-0003-4a00-8000-000000000003',
  ege: '0b1e6f0a-0004-4a00-8000-000000000004',
  adana: '0b1e6f0a-0005-4a00-8000-000000000005',
  acibadem: '0b1e6f0a-0006-4a00-8000-000000000006',
  guven: '0b1e6f0a-0007-4a00-8000-000000000007',
  kayseri: '0b1e6f0a-0008-4a00-8000-000000000008',
  bursa: '0b1e6f0a-0009-4a00-8000-000000000009',
  mersin: '0b1e6f0a-0010-4a00-8000-000000000010',
  gaziantep: '0b1e6f0a-0011-4a00-8000-000000000011',
} as const;

type HSeed = Partial<Hospital> & Pick<Hospital, 'id' | 'city' | 'name' | 'hospital_type'>;
const hospital = (h: HSeed): Hospital => ({
  district: null,
  pipeline_stage: 'İstihbarat',
  acquisition_model: 'Belirsiz',
  has_davinci: false,
  davinci_model: null,
  toumai_installed: false,
  installation_date: null,
  weekly_urology_cases: 0,
  weekly_general_surgery_cases: 0,
  weekly_gynecology_cases: 0,
  weekly_thoracic_cases: 0,
  or_floor_info: null,
  general_notes: null,
  created_at: ts(-120),
  updated_at: ts(-2),
  ...h,
});

const hospitals: Hospital[] = [
  hospital({ id: H.bilkent, city: 'Ankara', district: 'Çankaya', name: 'Ankara Bilkent Şehir Hastanesi', hospital_type: 'Şehir Hastanesi', pipeline_stage: 'Kurulum Yapıldı (Aktif Sarf Müşterisi)', acquisition_model: 'Sarf Karşılığı Kurulum (Konsinye)', toumai_installed: true, installation_date: day(-160), weekly_urology_cases: 5, weekly_general_surgery_cases: 3, weekly_gynecology_cases: 2, weekly_thoracic_cases: 1, or_floor_info: 'Ana Hastane, -1 kat Merkez Ameliyathane, Salon 14 robotik salon. Personel girişi B blok.', general_notes: 'Referans merkezimiz. Proktorluk programı için uygun.' }),
  hospital({ id: H.etlik, city: 'Ankara', district: 'Yenimahalle', name: 'Ankara Etlik Şehir Hastanesi', hospital_type: 'Şehir Hastanesi', pipeline_stage: 'Klinik Demo Planlandı', acquisition_model: 'Sarf Karşılığı Kurulum (Konsinye)', weekly_urology_cases: 4, weekly_general_surgery_cases: 4, weekly_gynecology_cases: 2, weekly_thoracic_cases: 1, or_floor_info: 'Genel Hastane binası, 2. kat ameliyathaneler.', general_notes: 'Üroloji kliniği robotik program açmak istiyor. Demo için tarih kesinleşecek.' }),
  hospital({ id: H.hacettepe, city: 'Ankara', district: 'Altındağ', name: 'Hacettepe Üniversitesi Erişkin Hastanesi', hospital_type: 'Üniversite', pipeline_stage: 'İlk Temas Kuruldu', has_davinci: true, davinci_model: 'Da Vinci Xi — sarf maliyetlerinden ve servis bekleme sürelerinden şikayet var.', weekly_urology_cases: 6, weekly_general_surgery_cases: 3, weekly_gynecology_cases: 3, weekly_thoracic_cases: 2, or_floor_info: 'Merkez Ameliyathane 3. kat.', general_notes: 'İkinci robot ihtiyacı konuşuluyor. Akademik çalışma ilgisi yüksek.' }),
  hospital({ id: H.ege, city: 'İzmir', district: 'Bornova', name: 'Ege Üniversitesi Tıp Fakültesi Hastanesi', hospital_type: 'Üniversite', pipeline_stage: 'Şartname / Biyomedikal Aşamasında', acquisition_model: 'DMO / Kamu İhalesi', has_davinci: true, davinci_model: 'Da Vinci Si — eski nesil, enstrüman tedarikinde gecikmeler.', weekly_urology_cases: 5, weekly_general_surgery_cases: 2, weekly_gynecology_cases: 3, or_floor_info: 'Cerrahi Blok, 4. kat.', general_notes: 'Şartnamede 4 kol + 8 mm enstrüman uyumu şartı var, bizim lehimize.' }),
  hospital({ id: H.adana, city: 'Adana', district: 'Yüreğir', name: 'Adana Şehir Eğitim ve Araştırma Hastanesi', hospital_type: 'Şehir Hastanesi', pipeline_stage: 'Kurulum Yapıldı (Aktif Sarf Müşterisi)', acquisition_model: 'Sarf Karşılığı Kurulum (Konsinye)', toumai_installed: true, installation_date: day(-75), weekly_urology_cases: 4, weekly_general_surgery_cases: 2, weekly_gynecology_cases: 2, or_floor_info: 'Genel Hastane -1, Ameliyathane 3, robotik salon 7.', general_notes: 'Vaka hızı beklenenden yüksek, sarf takibi kritik.' }),
  hospital({ id: H.acibadem, city: 'İstanbul', district: 'Ataşehir', name: 'Acıbadem Ataşehir Hastanesi', hospital_type: 'Özel Zincir', pipeline_stage: 'Ticari Pazarlık / İhale', acquisition_model: 'Doğrudan Satış', has_davinci: true, davinci_model: 'Da Vinci Xi (2 adet) — kapasite dolu, bekleme listesi uzun.', weekly_urology_cases: 8, weekly_general_surgery_cases: 5, weekly_gynecology_cases: 4, weekly_thoracic_cases: 2, or_floor_info: 'B blok 2. kat ameliyathaneler.', general_notes: 'Grup genelinde ek robot kapasitesi değerlendiriliyor. Maliyet karşılaştırması istendi.' }),
  hospital({ id: H.guven, city: 'Ankara', district: 'Çankaya', name: 'Özel Güven Hastanesi', hospital_type: 'Özel Bağımsız', pipeline_stage: 'Ticari Pazarlık / İhale', acquisition_model: 'Leasing', weekly_urology_cases: 3, weekly_general_surgery_cases: 2, weekly_gynecology_cases: 2, or_floor_info: 'Ana bina 5. kat.', general_notes: 'Leasing teklifi değerlendirmede.' }),
  hospital({ id: H.kayseri, city: 'Kayseri', district: 'Kocasinan', name: 'Kayseri Şehir Eğitim ve Araştırma Hastanesi', hospital_type: 'Şehir Hastanesi', pipeline_stage: 'Kurulum Yapıldı (Aktif Sarf Müşterisi)', acquisition_model: 'Sarf Karşılığı Kurulum (Konsinye)', toumai_installed: true, installation_date: day(-40), weekly_urology_cases: 3, weekly_general_surgery_cases: 2, weekly_gynecology_cases: 1, or_floor_info: 'Merkez ameliyathane zemin kat.' }),
  hospital({ id: H.bursa, city: 'Bursa', district: 'Nilüfer', name: 'Bursa Şehir Hastanesi', hospital_type: 'Şehir Hastanesi', pipeline_stage: 'İstihbarat', weekly_urology_cases: 4, weekly_general_surgery_cases: 3, weekly_gynecology_cases: 2 }),
  hospital({ id: H.mersin, city: 'Mersin', district: 'Toroslar', name: 'Mersin Şehir Eğitim ve Araştırma Hastanesi', hospital_type: 'Şehir Hastanesi', pipeline_stage: 'İlk Temas Kuruldu', weekly_urology_cases: 3, weekly_general_surgery_cases: 2, weekly_gynecology_cases: 2 }),
  hospital({ id: H.gaziantep, city: 'Gaziantep', district: 'Şehitkamil', name: 'Gaziantep Üniversitesi Şahinbey Araştırma ve Uygulama Hastanesi', hospital_type: 'Üniversite', pipeline_stage: 'Askıda / Kaybedildi', has_davinci: true, davinci_model: 'Da Vinci X', weekly_urology_cases: 3, weekly_general_surgery_cases: 1, weekly_gynecology_cases: 1, general_notes: 'Bütçe 2027 yılına ertelendi.' }),
];

let cSeq = 0;
type CSeed = Partial<Contact> & Pick<Contact, 'hospital_id' | 'full_name' | 'role'>;
const contact = (c: CSeed): Contact => {
  cSeq += 1;
  return {
    id: `0c0a7ac7-${String(cSeq).padStart(4, '0')}-4a00-8000-00000000c0${String(cSeq).padStart(2, '0')}`,
    title: null,
    department: null,
    phone: null,
    email: null,
    attitude: 'Nötr',
    best_visit_time: null,
    personal_notes: null,
    is_key_decision_maker: false,
    created_at: ts(-100),
    ...c,
  };
};

const contacts: Contact[] = [
  contact({ hospital_id: H.bilkent, full_name: 'Prof. Dr. Murat Kaplan', title: 'Prof. Dr.', role: 'Cerrah (Hoca)', department: 'Üroloji', phone: '+90 532 000 00 01', attitude: 'Çok Sıcak (Destekçi)', best_visit_time: 'Salı-Perşembe 10:30 (vizit sonrası)', personal_notes: 'Sade Türk kahvesi. Sekreteri Elif Hanım. Kongre sunumu için vaka videosu istiyor.', is_key_decision_maker: true }),
  contact({ hospital_id: H.bilkent, full_name: 'Ayşe Demir', title: 'Sorumlu Hemşire', role: 'Ameliyathane Sorumlu Hemşiresi', department: 'Ameliyathane / MSÜ', phone: '+90 532 000 00 02', attitude: 'Sıcak', best_visit_time: 'Hafta içi 14:00 sonrası', personal_notes: 'Sarf sayımını cuma günleri yapıyor. Açık çay.' }),
  contact({ hospital_id: H.bilkent, full_name: 'Kerem Aksoy', title: 'Biyomedikal Müh.', role: 'Biyomedikal Mühendisi / Müdürü', department: 'Biyomedikal', phone: '+90 532 000 00 03', attitude: 'Nötr', best_visit_time: 'Pazartesi öğleden sonra' }),
  contact({ hospital_id: H.etlik, full_name: 'Doç. Dr. Selin Arslan', title: 'Doç. Dr.', role: 'Cerrah (Hoca)', department: 'Üroloji', phone: '+90 532 000 00 04', attitude: 'Sıcak', best_visit_time: 'Çarşamba 09:00', personal_notes: 'Yurt dışı robotik fellowship yapmış, karşılaştırmalı veri istiyor.', is_key_decision_maker: true }),
  contact({ hospital_id: H.etlik, full_name: 'Hakan Yıldız', title: 'Müdür', role: 'Satın Alma Müdürü / İhale Komisyonu', department: 'İdari / Satın Alma', phone: '+90 532 000 00 05', attitude: 'Mesafeli', best_visit_time: 'Perşembe 15:00', personal_notes: 'Konsinye modelin bütçe etkisini yazılı istiyor.' }),
  contact({ hospital_id: H.hacettepe, full_name: 'Prof. Dr. Cem Özdemir', title: 'Prof. Dr.', role: 'Anabilim Dalı / Klinik Şefi', department: 'Genel Cerrahi', phone: '+90 532 000 00 06', attitude: 'Rakip (Da Vinci) Yanlısı', best_visit_time: 'Cuma 11:00', personal_notes: 'Da Vinci eğitimini ABD\'de almış. Veri ile ikna edilmeli.', is_key_decision_maker: true }),
  contact({ hospital_id: H.hacettepe, full_name: 'Op. Dr. Deniz Şahin', title: 'Op. Dr.', role: 'Cerrah (Hoca)', department: 'Üroloji', phone: '+90 532 000 00 07', attitude: 'Sıcak', best_visit_time: 'Salı 13:30' }),
  contact({ hospital_id: H.ege, full_name: 'Prof. Dr. Levent Aydın', title: 'Prof. Dr.', role: 'Cerrah (Hoca)', department: 'Üroloji', phone: '+90 532 000 00 08', attitude: 'Çok Sıcak (Destekçi)', best_visit_time: 'Pazartesi 08:30 (ameliyat öncesi)', personal_notes: 'Yeşil çay. Sekreteri Burcu Hanım.', is_key_decision_maker: true }),
  contact({ hospital_id: H.ege, full_name: 'Gökhan Eren', title: 'Biyomedikal Müdürü', role: 'Biyomedikal Mühendisi / Müdürü', department: 'Biyomedikal', phone: '+90 532 000 00 09', attitude: 'Nötr', best_visit_time: 'Salı-Çarşamba 10:00' }),
  contact({ hospital_id: H.adana, full_name: 'Op. Dr. Tuncay Koç', title: 'Op. Dr.', role: 'Cerrah (Hoca)', department: 'Üroloji', phone: '+90 532 000 00 10', attitude: 'Çok Sıcak (Destekçi)', best_visit_time: 'Pazartesi-Çarşamba 16:00', is_key_decision_maker: true }),
  contact({ hospital_id: H.adana, full_name: 'Ayşe Kılınç', title: 'Sorumlu Hemşire', role: 'Ameliyathane Sorumlu Hemşiresi', department: 'Ameliyathane / MSÜ', phone: '+90 532 000 00 11', attitude: 'Sıcak', best_visit_time: 'Her gün 13:00', personal_notes: 'Stok bilgisini WhatsApp\'tan fotoğrafla iletiyor.' }),
  contact({ hospital_id: H.acibadem, full_name: 'Prof. Dr. Bora Toprak', title: 'Prof. Dr.', role: 'Cerrah (Hoca)', department: 'Üroloji', phone: '+90 532 000 00 12', attitude: 'Nötr', best_visit_time: 'Perşembe 17:00', is_key_decision_maker: true }),
  contact({ hospital_id: H.acibadem, full_name: 'Nilay Çetin', title: 'Satın Alma Direktörü', role: 'Satın Alma Müdürü / İhale Komisyonu', department: 'İdari / Satın Alma', phone: '+90 532 000 00 13', attitude: 'Mesafeli', best_visit_time: 'Salı 10:00', personal_notes: '5 yıllık TCO tablosu istiyor.' }),
  contact({ hospital_id: H.guven, full_name: 'Dr. Ömer Polat', title: 'Dr.', role: 'Başhekim / Hastane Direktörü', department: 'İdari / Satın Alma', phone: '+90 532 000 00 14', attitude: 'Sıcak', best_visit_time: 'Çarşamba 11:00', is_key_decision_maker: true }),
  contact({ hospital_id: H.kayseri, full_name: 'Doç. Dr. Emre Yalçın', title: 'Doç. Dr.', role: 'Cerrah (Hoca)', department: 'Genel Cerrahi', phone: '+90 532 000 00 15', attitude: 'Sıcak', best_visit_time: 'Salı 09:30', is_key_decision_maker: true }),
  contact({ hospital_id: H.kayseri, full_name: 'Fatma Uçar', title: 'Depo Sorumlusu', role: 'Sarf Depo Sorumlusu', department: 'Ameliyathane / MSÜ', phone: '+90 532 000 00 16', attitude: 'Nötr', best_visit_time: 'Hafta içi 08:30' }),
  contact({ hospital_id: H.mersin, full_name: 'Op. Dr. Sinan Ateş', title: 'Op. Dr.', role: 'Cerrah (Hoca)', department: 'Üroloji', phone: '+90 532 000 00 17', attitude: 'Sıcak', best_visit_time: 'Perşembe 14:00' }),
];

let iSeq = 0;
const inv = (hospital_id: string, instrument_code: string, boxed: number, active: number, perWeek: number, threshold = 5): InventoryItem => {
  iSeq += 1;
  return {
    id: `0d0e9a70-${String(iSeq).padStart(4, '0')}-4a00-8000-0000000d${String(iSeq).padStart(4, '0')}`,
    hospital_id,
    instrument_code,
    boxed_stock_count: boxed,
    active_instrument_remaining_uses: active,
    min_critical_uses_threshold: threshold,
    avg_uses_per_week: perWeek,
    last_checked_at: ts(-3),
    notes: null,
  };
};

const inventory: InventoryItem[] = [
  // Bilkent — sağlıklı stok, birkaç kritik kalem
  inv(H.bilkent, 'IN8035', 2, 7, 11),
  inv(H.bilkent, 'IN8036', 3, 12, 11),
  inv(H.bilkent, 'IN803A', 2, 15, 11),
  inv(H.bilkent, 'IN8031', 1, 3, 8),
  inv(H.bilkent, 'IN803B', 1, 18, 6),
  inv(H.bilkent, 'IN803G', 1, 10, 5),
  inv(H.bilkent, 'DRAPE-SET', 30, 0, 11, 10),
  inv(H.bilkent, 'SEAL-SET', 40, 0, 11, 10),
  // Adana — Monopolar makas kritik!
  inv(H.adana, 'IN8035', 0, 4, 8),
  inv(H.adana, 'IN8036', 1, 6, 8),
  inv(H.adana, 'IN803A', 1, 11, 8),
  inv(H.adana, 'IN8038', 0, 9, 4),
  inv(H.adana, 'IN803D', 1, 14, 2),
  inv(H.adana, 'DRAPE-SET', 6, 0, 8, 10),
  // Kayseri
  inv(H.kayseri, 'IN8035', 1, 10, 6),
  inv(H.kayseri, 'IN8036', 1, 2, 6),
  inv(H.kayseri, 'IN8032', 1, 8, 2),
  inv(H.kayseri, 'IN803C', 12, 0, 2, 4),
  inv(H.kayseri, 'DRAPE-SET', 18, 0, 6, 10),
];

let vSeq = 0;
type VSeed = Partial<Visit> & Pick<Visit, 'hospital_id' | 'visit_type' | 'summary'>;
const visit = (v: VSeed): Visit => {
  vSeq += 1;
  return {
    id: `0e1517a0-${String(vSeq).padStart(4, '0')}-4a00-8000-0000000e${String(vSeq).padStart(4, '0')}`,
    contact_id: null,
    visit_date: day(-7),
    objections_raised: null,
    next_action: null,
    next_action_date: null,
    is_action_completed: false,
    created_at: ts(-7),
    ...v,
  };
};

const visits: Visit[] = [
  visit({ hospital_id: H.adana, contact_id: contacts[10].id, visit_date: day(-4), visit_type: 'Sarf Stok & Can Kontrolü', summary: 'Depo sayımı yapıldı. Monopolar makas stoğu bitmek üzere.', next_action: 'Monopolar makas (IN8035) 5 kutu sipariş teklifi gönder', next_action_date: day(0) }),
  visit({ hospital_id: H.etlik, contact_id: contacts[3].id, visit_date: day(-10), visit_type: 'Klinik Sunum / Video Gösterimi', summary: 'Radikal prostatektomi vaka videosu izlendi, klinik çok ilgili.', objections_raised: 'Eğitim süreci ve proktor desteği soruldu.', next_action: 'Demo tarihi için ameliyathane planlamasını kesinleştir', next_action_date: day(2) }),
  visit({ hospital_id: H.hacettepe, contact_id: contacts[5].id, visit_date: day(-14), visit_type: 'Tanışma / İlk Ziyaret', summary: 'İlk tanışma. Da Vinci memnuniyeti yüksek ama sarf maliyetleri gündemde.', objections_raised: '"Elimiz Da Vinci\'ye alışkın." / "Çin malı robota nasıl güvenelim?"', next_action: 'ORSI Academy ve uluslararası yayın dosyasını ilet', next_action_date: day(-1) }),
  visit({ hospital_id: H.acibadem, contact_id: contacts[12].id, visit_date: day(-6), visit_type: 'Satın Alma / Fiyat Pazarlığı', summary: '5 yıllık toplam sahip olma maliyeti tablosu istendi.', objections_raised: 'Servis süresi ve yedek parça garantisi.', next_action: 'ROI simülasyonu PDF + servis SLA dokümanı gönder', next_action_date: day(3) }),
  visit({ hospital_id: H.ege, contact_id: contacts[8].id, visit_date: day(-20), visit_type: 'Biyomedikal / Şartname Görüşmesi', summary: 'Teknik şartname maddeleri gözden geçirildi.', next_action: 'Şartname uyum tablosunu biyomedikale teslim et', next_action_date: day(5) }),
  visit({ hospital_id: H.bilkent, contact_id: contacts[0].id, visit_date: day(-30), visit_type: 'Ameliyathane Vaka Desteği / Demo', summary: 'Parsiyel nefrektomi vakasına destek verildi, sorunsuz.', is_action_completed: true }),
  visit({ hospital_id: H.guven, contact_id: contacts[13].id, visit_date: day(-3), visit_type: 'Telefon / Online Görüşme', summary: 'Leasing vade seçenekleri konuşuldu.', next_action: 'Leasing firmasından 36/48 ay teklif al', next_action_date: day(6) }),
];

let dSeq = 0;
type DSeed = Partial<DealOrder> & Pick<DealOrder, 'hospital_id' | 'order_type'>;
const deal = (d: DSeed): DealOrder => {
  dSeq += 1;
  return {
    id: `0f0de41a-${String(dSeq).padStart(4, '0')}-4a00-8000-0000000f${String(dSeq).padStart(4, '0')}`,
    status: 'Teklif Verildi',
    total_amount_usd: 0,
    uts_notification_done: false,
    items_summary: null,
    expected_close_date: null,
    notes: null,
    created_at: ts(-10),
    ...d,
  };
};

const deals: DealOrder[] = [
  deal({ hospital_id: H.acibadem, order_type: 'Demirbaş Robot Satışı', status: 'Teklif Verildi', total_amount_usd: 1450000, items_summary: '1x Toumai® MT-1000 + 1 yıl sarf paketi', expected_close_date: day(45) }),
  deal({ hospital_id: H.ege, order_type: 'DMO / Kamu İhalesi', status: 'İhale / Komisyon Bekliyor', total_amount_usd: 1600000, items_summary: 'Toumai® MT-1000 + 3 yıl sarf taahhüdü', expected_close_date: day(90) }),
  deal({ hospital_id: H.guven, order_type: 'Sarf Karşılığı Cihaz Kurulumu', status: 'Hazırlık', total_amount_usd: 420000, items_summary: 'Leasing + yıllık 150 vaka sarf taahhüdü', expected_close_date: day(30) }),
  deal({ hospital_id: H.bilkent, order_type: 'Rutin Sarf & Enstrüman Siparişi', status: 'Faturalandı', total_amount_usd: 38750, uts_notification_done: true, items_summary: '5x Maryland, 5x Monopolar Makas, 50x Steril Drape', created_at: ts(-25) }),
  deal({ hospital_id: H.adana, order_type: 'Rutin Sarf & Enstrüman Siparişi', status: 'Onaylandı / Sevk Edildi', total_amount_usd: 21450, uts_notification_done: false, items_summary: '3x Maryland, 4x Cadiere, 30x Steril Drape', created_at: ts(-12) }),
];

export function buildSeedData(): CRMData {
  return {
    hospitals: structuredClone(hospitals),
    contacts: structuredClone(contacts),
    catalog: structuredClone(INSTRUMENT_CATALOG),
    inventory: structuredClone(inventory),
    visits: structuredClone(visits),
    deals: structuredClone(deals),
  };
}
