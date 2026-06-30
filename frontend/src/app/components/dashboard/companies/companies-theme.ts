

export const COMPANIES_CARD =
  'rounded-2xl border border-theme bg-white dark:bg-bg-card shadow-sm';

export const COMPANIES_INPUT =
  'rounded-xl border border-theme bg-white dark:bg-bg-card text-sm text-text-primary placeholder:text-text-muted outline-none transition-colors hover:border-violet-400 dark:hover:border-violet-500/50 focus:ring-2 focus:ring-violet-500/40';

export const COMPANIES_MENU_FIXED =
  'fixed z-[1050] min-w-[250px] max-w-[min(92vw,300px)] max-h-[calc(100dvh-1rem)] overflow-y-auto rounded-xl border border-theme bg-white dark:bg-bg-card py-1 shadow-lg users-menu-enter';

export const COMPANIES_PLAN_SUBMENU =
  'border-t border-b border-theme bg-bg-secondary px-2 py-1.5 users-plan-submenu-enter';

export const COMPANIES_MENU_ITEM =
  'flex w-full cursor-pointer items-center gap-2 px-4 py-2.5 text-left text-sm text-text-secondary transition-colors hover:bg-violet-50 hover:text-violet-700 dark:hover:bg-violet-950/30 dark:hover:text-violet-200';

// export const COMPANIES_DEMO_BADGE =
//   'rounded-full border border-amber-300 bg-amber-50 px-2 py-1 text-[10px] font-semibold uppercase tracking-wide text-amber-600 dark:border-amber-400/25 dark:bg-amber-400/10 dark:text-amber-300';

export const COMPANIES_DIALOG_PANEL = 'companies-dialog-panel';

export function companyPlanBadgeClass(plan: string): string {
  switch (plan) {
    case 'Pro':
      return 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300';
    case 'Enterprise':
      return 'bg-purple-100 text-purple-700 dark:bg-purple-500/15 dark:text-purple-300';
    default:
      return 'bg-blue-100 text-blue-700 dark:bg-blue-500/15 dark:text-blue-300';
  }
}


export function companyStatusBadgeClass(isActive: boolean): string {
  return isActive
    ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300'
    : 'bg-red-100 text-red-700 dark:bg-red-500/15 dark:text-red-300';
}

export function chartThemeColors(dark: boolean) {
  return {
    label:   dark ? '#94a3b8' : '#64748b',
    yLabel:  dark ? '#cbd5e1' : '#334155',
    grid:    dark ? '#1e2430' : '#e2e8f0',
    tooltip: (dark ? 'dark' : 'light') as 'dark' | 'light',
    primary: dark ? '#818cf8' : '#6366f1',
    success: dark ? '#4ade80' : '#10b981',
  };
}
