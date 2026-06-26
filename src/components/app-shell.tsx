'use client';

import {
  CheckCircle2,
  FileArchive,
  LayoutDashboard,
  LogOut,
  Package,
  ReceiptText,
  Settings,
  Users,
} from 'lucide-react';
import type { ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { MittyLogo } from '@/components/mitty-logo';
import { APP_VERSION, APP_VERSION_LABEL } from '@/lib/app-version';
import { cn } from '@/lib/utils';

export type AppSection = 'studio' | 'bulkImport' | 'products' | 'review' | 'settings' | 'usage' | 'staff';

type NavItem = {
  id: AppSection;
  label: string;
  icon: typeof LayoutDashboard;
};

const navItems: NavItem[] = [
  { id: 'studio', label: 'Studio', icon: LayoutDashboard },
  { id: 'bulkImport', label: 'Bulk Import', icon: FileArchive },
  { id: 'products', label: 'Products', icon: Package },
  { id: 'review', label: 'Review', icon: CheckCircle2 },
  { id: 'settings', label: 'Settings', icon: Settings },
  { id: 'usage', label: 'Usage Logs', icon: ReceiptText },
  { id: 'staff', label: 'Staff', icon: Users },
];

type AppShellProps = {
  activeSection: AppSection;
  onSectionChange: (section: AppSection) => void;
  children: ReactNode;
  userEmail: string;
  userRole: 'owner' | 'staff';
  isPlatformAdmin: boolean;
  onLogout: () => void;
};

export function AppShell({ activeSection, onSectionChange, children, userEmail, userRole, isPlatformAdmin, onLogout }: AppShellProps) {
  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,_rgba(183,141,74,0.12),_transparent_32rem),linear-gradient(180deg,_#faf7f0_0%,_#f4efe6_100%)] text-foreground">
      <SidebarNav activeSection={activeSection} onSectionChange={onSectionChange} userRole={userRole} isPlatformAdmin={isPlatformAdmin} />
      <div className="min-h-screen min-w-0 lg:pl-72">
        <Header userEmail={userEmail} userRole={userRole} onLogout={onLogout} />
        <main className="min-w-0 px-4 pb-28 pt-4 sm:px-6 lg:px-8 lg:pb-8">
          {children}
        </main>
      </div>
      <MobileNav activeSection={activeSection} onSectionChange={onSectionChange} userRole={userRole} isPlatformAdmin={isPlatformAdmin} />
    </div>
  );
}

function Header({
  userEmail,
  userRole,
  onLogout,
}: Pick<AppShellProps, 'userEmail' | 'userRole' | 'onLogout'>) {
  return (
    <header className="sticky top-0 z-30 border-b border-black/10 bg-[#faf7f0]/90 px-4 py-3 backdrop-blur-xl sm:px-6 lg:px-8">
      <div className="flex min-w-0 items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <MittyLogo className="h-10 w-10 shrink-0" />
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold uppercase tracking-[0.18em] text-[#8a6635]">
              MITTY Studio <span className="text-[10px] font-normal normal-case tracking-normal text-[#8a6635]/50">v{APP_VERSION}</span>
            </p>
            <h1 className="truncate text-lg font-semibold text-[#171717] sm:text-xl">
              Virtual Studio Dashboard
            </h1>
          </div>
        </div>
        <div className="flex min-w-0 items-center gap-2">
          <div className="hidden min-w-0 text-right sm:block">
            <p className="truncate text-sm font-medium text-[#171717]">{userEmail}</p>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#8a6635]">{userRole}</p>
          </div>
          <Button type="button" variant="outline" size="sm" onClick={onLogout} className="h-10 gap-2">
            <LogOut className="h-4 w-4" />
            Logout
          </Button>
        </div>
      </div>
    </header>
  );
}

function SidebarNav({
  activeSection,
  onSectionChange,
  userRole,
  isPlatformAdmin,
}: Pick<AppShellProps, 'activeSection' | 'onSectionChange' | 'userRole' | 'isPlatformAdmin'>) {
  const visibleNavItems = navItems.filter((item) =>
    item.id !== 'review' &&
    (item.id !== 'staff' || userRole === 'owner') &&
    (item.id !== 'usage' || isPlatformAdmin)
  );

  return (
    <aside className="fixed inset-y-0 left-0 z-40 hidden w-72 border-r border-black/10 bg-[#111111] p-4 text-white lg:block">
      <div className="flex h-full flex-col">
        <div className="mb-8 flex items-center gap-3 px-2">
          <MittyLogo className="h-11 w-11" />
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-[#d4b06a]">
              MITTY
            </p>
            <p className="text-sm text-white/60">Product content studio</p>
          </div>
        </div>
        <nav className="space-y-2">
          {visibleNavItems.map((item) => (
            <NavButton
              key={item.id}
              item={item}
              active={activeSection === item.id}
              onClick={() => onSectionChange(item.id)}
              layout="sidebar"
            />
          ))}
        </nav>
        <div className="mt-auto rounded-lg border border-white/10 bg-white/[0.04] p-4">
          <p className="text-sm font-medium">MITTY Virtual Studio</p>
          <p className="mt-1 text-xs leading-5 text-white/55">
            Create product visuals and listing copy from a guided studio workflow.
          </p>
          <p className="mt-2 text-[10px] text-white/30">{APP_VERSION_LABEL}</p>
        </div>
      </div>
    </aside>
  );
}

function MobileNav({
  activeSection,
  onSectionChange,
  userRole,
  isPlatformAdmin,
}: Pick<AppShellProps, 'activeSection' | 'onSectionChange' | 'userRole' | 'isPlatformAdmin'>) {
  const visibleNavItems = navItems.filter((item) =>
    item.id !== 'review' &&
    (item.id !== 'staff' || userRole === 'owner') &&
    (item.id !== 'usage' || isPlatformAdmin)
  );

  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-black/10 bg-[#111111]/95 px-2 pb-[calc(env(safe-area-inset-bottom)+0.5rem)] pt-2 text-white shadow-2xl backdrop-blur-xl lg:hidden">
      <div className="mx-auto grid max-w-xl auto-cols-fr grid-flow-col gap-1">
        {visibleNavItems.map((item) => (
          <NavButton
            key={item.id}
            item={item}
            active={activeSection === item.id}
            onClick={() => onSectionChange(item.id)}
            layout="mobile"
          />
        ))}
      </div>
    </nav>
  );
}

function NavButton({
  item,
  active,
  onClick,
  layout,
}: {
  item: NavItem;
  active: boolean;
  onClick: () => void;
  layout: 'sidebar' | 'mobile';
}) {
  const Icon = item.icon;

  if (layout === 'mobile') {
    return (
      <button
        type="button"
        onClick={onClick}
        className={cn(
          'flex min-h-14 flex-col items-center justify-center gap-1 rounded-lg px-1 text-[11px] font-medium text-white/60 transition-colors',
          active && 'bg-white/10 text-[#f4d99f]'
        )}
      >
        <Icon className="h-4 w-4" />
        <span className="truncate">{item.label}</span>
      </button>
    );
  }

  return (
    <Button
      type="button"
      variant="ghost"
      onClick={onClick}
      className={cn(
        'h-12 w-full justify-start gap-3 rounded-lg px-3 text-white/65 hover:bg-white/10 hover:text-white',
        active && 'bg-white text-[#111111] hover:bg-white hover:text-[#111111]'
      )}
    >
      <Icon className="h-5 w-5" />
      {item.label}
    </Button>
  );
}
