import { describe, expect, it } from 'vitest';

import { CoinoneCliError } from '../src/lib/errors.js';
import { maxCompletedOrderWindowMs, parseTimestampInput, validateTimeWindow } from '../src/lib/time.js';

describe('parseTimestampInput', () => {
  it('accepts UTC millisecond timestamps', () => {
    expect(parseTimestampInput('1735689600000', '--from')).toBe(1735689600000);
  });

  it('accepts ISO-8601 timestamps', () => {
    expect(parseTimestampInput('2026-01-01T00:00:00Z', '--from')).toBe(1767225600000);
  });

  it('throws a helpful error for invalid timestamps', () => {
    expect(() => parseTimestampInput('not-a-date', '--from')).toThrowError(CoinoneCliError);
    expect(() => parseTimestampInput('not-a-date', '--from')).toThrow(/Invalid --from timestamp/);
  });
});

describe('validateTimeWindow', () => {
  it('returns parsed timestamps for valid windows', () => {
    expect(validateTimeWindow('2026-01-01T00:00:00Z', '2026-01-02T00:00:00Z')).toEqual({
      fromTs: 1767225600000,
      toTs: 1767312000000
    });
  });

  it('rejects reversed time windows', () => {
    expect(() => validateTimeWindow('2026-01-02T00:00:00Z', '2026-01-01T00:00:00Z')).toThrow(
      /Invalid completed order time range/
    );
  });

  it('rejects windows longer than 90 days', () => {
    const from = 1767225600000;
    const to = from + maxCompletedOrderWindowMs() + 1;

    expect(() => validateTimeWindow(String(from), String(to))).toThrow(
      /Invalid completed order time range/
    );
  });
});
