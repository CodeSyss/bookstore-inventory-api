import { FormControl } from '@angular/forms';

import { integerNumber, maxDecimals, maxIntegerDigits, positiveNumber } from './number-validators';

function check(validator: ReturnType<typeof positiveNumber>, value: unknown) {
  return validator(new FormControl(value));
}

describe('number validators', () => {
  describe('positiveNumber', () => {
    it.each([0, -1, -0.01])('rejects %s', (value) => {
      expect(check(positiveNumber(), value)).toEqual({ positive: true });
    });

    it.each([0.01, 1, 1000])('accepts %s', (value) => {
      expect(check(positiveNumber(), value)).toBeNull();
    });

    it.each([null, '', undefined])('leaves the empty value %j to `required`', (value) => {
      expect(check(positiveNumber(), value)).toBeNull();
    });
  });

  describe('integerNumber', () => {
    it('rejects fractions and accepts whole numbers', () => {
      expect(check(integerNumber(), 1.5)).toEqual({ integer: true });
      expect(check(integerNumber(), 2)).toBeNull();
      expect(check(integerNumber(), 0)).toBeNull();
    });
  });

  describe('maxDecimals', () => {
    it('accepts up to the allowed number of decimals', () => {
      expect(check(maxDecimals(2), 10)).toBeNull();
      expect(check(maxDecimals(2), 10.5)).toBeNull();
      expect(check(maxDecimals(2), 10.25)).toBeNull();
    });

    it('rejects more decimals than allowed', () => {
      expect(check(maxDecimals(2), 10.255)).toEqual({ maxDecimals: { max: 2 } });
    });

    it('rejects exponent notation, which only appears for extreme values', () => {
      expect(check(maxDecimals(2), 1e-7)).toEqual({ maxDecimals: { max: 2 } });
    });
  });

  describe('maxIntegerDigits', () => {
    it('allows maxDigits minus decimals integer digits', () => {
      expect(check(maxIntegerDigits(10, 2), 99999999.99)).toBeNull();
      expect(check(maxIntegerDigits(10, 2), 100000000)).toEqual({ maxDigits: { max: 8 } });
    });
  });
});
