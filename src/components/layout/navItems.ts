import { LayoutDashboard, Hospital, BookOpen, Calculator, Route, MessageSquareQuote, type LucideIcon } from 'lucide-react';

export interface NavItem {
  to: string;
  label: string;
  short: string;
  icon: LucideIcon;
}

export const NAV_ITEMS: NavItem[] = [
  { to: '/', label: 'Komuta Merkezi', short: 'Merkez', icon: LayoutDashboard },
  { to: '/hospitals', label: 'Hastane & İstihbarat', short: 'Hastane', icon: Hospital },
  { to: '/catalog', label: 'Enstrüman Kataloğu', short: 'Katalog', icon: BookOpen },
  { to: '/roi-calculator', label: 'ROI Simülatörü', short: 'ROI', icon: Calculator },
  { to: '/route-planner', label: 'Rota Planlayıcı', short: 'Rota', icon: Route },
  { to: '/playbook', label: 'Satış Kılavuzu', short: 'Kılavuz', icon: MessageSquareQuote },
];
