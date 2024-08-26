import { Component, Signal, signal, WritableSignal } from "@angular/core";
import { RouterOutlet } from "@angular/router";
import { FormsModule, NG_VALIDATORS } from "@angular/forms";
import { AsyncPipe, KeyValuePipe, NgForOf, NgIf } from "@angular/common";
import { SplunkService } from "../splunk/splunk.service";
import { toSignal } from "@angular/core/rxjs-interop";
import { concat, concatMap, concatWith, from, map, mergeWith } from "rxjs";
import { SecureUrlValidatorDirective } from "../validators/secure-url-validator.directive";
import { ValueSelectedOrProvidedValidatorDirective } from "../validators/value-selected-or-provided-validator.directive";
import { SetupForm } from "../models/setup-form";
import { BitwardenSplunkService } from "../splunk/bitwarden-splunk.service";

@Component({
  selector: "[id=app-root]",
  standalone: true,
  imports: [
    RouterOutlet,
    FormsModule,
    NgForOf,
    NgIf,
    KeyValuePipe,
    AsyncPipe,
    SecureUrlValidatorDirective,
    ValueSelectedOrProvidedValidatorDirective,
  ],
  templateUrl: "./app.component.html",
  styleUrl: "./app.component.scss",
  providers: [
    {
      provide: NG_VALIDATORS,
      useExisting: SecureUrlValidatorDirective,
      multi: true,
    },
    {
      provide: NG_VALIDATORS,
      useExisting: ValueSelectedOrProvidedValidatorDirective,
      multi: true,
    },
  ],
})
export class AppComponent {
  model: SetupForm = {
    clientId: "",
    clientSecret: "",
    serverUrl: "https://bitwarden.com",
    startDate: "",
    index: "",
    indexOverride: "",
  };

  indexes: Signal<string[] | undefined>;

  submitError: WritableSignal<string | undefined> = signal(undefined);

  constructor(
    splunkService: SplunkService,
    readonly bitwardenSplunkService: BitwardenSplunkService,
  ) {
    const indexesObservable = from(splunkService.getAllIndexes()).pipe(
      map((indexes) => indexes.map((index) => index.name)),
    );

    this.indexes = toSignal(indexesObservable);
  }

  async onSubmit() {
    console.log("Submit", this.model);

    this.submitError.set(undefined);

    try {
      // Store secrets
      await this.bitwardenSplunkService.upsertApiKey(
        this.model.clientId,
        this.model.clientSecret,
      );

      // Update inputs.conf
      const index = this.model.indexOverride ?? this.model.index;
      await this.bitwardenSplunkService.updateInputsConfigurationFile(index);

      // Update script.conf
      const serverUrl = new URL(this.model.serverUrl);
      const isBitwardenCloud = ["bitwarden.com", "bitwarden.eu"].includes(
        serverUrl.host,
      );
      const apiUrl = isBitwardenCloud
        ? `https://api.${serverUrl.host}`
        : serverUrl + "/api";
      const identityUrl = isBitwardenCloud
        ? `https://identity.${serverUrl.host}`
        : serverUrl + "/identity";
      console.log(apiUrl, identityUrl);
      await this.bitwardenSplunkService.updateScriptConfigurationFile(
        apiUrl,
        identityUrl,
        this.model.startDate!,
      );

      // Complete setup
      await this.bitwardenSplunkService.updateAppConfigurationFile(true);
      await this.bitwardenSplunkService.reloadApp();
    } catch (e: unknown) {
      console.error(e);
      let message = "An error occurred. Please try again.";
      if (e instanceof Error) {
        message += " Error: " + e.message;
      }
      this.submitError.set(message);
    }
  }
}
