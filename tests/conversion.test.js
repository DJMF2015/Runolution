import { getMstoKmHr } from '../src/utils/conversion';

describe('getMstoKmHr', () => {
  test('converts metres per second to kilometres per hour from 0 to 1000', () => {
    for (let metresPerSecond = 0; metresPerSecond <= 1000; metresPerSecond += 1) {
      const expectedKmHr = (metresPerSecond * 60 * 60) / 1000;

      expect(getMstoKmHr(metresPerSecond)).toBe(
        `${expectedKmHr.toLocaleString('en-GB', {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        })} km/hr`,
      );
    }
  });

  test('formats invalid speed values as zero', () => {
    expect(getMstoKmHr(undefined)).toBe('0.00 km/hr');
    expect(getMstoKmHr(null)).toBe('0.00 km/hr');
    expect(getMstoKmHr('not-a-number')).toBe('0.00 km/hr');
  });
});
