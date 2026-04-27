const SATURDAY = 6
const DELIVERY_HOUR_UTC = 8

/**
 * Returns the next Saturday at 08:00:00.000 UTC.
 *
 * Edge case: if `now` IS a Saturday **and** it is strictly before 08:00 UTC,
 * the delivery fires today (not in 7 days).
 * If it is Saturday at or after 08:00 UTC, the next delivery is the following
 * Saturday at 08:00 UTC.
 *
 * @param now - The reference point in time (use `new Date()` in production;
 *              injectable for testing).
 */
export function getNextSaturdayDelivery(now: Date): Date {
  const dayOfWeek = now.getUTCDay() // 0 = Sunday … 6 = Saturday

  // How many days forward until we reach Saturday (0 when already Saturday).
  const daysUntilSaturday = dayOfWeek === SATURDAY ? 0 : SATURDAY - dayOfWeek

  const candidate = new Date(now)
  candidate.setUTCDate(now.getUTCDate() + daysUntilSaturday)
  candidate.setUTCHours(DELIVERY_HOUR_UTC, 0, 0, 0)

  // If we landed on today-Saturday but 08:00 UTC has already passed (or is
  // exactly now), roll forward to the following Saturday.
  if (candidate.getTime() <= now.getTime()) {
    candidate.setUTCDate(candidate.getUTCDate() + 7)
  }

  return candidate
}

/**
 * Returns Monday 00:00:00.000 UTC of the week that contains `now`.
 * ISO weeks start on Monday (getUTCDay() === 0 is Sunday → offset −6).
 */
export function getMondayUTC(now: Date): Date {
  const day = now.getUTCDay()
  const diff = day === 0 ? -6 : 1 - day
  const monday = new Date(now)
  monday.setUTCDate(now.getUTCDate() + diff)
  monday.setUTCHours(0, 0, 0, 0)
  return monday
}

/**
 * Returns Sunday 23:59:59.999 UTC, given the Monday of the same week.
 */
export function getSundayUTC(monday: Date): Date {
  const sunday = new Date(monday)
  sunday.setUTCDate(monday.getUTCDate() + 6)
  sunday.setUTCHours(23, 59, 59, 999)
  return sunday
}
