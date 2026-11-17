import { useState, type FormEvent } from 'react';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { Bot, Database, Lock } from 'lucide-react';
import { ToastProvider } from './components/ui/Toast';
import { CRMProvider, useCRM } from './context/CRMContext';
import { Sidebar } from './components/layout/Sidebar';
import { Header } from './components/layout/Header';
import { MobileNav } from './components/layout/MobileNav';
import { Card, TextField, btn } from './components/ui';
import Dashboard from './pages/Dashboard';
import Hospitals from './pages/Hospitals';
import HospitalDetail from './pages/HospitalDetail';
import Catalog from './pages/Catalog';
import RoiCalculator from './pages/RoiCalculator';
import RoutePlanner from './pages/RoutePlanner';
import Playbook from './pages/Playbook';

function Shell() {
  const { authState } = useCRM();
  const [collapsed, setCollapsed] = useState(false);

  if (authState === 'checking') {
    return (
      <main className="grid min-h-dvh place-items-center bg-slate-50 p-6 text-center">
        <p className="text-sm font-medium text-slate-600">Supabase oturumu kontrol ediliyor…</p>
      </main>
    );
  }
  if (authState === 'signed-out') return <AuthGate />;

  return (
    <div className="flex min-h-dvh bg-slate-50 text-slate-900">
      <a href="#main-content" className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-lg focus:bg-navy focus:px-4 focus:py-2 focus:text-sm focus:font-semibold focus:text-white">
        Ana içeriğe atla
      </a>
      <Sidebar collapsed={collapsed} onToggle={() => setCollapsed((c) => !c)} />
      <div className="flex min-w-0 flex-1 flex-col">
        <Header />
        <main id="main-content" className="mx-auto w-full max-w-7xl flex-1 px-4 py-6 pb-24 lg:px-8 lg:pb-10">
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/hospitals" element={<Hospitals />} />
            <Route path="/hospitals/:id" element={<HospitalDetail />} />
            <Route path="/catalog" element={<Catalog />} />
            <Route path="/roi-calculator" element={<RoiCalculator />} />
            <Route path="/route-planner" element={<RoutePlanner />} />
            <Route path="/playbook" element={<Playbook />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </main>
        <footer className="no-print border-t border-slate-200 bg-white px-4 py-3 text-center text-xs text-slate-500 lg:px-8">
          AED Global Health · MicroPort® MedBot™ Toumai® MT-1000 Türkiye Saha Satış, İstihbarat ve Sarf Takip Sistemi
        </footer>
        <MobileNav />
      </div>
    </div>
  );
}

function AuthGate() {
  const { signIn, continueOffline } = useCRM();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setErr(null);
    const res = await signIn(email.trim(), password);
    if (res) setErr(res);
    setBusy(false);
  };

  return (
    <main className="grid min-h-dvh place-items-center bg-navy p-4">
      <Card as="article" className="w-full max-w-md p-6">
        <header className="mb-5 flex items-center gap-3">
          <span className="grid size-11 place-items-center rounded-2xl bg-medical text-white">
            <Bot aria-hidden="true" className="size-6" />
          </span>
          <div>
            <h1 className="text-lg font-bold text-navy">AED Global — Toumai® Saha CRM</h1>
            <p className="text-xs text-slate-600">Supabase Bulut Oturumu</p>
          </div>
        </header>
        <form onSubmit={submit} className="space-y-3">
          <TextField label="E-posta" id="login-email" type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
          <TextField label="Şifre" id="login-pass" type="password" autoComplete="current-password" required value={password} onChange={(e) => setPassword(e.target.value)} />
          {err && <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-xs font-medium text-red-700">{err}</p>}
          <button type="submit" disabled={busy} className={`${btn('primary')} w-full`}>
            <Lock aria-hidden="true" className="size-4" /> {busy ? 'Giriş yapılıyor…' : 'Bulut Oturumu Aç'}
          </button>
        </form>
        <footer className="mt-4 border-t border-slate-100 pt-4 text-center">
          <button type="button" onClick={continueOffline} className={`${btn('secondary')} w-full`}>
            <Database aria-hidden="true" className="size-4" /> Çevrimdışı / Yerel Depolama Modunda Devam Et
          </button>
        </footer>
      </Card>
    </main>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <ToastProvider>
        <CRMProvider>
          <Shell />
        </CRMProvider>
      </ToastProvider>
    </BrowserRouter>
  );
}
