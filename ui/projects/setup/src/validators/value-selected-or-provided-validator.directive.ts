import {
  AbstractControl,
  NG_VALIDATORS,
  ValidationErrors,
  Validator,
} from "@angular/forms";
import { Directive } from "@angular/core";
import { SetupForm } from "../models/setup-form";

@Directive({
  selector: "[valueSelectedOrProvidedValidator]",
  providers: [
    {
      provide: NG_VALIDATORS,
      useExisting: ValueSelectedOrProvidedValidatorDirective,
      multi: true,
    },
  ],
  standalone: true,
})
export class ValueSelectedOrProvidedValidatorDirective implements Validator {
  validate(control: AbstractControl): ValidationErrors | null {
    const setupForm = control.value as SetupForm;
    if (
      this.isNonEmptyString(setupForm.index) ||
      this.isNonEmptyString(setupForm.indexOverride)
    ) {
      return null;
    }
    return {
      indexRequired: true,
    };
  }

  isNonEmptyString(obj: unknown): boolean {
    return typeof obj === "string" && obj.trim() !== "";
  }
}
