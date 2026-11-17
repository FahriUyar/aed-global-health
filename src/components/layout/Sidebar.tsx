import { NavLink } from 'react-router-dom';
import { Bot, PanelLeftClose, PanelLeftOpen } from 'lucide-react';
import { NAV_ITEMS } from './navItems';
import { cn } from '../../lib/domain';

export function Sidebar({ collapsed, onToggle }: { collapsed: boolean; onToggle: () => void }) {
  return (
    <aside
      className={cn(
        'no-print sticky top-0 hidden h-dvh shrink-0 flex-col bg-navy text-slate-200 transition-[width] duration-200 lg:flex',
        collapsed ? 'w-[4.5rem]' : 'w-64',
      )}
      aria-label="Ana menü"
    >
      <header className={cn('flex items-center gap-3 border-b border-white/10 px-4 py-5', collapsed && 'justify-center px-2')}>
        <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-medical text-white shadow-lg shadow-sky-900/40">
          <Bot aria-hidden="true" className="size-6" />
        </span>
        {!collapsed && (
          <p className="leading-tight">
            <strong className="block text-sm font-bold text-white">AED Global</strong>
            <span className="text-xs text-sky-300">Toumai® Saha CRM</span>
          </p>
        )}
      </header>
      <nav aria-label="Modüller" className="flex-1 overflow-y-auto px-3 py-4">
        <ul className="flex flex-col gap-1">
          {NAV_ITEMS.map(({ to, label, icon: Icon }) => (
            <li key={to}>
              <NavLink
                to={to}
                end={to === '/'}
                title={collapsed ? label : undefined}
                aria-label={collapsed ? label : undefined}
                className={({ isActive }) =>
                  cn(
                    'flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition',
                    collapsed && 'justify-center px-0',
                    isActive ? 'bg-medical text-white shadow' : 'text-slate-300 hover:bg-white/10 hover:text-white',
                  )
                }
              >
                <Icon aria-hidden="true" className="size-5 shrink-0" />
                {!collapsed && <span>{label}</span>}
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>
      <footer className="border-t border-white/10 p-3">
        <button
          type="button"
          onClick={onToggle}
          aria-label={collapsed ? 'Menüyü genişlet' : 'Menüyü daralt'}
          aria-expanded={!collapsed}
          className={cn('flex w-full items-center gap-3 rounded-xl px-3 py-2 text-sm text-slate-300 hover:bg-white/10 hover:text-white', collapsed && 'justify-center px-0')}
        >
          {collapsed ? <PanelLeftOpen aria-hidden="true" className="size-5" /> : <PanelLeftClose aria-hidden="true" className="size-5" />}
          {!collapsed && <span>Menüyü daralt</span>}
        </button>
        {!collapsed && <p className="mt-2 px-3 text-[11px] text-slate-400">MicroPort® MedBot™ Türkiye Distribütörü</p>}
      </footer>
    </aside>
  );
}
