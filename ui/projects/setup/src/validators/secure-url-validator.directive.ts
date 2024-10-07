import {
  AbstractControl,
  NG_VALIDATORS,
  ValidationErrors,
  Validator,
} from "@angular/forms";
import { Directive } from "@angular/core";

@Directive({
  selector: "[secureUrlValidator]",
  providers: [
    {
      provide: NG_VALIDATORS,
      useExisting: SecureUrlValidatorDirective,
      multi: true,
    },
  ],
  standalone: true,
})
export class SecureUrlValidatorDirective implements Validator {
  validate(control: AbstractControl): ValidationErrors | null {
    console.log(control.value);
    if (!control.value) {
      return null;
    }
    const value = (control.value as string).trim();
    if (value.startsWith("http://")) {
      return {
        insecureUrl: true,
      };
    }

    if (URL.canParse(value)) {
      return null;
    }

    if (!value.startsWith("https://")) {
      const newValue = "https://" + value;
      if (URL.canParse(newValue)) {
        return null;
      }
    }

    return {
      invalidUrl: true,
    };
  }
}
