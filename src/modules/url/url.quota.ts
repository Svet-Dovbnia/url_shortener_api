import { UserPlan } from '../user/user.entity';

export const MONTHLY_QUOTA: Record<UserPlan, number> = {
  [UserPlan.FREE]: 10,
  [UserPlan.PRO]: 100,
};

export function startOfCurrentMonthUTC(): Date {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
}

export function startOfNextMonthUTC(): Date {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1));
}
