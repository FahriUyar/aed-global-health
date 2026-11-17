import { useMemo, useState } from 'react';
import { BookOpen, ChevronDown, MessageSquareQuote, ShieldCheck, Stethoscope, Wallet, Wrench } from 'lucide-react';
import { useDocumentMeta } from '../hooks/useDocumentMeta';
import { Badge, Card, EmptyState, PageHeader, TextField } from '../components/ui';
import { cn } from '../lib/domain';

interface Pitch {
  role: string;
  badge: string;
  icon: typeof Stethoscope;
  hook: string;
  points: string[];
  close: string;
}

const PITCHES: Pitch[] = [
  {
    role: 'Cerrah / Klinik Şefi İçin',
    badge: 'Klinik & Ergonomi Odaklı',
    icon: Stethoscope,
    hook: '“Hocam, Toumai® MT-1000 alışkın olduğunuz 4 kollu immersif konsol ergonomisini değiştirmeden, kuvvet algılama ve 8 modlu ICG floresan görüntülemeyi standart olarak sunuyor.”',
    points: [
      'Birebir tanıdık 4 kollu mimari ve 17 adet 8 mm endo-wristed enstrüman — öğrenme eğrisi minimumdur.',
      'Patentli Force Sensing Trokar ve HapticSense® dokunsal geri bildirim ile doku gerilimini hissederek güvenli diseksiyon.',
      'Belçika ORSI Academy ve Türkiye Acıbadem CASE eğitim merkezlerinde aktif eğitim & proktorluk altyapısı; AB CE (MDR) ve Şubat 2026 Pediatrik endikasyon onayı.',
    ],
    close: '“Uygun gördüğünüz bir gün 15 dakikalık konsol simülasyonu ve kendi branşınızdaki vaka videolarını birlikte inceleyelim mi?”',
  },
  {
    role: 'Satın Alma Müdürü / Başhekim İçin',
    badge: 'TCO & Bütçe Odaklı',
    icon: Wallet,
    hook: '“Sayın Müdürüm, robotik cerrahide asıl maliyet demirbaş değil, her vakada harcanan RFID çipli sarf malzemelerdir. Toumai® ile vaka başı sarf giderinizi %35–45 düşürüyoruz.”',
    points: [
      'Rakip sistemde tüm aletler 10 canla sınırlıyken Toumai® Grasper ve Klip atıcılarda 20 can, Bipolar ve İğne Tutucuda 16 can ömür sunar.',
      'Demirbaş bütçesi ayırmak istemezseniz, “Sarf Karşılığı Kurulum (Konsinye)” modeliyle 0 $ peşin yatırımla robotu kuruyoruz.',
      '5 yıllık toplam sahip olma maliyetinde (TCO) yüz binlerce dolarlık döviz tasarrufu ve öngörülebilir vaka başı maliyet.',
    ],
    close: '“Hastanenizin aylık vaka sayısını birlikte girip 5 yıllık net döviz tasarruf tablosunu 1 dakikada çıkaralım mı?”',
  },
  {
    role: 'Biyomedikal Müdürü / Teknik Komisyon İçin',
    badge: 'Uptime, Servis & KVKK Odaklı',
    icon: Wrench,
    hook: '“AED Global olarak Ankara Çukurambar merkezli 7/24 yetkili teknik ekibimiz ve Türkiye içi yedek parça depomuzla %95 Uptime SLA garantisi veriyoruz.”',
    points: [
      '10 yıl yedek parça bulundurma taahhüdü; arıza bildirimlerinde yurt dışı beklemeden yerel mühendislik müdahalesi.',
      'Rakip sistemlerin aksine hasta ve ameliyat verilerini yurt dışı bulut sunuculara aktarmayan %100 hastane içi (on-premise, KVKK uyumlu) siber güvenlik mimarisi.',
      'Mevcut merkezi sterilizasyon (otoklav 134 °C) ve ameliyathane altyapısıyla tam uyumlu 8 mm enstrüman portföyü.',
    ],
    close: '“Teknik şartname uyum dosyamızı ve SLA taahhütnamemizi bugün e-posta ile paylaşabilirim.”',
  },
];

interface Objection {
  id: string;
  question: string;
  tag: string;
  summary: string;
  bullets: string[];
}

const OBJECTIONS: Objection[] = [
  {
    id: 'origin',
    question: '1. “Çin malı robota nasıl güvenelim?”',
    tag: 'Güven & Referans',
    summary: 'MicroPort®, 100’den fazla ülkede faaliyet gösteren ve Fransa’da kalp pili üreten küresel bir medikal teknoloji devidir.',
    bullets: [
      'Toumai® MT-1000, Avrupa Birliği’nin en sıkı regülasyonu olan AB CE (MDR) onayına ve Şubat 2026 itibarıyla Pediatrik Cerrahi onayına sahiptir.',
      'Avrupa’nın en prestijli robotik cerrahi eğitim üssü Belçika ORSI Academy ve Türkiye’de Acıbadem CASE eğitim merkezinde aktif olarak kullanılmaktadır.',
      'Üroloji, Genel Cerrahi, Jinekoloji ve Göğüs Cerrahisinde binlerce başarılı klinik vaka ve hakemli uluslararası yayın referansı mevcuttur.',
    ],
  },
  {
    id: 'budget',
    question: '2. “Şu an demirbaş bütçemiz yok.”',
    tag: 'Ticari Model',
    summary: 'Peşin CAPEX bütçesi gerekmeden “Sarf Karşılığı Kurulum (Konsinye)” veya Leasing modeliyle hemen kurulum yapabiliyoruz.',
    bullets: [
      'Hastane demirbaş için tek kuruş peşin ödeme yapmaz; yalnızca aylık/yıllık vaka sarf malzeme alım taahhüdü verir.',
      'Ameliyat yapıldıkça sarf faturası kesilir; robot ilk günden itibaren kendi kendini finanse eder.',
      'Kamu hastaneleri için DMO ve hizmet alımı modelleriyle uyumlu yapılandırma sunulur.',
    ],
  },
  {
    id: 'davinci',
    question: '3. “Elimiz Da Vinci’ye alışkın.”',
    tag: 'Klinik Adaptasyon',
    summary: 'Toumai® konsol ergonomisi, el kumandaları, ayak pedalları ve 17 standart enstrümanı Da Vinci cerrahının kas hafızasıyla birebir uyumludur.',
    bullets: [
      '4 kollu hasta başı ünitesi ve 3D HD immersif açık/kapalı görüş konsolu sayesinde cerrah yabancı bir sisteme geçiyormuş hissi yaşamaz.',
      'Maryland Bipolar, Monopolar Eğri Makas, Cadiere, ProGrasp muadili Strong Cadiere ve Hem-o-Lok klip atıcılar aynı klinik mantıkla çalışır.',
      'Klinik uygulama uzmanlarımız ve proktor hocalarımız ilk vakalarda ameliyathanede birebir eşlik eder.',
    ],
  },
  {
    id: 'service',
    question: '4. “Cihaz arıza yaparsa parça Çin’den mi gelecek?”',
    tag: 'Teknik Servis & SLA',
    summary: 'Hayır — AED Global Ankara Çukurambar merkezimizde kritik yedek parça stoğu ve 7/24 saha mühendis ekibimiz hazırdır.',
    bullets: [
      'Sözleşmeli %95 Uptime (çalışırlık) garantisi ve 10 yıl yedek parça tedarik taahhüdü veriyoruz.',
      'Uzaktan teşhis ve Türkiye içi hızlı parça sevkiyatı ile vaka iptallerinin önüne geçilir.',
      'Periyodik koruyucu bakımlar ameliyathane programını aksatmadan planlanır.',
    ],
  },
  {
    id: 'haptics',
    question: '5. “Kuvvet geri bildirimi ve görüntü kalitesi nasıl?”',
    tag: 'Teknoloji Üstünlüğü',
    summary: 'Patentli Force Sensing Trokar, HapticSense®, 8 modlu ICG floresan görüntüleme, akıllı duman giderme ve <60 ms 5G tele-cerrahi desteğine sahiptir.',
    bullets: [
      'HapticSense® ve kuvvet algılayan trokar sayesinde doku direnci gerçek zamanlı ölçülür; sütür kopması ve doku travması riski azalır.',
      '8 farklı görüntüleme moduna sahip entegre ICG floresan sistemi tümör sınırlarını ve lenfatik/vasküler perfüzyonu netleştirir.',
      'Akıllı duman tahliye algoritması koter kullanımında görüş alanını otomatik temiz tutar; <60 ms gecikmeli 5G tele-cerrahi mimarisiyle uzaktan proktorluk yapılabilir.',
    ],
  },
  {
    id: 'kvkk',
    question: '6. “Veri güvenliği ne olacak?”',
    tag: 'KVKK & Siber Güvenlik',
    summary: 'Rakip sistemlerin aksine Toumai® hasta ve operasyon verilerini yurt dışı sunuculara göndermez; %100 hastane içi (KVKK uyumlu) çalışır.',
    bullets: [
      'Ameliyat videoları ve sistem telemetrisi hastane yerel ağından dışarı çıkmaz; Sağlık Bakanlığı bilgi güvenliği kriterlerine tam uyumludur.',
      'İnternet bağlantısı olmasa dahi robot ve RFID enstrüman doğrulaması kesintisiz çalışır.',
    ],
  },
];

interface Term {
  term: string;
  category: string;
  definition: string;
}

const GLOSSARY: Term[] = [
  { term: 'Docking', category: 'Ameliyathane', definition: 'Hasta başı robot kollarının trokarlara (kanüllere) kenetlenip ameliyata hazır hale getirilmesi işlemi.' },
  { term: 'Trokar', category: 'Ameliyathane', definition: 'Karın duvarından içeriye 8 mm robotik enstrümanların ve kameranın geçişini sağlayan valfli kanül.' },
  { term: 'Pnömoperitoneum', category: 'Klinik', definition: 'Cerrahın görüş ve çalışma alanı kazanması için karın boşluğunun karbondioksit (CO₂) gazı ile şişirilmesi.' },
  { term: 'Diseksiyon', category: 'Klinik', definition: 'Dokuların ve anatomik planların birbirinden kontrollü şekilde ayrıştırılması (en çok Maryland ve Makas kullanılır).' },
  { term: 'Koagülasyon', category: 'Enerji', definition: 'Bipolar veya monopolar yüksek frekanslı enerjiyle damarların yakılarak kanamanın durdurulması.' },
  { term: 'Anastomoz', category: 'Klinik', definition: 'İki içi boş organ ucunun (örn. radikal prostatektomide mesane ile üretra) robotik iğne tutucu ile birbirine dikilmesi.' },
  { term: 'Retraksiyon', category: 'Klinik', definition: 'Ameliyat sahasını açmak için bir organın 4. koldaki Strong Cadiere / Grasper ile sabit tutulup çekilmesi (ekartasyon).' },
  { term: 'Otoklav', category: 'Sterilizasyon', definition: 'Basınçlı buharla 134 °C’de sterilizasyon yapan cihaz. Çok kullanımlık Toumai® enstrümanları her vaka sonrası otoklavlanır.' },
  { term: 'Proktor', category: 'Eğitim', definition: 'Yeni başlayan cerraha ilk robotik vakalarında ameliyathanede eşlik eden kıdemli eğitmen cerrah.' },
  { term: 'ÜTS (Ürün Takip Sistemi)', category: 'Regülasyon', definition: 'Sağlık Bakanlığı TİTCK’nın tıbbi cihaz ve sarf malzemeleri tekil barkod/künye ile izlediği zorunlu bildirim sistemi.' },
  { term: 'DMO (Devlet Malzeme Ofisi)', category: 'Kamu Satış', definition: 'Kamu ve üniversite hastanelerinin merkezi katalog veya ihale yoluyla tıbbi cihaz/sarf tedarik ettiği kurum.' },
  { term: 'SUT (Sağlık Uygulama Tebliği)', category: 'Geri Ödeme', definition: 'SGK’nın hastanelere işlem ve sarf malzeme başına ödediği geri ödeme fiyat ve kurallarını belirleyen tebliğ.' },
];

export default function Playbook() {
  useDocumentMeta('Saha Satış Asistanı & İtiraz Karşılama Kılavuzu', 'Cerrah, satın alma ve biyomedikal için 2 dakikalık asansör konuşmaları, en sık gelen 6 itiraz ve tıbbi terimler sözlüğü.');
  const [openId, setOpenId] = useState<string>(OBJECTIONS[0].id);
  const [termQ, setTermQ] = useState('');

  const filteredTerms = useMemo(() => {
    const q = termQ.trim().toLocaleLowerCase('tr');
    if (!q) return GLOSSARY;
    return GLOSSARY.filter((t) => `${t.term} ${t.category} ${t.definition}`.toLocaleLowerCase('tr').includes(q));
  }, [termQ]);

  return (
    <>
      <PageHeader
        title="Saha Satış Asistanı & İtiraz Karşılama Kılavuzu"
        subtitle="Görüşmeye girmeden hemen önce telefondan hızlıca göz atılacak cep rehberi"
      />

      {/* 1) 2 Dakikalık Asansör Konuşmaları */}
      <section aria-labelledby="pitch-h" className="mb-8">
        <h2 id="pitch-h" className="mb-3 flex items-center gap-2 text-lg font-bold text-navy">
          <MessageSquareQuote aria-hidden="true" className="size-5 text-medical" /> 2 Dakikalık Asansör Konuşmaları (Elevator Pitch)
        </h2>
        <div className="grid gap-4 lg:grid-cols-3">
          {PITCHES.map((p) => (
            <Card as="article" key={p.role} className="flex flex-col justify-between p-5">
              <div>
                <header className="flex items-center justify-between gap-2">
                  <span className="grid size-9 place-items-center rounded-xl bg-sky-50 text-medical">
                    <p.icon aria-hidden="true" className="size-5" />
                  </span>
                  <Badge className="bg-slate-100 text-slate-700">{p.badge}</Badge>
                </header>
                <h3 className="mt-3 text-base font-bold text-navy">{p.role}</h3>
                <blockquote className="mt-2 rounded-xl border-l-4 border-medical bg-sky-50/60 p-3 text-xs font-medium italic text-slate-800">{p.hook}</blockquote>
                <ul className="mt-3 list-disc space-y-1.5 pl-4 text-xs text-slate-700">
                  {p.points.map((pt) => (
                    <li key={pt}>{pt}</li>
                  ))}
                </ul>
              </div>
              <footer className="mt-4 border-t border-slate-100 pt-3 text-xs font-semibold text-emerald-800">Kapanış Cümlesi: {p.close}</footer>
            </Card>
          ))}
        </div>
      </section>

      {/* 2) En Sık Gelen 6 İtiraz ve Çürütme Kartları */}
      <section aria-labelledby="obj-h" className="mb-8">
        <h2 id="obj-h" className="mb-3 flex items-center gap-2 text-lg font-bold text-navy">
          <ShieldCheck aria-hidden="true" className="size-5 text-emerald-600" /> En Sık Gelen 6 İtiraz ve Yanıt Kartları
        </h2>
        <ul className="space-y-2.5">
          {OBJECTIONS.map((o) => {
            const expanded = openId === o.id;
            return (
              <li key={o.id}>
                <Card as="article" className="overflow-hidden">
                  <h3>
                    <button
                      type="button"
                      aria-expanded={expanded}
                      aria-controls={`panel-${o.id}`}
                      onClick={() => setOpenId(expanded ? '' : o.id)}
                      className="flex w-full items-center justify-between gap-3 px-5 py-4 text-left hover:bg-slate-50"
                    >
                      <span className="font-semibold text-navy">{o.question}</span>
                      <span className="flex items-center gap-2">
                        <Badge className="bg-sky-50 text-sky-800">{o.tag}</Badge>
                        <ChevronDown aria-hidden="true" className={cn('size-5 text-slate-500 transition-transform', expanded && 'rotate-180')} />
                      </span>
                    </button>
                  </h3>
                  {expanded && (
                    <section id={`panel-${o.id}`} className="border-t border-slate-100 bg-slate-50/60 px-5 py-4 text-sm">
                      <p className="font-semibold text-emerald-900">{o.summary}</p>
                      <ul className="mt-2 list-disc space-y-1.5 pl-5 text-slate-700">
                        {o.bullets.map((b) => (
                          <li key={b}>{b}</li>
                        ))}
                      </ul>
                    </section>
                  )}
                </Card>
              </li>
            );
          })}
        </ul>
      </section>

      {/* 3) Hızlı Tıbbi ve Ticari Terimler Sözlüğü */}
      <section aria-labelledby="gl-h">
        <header className="mb-3 flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
          <h2 id="gl-h" className="flex items-center gap-2 text-lg font-bold text-navy">
            <BookOpen aria-hidden="true" className="size-5 text-medical" /> Hızlı Tıbbi & Ticari Terimler Sözlüğü
          </h2>
          <TextField label="Terim Ara" id="gl-q" type="search" placeholder="Docking, Trokar, Anastomoz, ÜTS, SUT…" value={termQ} onChange={(e) => setTermQ(e.target.value)} className="sm:w-72" />
        </header>
        {filteredTerms.length === 0 ? (
          <EmptyState title="Aranan terim bulunamadı" />
        ) : (
          <dl className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {filteredTerms.map((t) => (
              <Card key={t.term} className="p-4">
                <div className="flex items-center justify-between gap-2">
                  <dt className="font-bold text-navy">{t.term}</dt>
                  <Badge className="bg-slate-100 text-slate-700">{t.category}</Badge>
                </div>
                <dd className="mt-1.5 text-xs leading-relaxed text-slate-700">{t.definition}</dd>
              </Card>
            ))}
          </dl>
        )}
      </section>
    </>
  );
}
