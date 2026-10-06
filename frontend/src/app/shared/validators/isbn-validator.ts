import { AbstractControl, ValidationErrors, ValidatorFn } from '@angular/forms';

import { findIsbnProblem } from '../../books/domain/isbn';

/**
 * Angular wrapper around the pure domain ISBN check.
 * Empty values are left to `Validators.required`.
 * Produces `{ isbnFormat: true }` or `{ isbnChecksum: true }`.
 */
export function isbnValidator(): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    const value: unknown = control.value;
    if (typeof value !== 'string' || value.trim() === '') return null;

    const problem = findIsbnProblem(value);
    if (problem === 'format') return { isbnFormat: true };
    if (problem === 'checksum') return { isbnChecksum: true };
    return null;
  };
}
