import { NavLink, useNavigate } from 'react-router-dom';
import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { LayoutGrid, Map, Siren, UserCheck, Route as RouteIcon, Bus, Users, BarChart3, LogOut, PanelLeftClose, PanelLeftOpen } from 'lucide-react';
import { stocks, colors } from '@shared/theme/tokens.js';
import { useRealtime } from '@/lib/realtime';
import { cn } from '@/lib/utils';

const NAV = [
  { to: '/', label: 'Overview', icon: LayoutGrid, stock: stocks.mint },
  { to: '/map', label: 'Live map', icon: Map, stock: stocks.sky },
  { to: '/alerts', label: 'Alerts', icon: Siren, stock: { stock: colors.signalStock }, badge: (s) => s?.openIncidents?.total, urgent: (s) => s?.openIncidents?.panic },
  { to: '/applications', label: 'Driver applications', icon: UserCheck, stock: stocks.buff, badge: (s) => s?.pendingApplications },
  { to: '/routes', label: 'Routes & stops', icon: RouteIcon, stock: stocks.lilac },
  { to: '/buses', label: 'Buses', icon: Bus, stock: stocks.mint },
  { to: '/drivers', label: 'Drivers', icon: Users, stock: stocks.rose },
  { to: '/analytics', label: 'Reports', icon: BarChart3, stock: stocks.sky }
];

function Logo({ collapsed }) {
  return (
    <div className="flex items-center gap-3 px-1">
      <svg width="34" height="34" viewBox="0 0 32 32" aria-hidden="true" className="flex-none">
        <path fill="#FBFBF8" d="M4 7a3 3 0 0 1 3-3h18a3 3 0 0 1 3 3v6a3 3 0 0 0 0 6v6a3 3 0 0 1-3 3H7a3 3 0 0 1-3-3v-6a3 3 0 0 0 0-6z" />
        <circle cx="21" cy="16" r="3.2" fill="#16213E" />
        <path stroke="#16213E" strokeWidth="2.4" strokeLinecap="round" d="M9 11h7M9 16h5M9 21h7" />
      </svg>
      {!collapsed && (
        <div className="leading-tight">
          <div className="font-bold text-[17px] text-counterfoil">Depot</div>
          <div className="text-[12.5px] text-counterfoil/70">City Bus Tracker</div>
        </div>
      )}
    </div>
  );
}

/** Persistent emergency strip: stays lit until every SOS is acknowledged. */
function SosBanner() {
  const { summary } = useRealtime();
  const navigate = useNavigate();
  const open = summary?.openIncidents?.panic || 0;
  return (
    <AnimatePresence>
      {open > 0 && (
        <motion.button
          type="button"
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: 'auto', opacity: 1 }}
          exit={{ height: 0, opacity: 0 }}
          transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
          onClick={() => navigate('/alerts')}
          className="w-full bg-signal text-counterfoil text-left overflow-hidden"
        >
          <span className="flex items-center gap-3 px-6 py-2.5 font-semibold">
            <span className="relative flex h-2.5 w-2.5">
              <span className="absolute inline-flex h-full w-full rounded-full bg-counterfoil opacity-75 animate-ping" />
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-counterfoil" />
            </span>
            {open === 1 ? '1 SOS alert needs a response' : `${open} SOS alerts need a response`}
            <span className="ml-auto underline underline-offset-4">Open alerts</span>
          </span>
        </motion.button>
      )}
    </AnimatePresence>
  );
}

export default function Layout({ children, setIsAuthenticated, fullBleed = false }) {
  const [collapsed, setCollapsed] = useState(() => localStorage.getItem('rack') === 'collapsed');
  const { summary, connected } = useRealtime();
  const user = JSON.parse(localStorage.getItem('user') || '{}');

  const toggle = () => {
    localStorage.setItem('rack', collapsed ? 'open' : 'collapsed');
    setCollapsed(!collapsed);
  };

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setIsAuthenticated(false);
  };

  return (
    <div className="flex h-screen overflow-hidden">
      <aside
        className={cn('bg-ink text-counterfoil flex flex-col flex-none transition-[width] duration-300 ease-out', collapsed ? 'w-[72px]' : 'w-[248px]')}
        aria-label="Main navigation"
      >
        <div className={cn('pt-5 pb-6 px-4 flex items-center', collapsed ? 'flex-col gap-4' : 'justify-between')}>
          <Logo collapsed={collapsed} />
          <button type="button" onClick={toggle} className="p-1.5 rounded-sm text-counterfoil/70 hover:text-counterfoil hover:bg-counterfoil/10"
            aria-label={collapsed ? 'Expand navigation' : 'Collapse navigation'}>
            {collapsed ? <PanelLeftOpen size={18} /> : <PanelLeftClose size={18} />}
          </button>
        </div>

        <nav className="flex-1 px-3 space-y-1 overflow-y-auto">
          {NAV.map(({ to, label, icon: Icon, stock, badge, urgent }) => {
            const count = badge?.(summary) || 0;
            const isUrgent = urgent?.(summary) > 0;
            return (
              <NavLink
                key={to}
                to={to}
                end={to === '/'}
                title={collapsed ? label : undefined}
                className={({ isActive }) => cn(
                  'relative flex items-center gap-3 h-11 rounded-md transition-colors duration-150',
                  collapsed ? 'justify-center' : 'pl-4 pr-3',
                  isActive ? 'bg-counterfoil text-ink font-semibold' : 'text-counterfoil/80 hover:text-counterfoil hover:bg-counterfoil/10'
                )}
              >
                {({ isActive }) => (
                  <>
                    {isActive && (
                      <motion.span layoutId="rack-notch" className="absolute left-0 top-2 bottom-2 w-1 rounded-r-sm"
                        style={{ background: stock.ink || colors.signal }} transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }} />
                    )}
                    <Icon size={19} className="flex-none" />
                    {!collapsed && <span className="truncate">{label}</span>}
                    {count > 0 && (
                      <span className={cn(
                        'num text-[13px] min-w-[22px] h-[20px] px-1.5 rounded-sm grid place-items-center',
                        collapsed ? 'absolute -top-0.5 -right-0.5' : 'ml-auto',
                        isUrgent ? 'bg-signal text-counterfoil' : 'bg-buff text-buff-ink'
                      )}>{count}</span>
                    )}
                  </>
                )}
              </NavLink>
            );
          })}
        </nav>

        <div className={cn('p-4 border-t border-counterfoil/15 space-y-3', collapsed && 'px-2')}>
          <div className={cn('flex items-center gap-2 text-[13px]', collapsed && 'justify-center')} title={connected ? 'Live updates connected' : 'Reconnecting…'}>
            <span className={cn('h-2 w-2 rounded-full', connected ? 'bg-mint' : 'bg-buff animate-pulse')} />
            {!collapsed && <span className="text-counterfoil/75">{connected ? 'Live' : 'Reconnecting…'}</span>}
          </div>
          {!collapsed && user.email && <div className="text-[13px] text-counterfoil/60 truncate">{user.email}</div>}
          <button type="button" onClick={logout}
            className={cn('flex items-center gap-2 text-[14px] text-counterfoil/80 hover:text-counterfoil', collapsed && 'mx-auto')}
            aria-label="Sign out">
            <LogOut size={17} /> {!collapsed && 'Sign out'}
          </button>
        </div>
      </aside>

      <div className="flex-1 flex flex-col min-w-0">
        <SosBanner />
        <main className={cn('flex-1 min-h-0', fullBleed ? 'overflow-hidden' : 'overflow-y-auto')}>
          {fullBleed ? children : <div className="max-w-[1440px] mx-auto px-6 lg:px-10 py-8">{children}</div>}
        </main>
      </div>
    </div>
  );
}

/** Page heading: title + one line of context + actions. No eyebrows. */
export function PageHeader({ title, children, actions }) {
  return (
    <header className="flex flex-wrap items-end gap-4 justify-between mb-8">
      <div className="min-w-0">
        <h1 className="text-[28px] font-bold leading-tight">{title}</h1>
        {children && <p className="text-ink-soft mt-1 max-w-[70ch]">{children}</p>}
      </div>
      {actions && <div className="flex gap-2 flex-wrap">{actions}</div>}
    </header>
  );
}
