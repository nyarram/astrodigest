import { describe, it, expect } from 'vitest'
import { getNextSaturdayDelivery } from '../src/schedule.js'

function assertDelivery(result: Date, year: number, month: number, date: number): void {
  expect(result.getUTCFullYear()).toBe(year)
  expect(result.getUTCMonth()).toBe(month) // 0-indexed
  expect(result.getUTCDate()).toBe(date)
  expect(result.getUTCHours()).toBe(8)
  expect(result.getUTCMinutes()).toBe(0)
  expect(result.getUTCSeconds()).toBe(0)
  expect(result.getUTCMilliseconds()).toBe(0)
}

// Reference week: Mon 2025-01-06 → Sat 2025-01-11 → next Sat 2025-01-18
// Jan 2025: Jan 1 = Wednesday, so Jan 6 = Monday ✓

describe('getNextSaturdayDelivery', () => {
  describe('weekday → returns the coming Saturday at 08:00 UTC', () => {
    const cases: Array<[string, string]> = [
      ['Monday', '2025-01-06T12:00:00Z'],
      ['Tuesday', '2025-01-07T12:00:00Z'],
      ['Wednesday', '2025-01-08T12:00:00Z'],
      ['Thursday', '2025-01-09T12:00:00Z'],
      ['Friday', '2025-01-10T12:00:00Z'],
    ]

    it.each(cases)('%s returns Sat 2025-01-11 at 08:00 UTC', (_day, iso) => {
      assertDelivery(getNextSaturdayDelivery(new Date(iso)), 2025, 0, 11)
    })

    it('Sunday returns the following Saturday (2025-01-18) at 08:00 UTC', () => {
      assertDelivery(getNextSaturdayDelivery(new Date('2025-01-12T12:00:00Z')), 2025, 0, 18)
    })
  })

  describe('Saturday edge cases', () => {
    it('Saturday before 08:00 UTC returns today at 08:00 UTC', () => {
      assertDelivery(getNextSaturdayDelivery(new Date('2025-01-11T07:59:59Z')), 2025, 0, 11)
    })

    it('Saturday exactly at 08:00 UTC returns next Saturday at 08:00 UTC', () => {
      // candidate.getTime() === now.getTime() triggers the roll-forward guard
      assertDelivery(getNextSaturdayDelivery(new Date('2025-01-11T08:00:00.000Z')), 2025, 0, 18)
    })

    it('Saturday after 08:00 UTC returns next Saturday at 08:00 UTC', () => {
      assertDelivery(getNextSaturdayDelivery(new Date('2025-01-11T20:00:00Z')), 2025, 0, 18)
    })
  })
})
