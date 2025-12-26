import { AbstractControl, ValidationErrors, ValidatorFn } from "@angular/forms";

/**
 * Validator function that ensures URLs are secure (https) and properly formatted.
 * Returns { insecureUrl: true } for http:// URLs or { invalidUrl: true } for malformed URLs.
 */
export function secureUrlValidator(): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    if (!control.value) {
      return null;
    }

    const value = (control.value as string).trim();

    // Check for insecure http:// protocol
    if (value.startsWith("http://")) {
      return { insecureUrl: true };
    }

    // Check if URL is valid as-is
    if (URL.canParse(value)) {
      return null;
    }

    // Try prepending https:// if not present
    if (!value.startsWith("https://")) {
      const newValue = "https://" + value;
      if (URL.canParse(newValue)) {
        return null;
      }
    }

    return { invalidUrl: true };
  };
}
