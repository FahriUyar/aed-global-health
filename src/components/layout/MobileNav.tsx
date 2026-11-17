import { NavLink } from 'react-router-dom';
import { NAV_ITEMS } from './navItems';
import { cn } from '../../lib/domain';

export function MobileNav() {
  return (
    <nav aria-label="Alt menü" className="no-print fixed inset-x-0 bottom-0 z-40 border-t border-slate-200 bg-white/95 pb-[env(safe-area-inset-bottom)] backdrop-blur lg:hidden">
      <ul className="grid grid-cols-6">
        {NAV_ITEMS.map(({ to, short, label, icon: Icon }) => (
          <li key={to}>
            <NavLink
              to={to}
              end={to === '/'}
              aria-label={label}
              className={({ isActive }) =>
                cn('flex flex-col items-center gap-0.5 px-1 py-2 text-[11px] font-medium', isActive ? 'text-medical' : 'text-slate-600')
              }
            >
              <Icon aria-hidden="true" className="size-5" />
              <span aria-hidden="true">{short}</span>
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  );
}
