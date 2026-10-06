import { AbstractControl, ValidationErrors, ValidatorFn } from '@angular/forms';

/** Returns the numeric value of a control, or `null` when it is empty or not a number. */
function numericValue(control: AbstractControl): number | null {
  const value: unknown = control.value;
  if (value === null || value === undefined || value === '') return null;
  const parsed = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

/** Strictly greater than zero. Produces `{ positive: true }`. */
export function positiveNumber(): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    const value = numericValue(control);
    return value !== null && value <= 0 ? { positive: true } : null;
  };
}

/** Whole numbers only. Produces `{ integer: true }`. */
export function integerNumber(): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    const value = numericValue(control);
    return value !== null && !Number.isInteger(value) ? { integer: true } : null;
  };
}

/**
 * At most `maxDecimals` decimal places. Works on the decimal representation to avoid
 * floating point artefacts. Produces `{ maxDecimals: { max } }`.
 */
export function maxDecimals(max: number): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    const value = numericValue(control);
    if (value === null) return null;
    const text = String(value);
    // Exponent notation only appears for extreme magnitudes, which are never valid money values.
    if (/e/i.test(text)) return { maxDecimals: { max } };
    const decimals = text.split('.')[1]?.length ?? 0;
    return decimals > max ? { maxDecimals: { max } } : null;
  };
}

/**
 * Mirrors a backend decimal field with `maxDigits` total digits and `decimals` decimal places:
 * the integer part may have at most `maxDigits - decimals` digits. Produces `{ maxDigits: { max } }`.
 */
export function maxIntegerDigits(maxDigits: number, decimals: number): ValidatorFn {
  const allowed = maxDigits - decimals;
  return (control: AbstractControl): ValidationErrors | null => {
    const value = numericValue(control);
    if (value === null) return null;
    const integerPart = Math.trunc(Math.abs(value)).toString();
    return integerPart.length > allowed || /e/i.test(integerPart) ? { maxDigits: { max: allowed } } : null;
  };
}
