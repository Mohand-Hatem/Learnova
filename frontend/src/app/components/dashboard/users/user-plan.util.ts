export const USER_PLANS = ['Free', 'Pro', 'Enterprise'] as const;
export type UserPlan = (typeof USER_PLANS)[number];

export function getUserDisplayName(name: { en: string; ar: string } | string): string {
  if (typeof name === 'string') return name;
  return name.en || name.ar || '—';
}
