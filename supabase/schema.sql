-- AED Global — MedBot Toumai® Saha CRM — Supabase şeması
-- Supabase SQL Editor'de tek seferde çalıştırın.

-- UUID eklentisini aktif et
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 1. HASTANELER VE İSTİHBARAT TABLOSU (hospitals)
CREATE TABLE hospitals (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  city TEXT NOT NULL, -- Örn: Ankara, İzmir, Adana, Kayseri
  district TEXT, -- Örn: Çankaya, Bornova
  name TEXT NOT NULL, -- Örn: Bilkent Şehir Hastanesi
  hospital_type TEXT NOT NULL CHECK (hospital_type IN ('Şehir Hastanesi', 'Üniversite', 'Özel Zincir', 'Özel Bağımsız', 'Devlet Eğitim Araştırma')),
  pipeline_stage TEXT NOT NULL DEFAULT 'İstihbarat' CHECK (pipeline_stage IN (
    'İstihbarat', 
    'İlk Temas Kuruldu', 
    'Klinik Demo Planlandı', 
    'Şartname / Biyomedikal Aşamasında', 
    'Ticari Pazarlık / İhale', 
    'Kurulum Yapıldı (Aktif Sarf Müşterisi)', 
    'Askıda / Kaybedildi'
  )),
  acquisition_model TEXT DEFAULT 'Belirsiz' CHECK (acquisition_model IN ('Belirsiz', 'Doğrudan Satış', 'Sarf Karşılığı Kurulum (Konsinye)', 'Leasing', 'DMO / Kamu İhalesi')),
  has_davinci BOOLEAN DEFAULT false, -- Rakip Da Vinci robotu var mı?
  davinci_model TEXT, -- Varsa modeli (Xi, X, Si vb.) ve şikayetleri
  toumai_installed BOOLEAN DEFAULT false, -- Bizim Toumai MT-1000 kuruldu mu?
  installation_date DATE,
  weekly_urology_cases INT DEFAULT 0, -- Haftalık tahmini Üroloji robotik vaka sayısı
  weekly_general_surgery_cases INT DEFAULT 0, -- Haftalık Genel Cerrahi vaka sayısı
  weekly_gynecology_cases INT DEFAULT 0, -- Haftalık Jinekoloji vaka sayısı
  weekly_thoracic_cases INT DEFAULT 0, -- Haftalık Göğüs/Pediatrik vaka sayısı
  or_floor_info TEXT, -- Ameliyathane katı / giriş tarifi
  general_notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. HASTANE İÇİ KİLİT KİŞİLER / KARAR VERİCİLER (contacts)
CREATE TABLE contacts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  hospital_id UUID NOT NULL REFERENCES hospitals(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL, -- Örn: Prof. Dr. Ahmet Yılmaz
  title TEXT, -- Prof. Dr., Doç. Dr., Op. Dr., Başhemşire, Biyomedikal Müh., Müdür
  role TEXT NOT NULL CHECK (role IN (
    'Cerrah (Hoca)', 
    'Anabilim Dalı / Klinik Şefi', 
    'Ameliyathane Sorumlu Hemşiresi', 
    'Sarf Depo Sorumlusu', 
    'Biyomedikal Mühendisi / Müdürü', 
    'Satın Alma Müdürü / İhale Komisyonu', 
    'Başhekim / Hastane Direktörü', 
    'Bölüm Sekreteri / Asistan'
  )),
  department TEXT CHECK (department IN ('Üroloji', 'Genel Cerrahi', 'Jinekoloji', 'Göğüs Cerrahisi', 'Pediatrik Cerrahi', 'Ameliyathane / MSÜ', 'İdari / Satın Alma', 'Biyomedikal', 'Diğer')),
  phone TEXT,
  email TEXT,
  attitude TEXT DEFAULT 'Nötr' CHECK (attitude IN ('Çok Sıcak (Destekçi)', 'Sıcak', 'Nötr', 'Mesafeli', 'Rakip (Da Vinci) Yanlısı')),
  best_visit_time TEXT, -- Örn: Salı-Perşembe sabah vizit sonrası 10:30
  personal_notes TEXT, -- Çay/kahve tercihi, sekreterinin adı, özel hassasiyetleri
  is_key_decision_maker BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. TOUMAI MT-1000 RESMİ ENSTRÜMAN VE SARF KATALOĞU (instrument_catalog)
CREATE TABLE instrument_catalog (
  code TEXT PRIMARY KEY, -- Örn: IN8036
  name_en TEXT NOT NULL,
  name_tr TEXT NOT NULL,
  category TEXT NOT NULL CHECK (category IN (
    'İğne Tutucu (Needle Driver)', 
    'Bipolar Enerji', 
    'Monopolar Enerji', 
    'Doku Tutucu (Grasper)', 
    'Klip Aplikatörü', 
    'Ultrasonik Enerji', 
    'Tam Sarf (Disposable)', 
    'Eğitim Serisi (-T)'
  )),
  diameter_mm NUMERIC DEFAULT 8.0,
  default_max_uses INT NOT NULL, -- Standart maksimum kullanım (can) sayısı (1, 10, 12, 16, 20, 30)
  unit_list_price_usd NUMERIC DEFAULT 0, -- Tahmini liste fiyatı ($)
  clinical_usage_description TEXT NOT NULL,
  typical_branches TEXT -- En çok kullanıldığı branşlar
);

-- 4. HASTANE DEPO VE ENSTRÜMAN "CAN (RFID KONTÖR)" TAKİBİ (hospital_inventory)
CREATE TABLE hospital_inventory (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  hospital_id UUID NOT NULL REFERENCES hospitals(id) ON DELETE CASCADE,
  instrument_code TEXT NOT NULL REFERENCES instrument_catalog(code) ON DELETE RESTRICT,
  boxed_stock_count INT NOT NULL DEFAULT 0, -- Depodaki açılmamış kapalı kutu adedi
  active_instrument_remaining_uses INT NOT NULL DEFAULT 0, -- Ameliyathanede açık olan enstrümanların toplam kalan "can" (kullanım) sayısı
  min_critical_uses_threshold INT NOT NULL DEFAULT 5, -- Bu sayının altına düşerse KRİTİK UYARI ver
  avg_uses_per_week NUMERIC DEFAULT 2.0, -- Bu hastanede bu aletten haftada ortalama kaç can harcanıyor?
  last_checked_at TIMESTAMPTZ DEFAULT NOW(),
  notes TEXT,
  UNIQUE(hospital_id, instrument_code)
);

-- 5. SAHA ZİYARETLERİ, DEMOLAR VE AKSİYON TAKİBİ (visits)
CREATE TABLE visits (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  hospital_id UUID NOT NULL REFERENCES hospitals(id) ON DELETE CASCADE,
  contact_id UUID REFERENCES contacts(id) ON DELETE SET NULL,
  visit_date DATE NOT NULL DEFAULT CURRENT_DATE,
  visit_type TEXT NOT NULL CHECK (visit_type IN (
    'Tanışma / İlk Ziyaret', 
    'Klinik Sunum / Video Gösterimi', 
    'Ameliyathane Vaka Desteği / Demo', 
    'Sarf Stok & Can Kontrolü', 
    'Biyomedikal / Şartname Görüşmesi', 
    'Satın Alma / Fiyat Pazarlığı', 
    'Telefon / Online Görüşme'
  )),
  summary TEXT NOT NULL, -- Görüşme özeti
  objections_raised TEXT, -- Müşterinin sunduğu itirazlar
  next_action TEXT, -- Yapılacak sonraki iş
  next_action_date DATE, -- Hatırlatıcı tarihi
  is_action_completed BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. SİPARİŞ VE İHALE/TEKLİF TAKİBİ (deals_orders)
CREATE TABLE deals_orders (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  hospital_id UUID NOT NULL REFERENCES hospitals(id) ON DELETE CASCADE,
  order_type TEXT NOT NULL CHECK (order_type IN ('Demirbaş Robot Satışı', 'Sarf Karşılığı Cihaz Kurulumu', 'Rutin Sarf & Enstrüman Siparişi', 'DMO / Kamu İhalesi')),
  status TEXT NOT NULL DEFAULT 'Teklif Verildi' CHECK (status IN ('Hazırlık', 'Teklif Verildi', 'İhale / Komisyon Bekliyor', 'Onaylandı / Sevk Edildi', 'Faturalandı', 'İptal')),
  total_amount_usd NUMERIC DEFAULT 0,
  uts_notification_done BOOLEAN DEFAULT false, -- ÜTS Verme bildirimi yapıldı mı?
  items_summary TEXT, -- Örn: 5x Maryland, 5x Monopolar Makas, 50x Steril Drape
  expected_close_date DATE,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 7. RESMİ TOUMAI MT-1000 KATALOG VERİLERİNİ EKLE (SEED DATA)
INSERT INTO instrument_catalog (code, name_en, name_tr, category, default_max_uses, unit_list_price_usd, clinical_usage_description, typical_branches) VALUES
('IN8031', 'Needle Driver', 'Standart İğne Tutucu', 'İğne Tutucu (Needle Driver)', 16, 1800, 'İnce ve orta boy cerrahi iğneleri kavrayarak iç organlarda dikiş (sütür) atılmasını ve düğüm bağlanmasını sağlar.', 'Tüm Branşlar'),
('IN8038', 'Large Needle Driver', 'Büyük İğne Tutucu', 'İğne Tutucu (Needle Driver)', 16, 1850, 'Kalın dokularda (prostat anastomozu, rahim duvarı, mide) büyük eğri iğneleri kaydırmadan tutmak için güçlü çene yapısına sahiptir.', 'Üroloji, Jinekoloji, Genel Cerrahi'),
('IN803E', 'Small Scissors Needle Driver', 'Küçük Makaslı İğne Tutucu', 'İğne Tutucu (Needle Driver)', 16, 1950, 'Hem dikiş atar hem de çenesinin dip kısmındaki mini bıçakla dikiş ipini keser. Alet değişimini azaltır.', 'Üroloji, Pediatrik Cerrahi'),
('IN803F', 'Large Scissors Needle Driver', 'Büyük Makaslı İğne Tutucu', 'İğne Tutucu (Needle Driver)', 16, 2000, 'Kalın sütür iplerini hem dikmek hem de doğrudan kesmek için kullanılan kombine büyük boy iğne tutucudur.', 'Jinekoloji, Genel Cerrahi'),
('IN8031-M', 'Micro Needle Driver', 'Mikro İğne Tutucu (5. Varyant)', 'İğne Tutucu (Needle Driver)', 16, 1900, 'Dar açılı vasküler veya pediatrik rekonstrüksiyonlarda hassas sütür kontrolü sağlar.', 'Üroloji, Pediatrik, Göğüs'),
('IN8036', 'Maryland Bipolar Forceps', 'Maryland Bipolar Penset', 'Bipolar Enerji', 16, 2100, 'Cerrahların en çok kullandığı alettir. İnce kıvrık ucuyla hassas doku diseksiyonu yapar ve bipolar enerjiyle damarları yakarak kanamayı durdurur.', 'Tüm Branşlar (Her vakada açılır)'),
('IN8033', 'Fenestrated Bipolar Forceps', 'Pencereli Bipolar Penset', 'Bipolar Enerji', 16, 2100, 'Ortası pencereli geniş çenesiyle dokuyu nazikçe tutar ve geniş yüzeyli damar koagülasyonu yapar.', 'Genel Cerrahi, Jinekoloji, Üroloji'),
('IN8035', 'Monopolar Curved Scissors', 'Monopolar Eğri Makas', 'Monopolar Enerji', 12, 1950, 'Her ameliyatta mutlaka 1 adet açılır! Sağ kolda kullanılır; dokuları hem mekanik olarak keser hem de monopolar enerji ile yakar.', 'Tüm Branşlar (En hızlı tükenen sarf)'),
('IN8032', 'Small Monopolar Cautery Hook', 'Monopolar Koter Kancası', 'Monopolar Enerji', 12, 1750, 'L-şeklindeki kanca ucuyla safra kesesi, mide ve kolorektal cerrahide ince zarları askıya alıp yakarak kesmek için kullanılır.', 'Genel Cerrahi, Göğüs Cerrahisi'),
('IN8037', 'Permanent Cautery Spatula', 'Kalıcı Koter Spatulası', 'Monopolar Enerji', 12, 1750, 'Künt spatula ucuyla karaciğer yatağı veya geniş tümör yüzeylerinde künt diseksiyon ve yüzeysel kanama kontrolü sağlar.', 'Genel Cerrahi'),
('IN803A', 'Cadiere Forceps', 'Cadiere Doku Tutucu', 'Doku Tutucu (Grasper)', 20, 1700, 'Atravmatik diş yapısına sahiptir; bağırsak, mesane veya damar gibi hassas dokuları ezmeden tutmak ve çekmek için kullanılır.', 'Tüm Branşlar'),
('IN803B', 'Strong Cadiere Forceps', 'Güçlü Cadiere (ProGrasp Muadili)', 'Doku Tutucu (Grasper)', 20, 1800, 'Yüksek kavrama gücüne sahiptir; 4. kolda organları ameliyat boyunca sabit tutup ekarte etmekte (retraksiyon) kullanılır.', 'Üroloji, Genel Cerrahi'),
('IN8039', 'Claw Forceps', 'Pençe Dişli Tutucu', 'Doku Tutucu (Grasper)', 20, 1750, 'Sert ve kaygan dokuları (fasya, çıkarılacak tümörlü doku) kaçırmadan güçlü şekilde yakalamak için kullanılır.', 'Genel Cerrahi, Üroloji'),
('IN803D', 'Tenaculum Forceps', 'Tenakulum Tutucu', 'Doku Tutucu (Grasper)', 20, 1800, 'Jinekologların vazgeçilmezidir. Miyomektomi ve histerektomi ameliyatlarında sert rahim miyomlarını çengelli ucuyla tutup çekmek için kullanılır.', 'Jinekoloji'),
('IN803G', 'Medium-Large Clip Applier', 'Orta-Büyük Klip Atıcı (Yeşil Hem-o-Lok)', 'Klip Aplikatörü', 20, 2200, 'Damarları bağlamak için kullanılan Yeşil (Green) WECK Hem-o-Lok polimer klipleri damara takan 540° dönebilen aplikatördür.', 'Üroloji, Genel Cerrahi'),
('IN803H', 'Large Clip Applier', 'Büyük Klip Atıcı (Mor Hem-o-Lok)', 'Klip Aplikatörü', 20, 2200, 'Böbrek arteri gibi kalın damarları kapatmak için Mor (Purple) WECK Hem-o-Lok büyük boy kliplerle kullanılır.', 'Üroloji, Genel Cerrahi'),
('IN803C', 'Ultrasound Shears', 'Ultrasonik Harmonik Makas', 'Ultrasonik Enerji', 1, 850, 'TEK KULLANIMLIKTIR! Yüksek frekanslı ultrasonik titreşimle dokuyu keser ve 5 mm ye kadar damarları mühürler. Her vakada 1 adet satılır.', 'Genel Cerrahi, Bariatrik, Kolorektal'),
('DRAPE-SET', 'Sterile Arm & Camera Drape Set', 'Steril Robot Kol Kılıfı Seti (4 Kol)', 'Tam Sarf (Disposable)', 1, 220, 'Her ameliyatta robotun 4 koluna giydirilen tek kullanımlık steril şeffaf örtü setidir. Ayda kaç vaka varsa o kadar harcanır.', 'Tüm Branşlar (Her vakada 1 set)'),
('SEAL-SET', '8mm Force Sensing Trocar Cannula Seal', '8mm Trokar Kanül Contası ve Valf Seti', 'Tam Sarf (Disposable)', 1, 95, 'Hastanın karnındaki karbondioksit gazının kaçmasını önleyen tek kullanımlık trokar contasıdır.', 'Tüm Branşlar');

-- 8. updated_at OTOMATİK GÜNCELLEME
CREATE OR REPLACE FUNCTION set_updated_at() RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER hospitals_set_updated_at
  BEFORE UPDATE ON hospitals
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- 9. PERFORMANS İNDEKSLERİ
CREATE INDEX IF NOT EXISTS idx_contacts_hospital ON contacts(hospital_id);
CREATE INDEX IF NOT EXISTS idx_inventory_hospital ON hospital_inventory(hospital_id);
CREATE INDEX IF NOT EXISTS idx_visits_hospital ON visits(hospital_id);
CREATE INDEX IF NOT EXISTS idx_visits_action ON visits(is_action_completed, next_action_date);
CREATE INDEX IF NOT EXISTS idx_deals_hospital ON deals_orders(hospital_id);

-- 10. KRİTİK STOK GÖRÜNÜMÜ (VIEW) — tahmini kalan gün hesabı
CREATE OR REPLACE VIEW inventory_forecast WITH (security_invoker = true) AS
SELECT
  hi.id,
  hi.hospital_id,
  h.name AS hospital_name,
  h.city,
  hi.instrument_code,
  ic.name_tr,
  ic.default_max_uses,
  hi.boxed_stock_count,
  hi.active_instrument_remaining_uses,
  hi.min_critical_uses_threshold,
  hi.avg_uses_per_week,
  (hi.boxed_stock_count * ic.default_max_uses + hi.active_instrument_remaining_uses) AS total_available_uses,
  CASE WHEN COALESCE(hi.avg_uses_per_week, 0) > 0
    THEN ROUND(((hi.boxed_stock_count * ic.default_max_uses + hi.active_instrument_remaining_uses) / hi.avg_uses_per_week) * 7, 1)
    ELSE NULL END AS estimated_days_left
FROM hospital_inventory hi
JOIN hospitals h ON h.id = hi.hospital_id
JOIN instrument_catalog ic ON ic.code = hi.instrument_code;

-- 11. ROW LEVEL SECURITY — yalnızca oturum açmış kullanıcı (Supabase Auth) erişebilir.
-- Supabase Dashboard → Authentication → Users bölümünden kendi kullanıcınızı oluşturun.
ALTER TABLE hospitals ENABLE ROW LEVEL SECURITY;
ALTER TABLE contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE instrument_catalog ENABLE ROW LEVEL SECURITY;
ALTER TABLE hospital_inventory ENABLE ROW LEVEL SECURITY;
ALTER TABLE visits ENABLE ROW LEVEL SECURITY;
ALTER TABLE deals_orders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "auth_all_hospitals" ON hospitals FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth_all_contacts" ON contacts FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth_read_catalog" ON instrument_catalog FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth_all_inventory" ON hospital_inventory FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth_all_visits" ON visits FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth_all_deals" ON deals_orders FOR ALL TO authenticated USING (true) WITH CHECK (true);
