import { hourSlotsForDate, zonedLocalToUtcMs, formatSlotLabel } from './clinic-hours';

describe('clinic hours', () => {
  it('converts 9 AM Asia/Kolkata to 03:30 UTC', () => {
    expect(zonedLocalToUtcMs('2026-08-16', 9, 0, 'Asia/Kolkata')).toBe(Date.UTC(2026, 7, 16, 3, 30));
  });

  it('builds 12 hourly slots from 9 AM to 9 PM', () => {
    const slots = hourSlotsForDate('2026-08-16', 'Asia/Kolkata', '09:00', '21:00');
    expect(slots).toHaveLength(12);
    expect(slots[0].label).toBe('9 AM – 10 AM');
    expect(slots[2].label).toBe('11 AM – 12 PM');
    expect(slots[11].label).toBe('8 PM – 9 PM');
    expect(slots[0].startsAt).toBe(Date.UTC(2026, 7, 16, 3, 30));
    expect(slots[0].endsAt).toBe(Date.UTC(2026, 7, 16, 4, 30));
  });

  it('labels noon crossing', () => {
    expect(formatSlotLabel(11)).toBe('11 AM – 12 PM');
    expect(formatSlotLabel(12)).toBe('12 PM – 1 PM');
  });
});
