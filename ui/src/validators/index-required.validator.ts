import { AbstractControl, ValidationErrors, ValidatorFn } from '@angular/forms';

/**
 * Form-level validator that ensures either 'index' or 'indexOverride' field has a value.
 * Returns { indexRequired: true } if both fields are empty.
 */
export function indexRequiredValidator(): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    const indexControl = control.get('index');
    const indexOverrideControl = control.get('indexOverride');

    if (!indexControl || !indexOverrideControl) {
      // Form structure not yet initialized
      return null;
    }

    const indexValue = indexControl.value;
    const indexOverrideValue = indexOverrideControl.value;

    if (isNonEmptyString(indexValue) || isNonEmptyString(indexOverrideValue)) {
      return null;
    }

    return { indexRequired: true };
  };
}

function isNonEmptyString(obj: unknown): boolean {
  return typeof obj === 'string' && obj.trim() !== '';
}
