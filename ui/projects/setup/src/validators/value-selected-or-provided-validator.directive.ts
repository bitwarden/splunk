import {
  AbstractControl,
  NG_VALIDATORS,
  ValidationErrors,
  Validator,
  ValidatorFn,
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
    console.log(control.value);
    const setupForm = control.value as SetupForm;
    if (!setupForm.index && !setupForm.indexOverride) {
      return {
        indexRequired: true,
      };
    }
    return null;
  }
}
