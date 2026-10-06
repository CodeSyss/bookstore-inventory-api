/**
 * Pure ISBN validation, framework-free. Mirrors the backend rules:
 * hyphens and whitespace are ignored, `x` is treated as `X`, and both the
 * ISBN-10 and ISBN-13 check digits must be correct.
 */

export type IsbnProblem = 'format' | 'checksum';

/** Strips separators and uppercases, producing the canonical comparison form. */
export function normalizeIsbn(raw: string): string {
  return raw.replace(/[\s-]/g, '').toUpperCase();
}

function isValidIsbn10(digits: string): boolean {
  if (!/^\d{9}[\dX]$/.test(digits)) return false;
  const sum = [...digits].reduce((acc, char, index) => {
    const value = char === 'X' ? 10 : Number(char);
    return acc + (10 - index) * value;
  }, 0);
  return sum % 11 === 0;
}

function isValidIsbn13(digits: string): boolean {
  if (!/^\d{13}$/.test(digits)) return false;
  const sum = [...digits].reduce((acc, char, index) => acc + Number(char) * (index % 2 === 0 ? 1 : 3), 0);
  return sum % 10 === 0;
}

/**
 * Returns what is wrong with the ISBN, or `null` when it is valid.
 * `format` means it is not 10 or 13 digits; `checksum` means the check digit is wrong.
 */
export function findIsbnProblem(raw: string): IsbnProblem | null {
  const digits = normalizeIsbn(raw);
  if (/^\d{9}[\dX]$/.test(digits)) return isValidIsbn10(digits) ? null : 'checksum';
  if (/^\d{13}$/.test(digits)) return isValidIsbn13(digits) ? null : 'checksum';
  return 'format';
}

export function isValidIsbn(raw: string): boolean {
  return findIsbnProblem(raw) === null;
}
