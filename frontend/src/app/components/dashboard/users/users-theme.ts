/** Shared Tailwind classes for users dashboard (light + dark). */

export const USERS_CARD =
  'rounded-2xl border border-theme bg-white dark:bg-bg-card shadow-sm';

export const USERS_INPUT =
  'rounded-xl border border-theme bg-white dark:bg-bg-card text-sm text-text-primary placeholder:text-text-muted outline-none transition-colors hover:border-violet-400 dark:hover:border-violet-500/50 focus:ring-2 focus:ring-violet-500/40';

/** Fixed popover — avoids clipping inside table overflow containers */
export const USERS_MENU_FIXED =
  'fixed z-[1050] min-w-[200px] max-h-[min(20rem,calc(100dvh-1.5rem))] overflow-y-auto overscroll-contain rounded-xl border border-theme bg-white dark:bg-bg-card py-1 shadow-lg';

export const USERS_PLAN_SUBMENU =
  'max-h-36 overflow-y-auto overscroll-contain border-t border-b border-theme bg-bg-secondary py-1';

export const USERS_MENU_ITEM =
  'flex w-full items-center gap-2 px-4 py-2.5 text-left text-sm text-text-secondary transition-colors hover:bg-violet-50 hover:text-violet-700 dark:hover:bg-violet-950/30 dark:hover:text-violet-200';

export const USERS_DEMO_BADGE =
  'rounded-full border border-amber-300 bg-amber-50 px-2 py-1 text-[10px] font-semibold uppercase tracking-wide text-amber-600 dark:border-amber-400/25 dark:bg-amber-400/10 dark:text-amber-300';

export const USERS_DIALOG_PANEL = 'users-dialog-panel';

export function planBadgeClass(plan: string): string {
  switch (plan) {
    case 'Pro':
      return 'bg-violet-100 text-violet-700 dark:bg-violet-500/15 dark:text-violet-300';
    case 'Enterprise':
      return 'bg-purple-100 text-purple-700 dark:bg-purple-500/15 dark:text-purple-300';
    default:
      return 'bg-slate-100 text-slate-700 dark:bg-slate-700/50 dark:text-slate-300';
  }
}

export function atsBadgeClass(score: number): string {
  if (score >= 80) {
    return 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-success';
  }
  if (score >= 60) {
    return 'bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-warning';
  }
  return 'bg-red-100 text-red-700 dark:bg-red-500/15 dark:text-error';
}

export function chartThemeColors(dark: boolean) {
  return {
    label: dark ? '#94a3b8' : '#64748b',
    yLabel: dark ? '#cbd5e1' : '#334155',
    grid: dark ? '#1e2430' : '#e2e8f0',
    tooltip: (dark ? 'dark' : 'light') as 'dark' | 'light',
    primary: dark ? '#818cf8' : '#6366f1',
    success: dark ? '#4ade80' : '#10b981',
  };
}
