import { Component, Signal, signal, WritableSignal } from "@angular/core";
import { RouterOutlet } from "@angular/router";
import { FormsModule, NG_VALIDATORS } from "@angular/forms";
import { AsyncPipe, KeyValuePipe, NgForOf, NgIf } from "@angular/common";
import { SplunkService } from "../splunk/splunk.service";
import { toSignal, takeUntilDestroyed } from "@angular/core/rxjs-interop";
import { combineLatest, from, map, Observable, timeout } from "rxjs";
import { SecureUrlValidatorDirective } from "../validators/secure-url-validator.directive";
import { ValueSelectedOrProvidedValidatorDirective } from "../validators/value-selected-or-provided-validator.directive";
import { SetupForm } from "../models/setup-form";
import { BitwardenSplunkService } from "../splunk/bitwarden-splunk.service";

type SubmitResult = {
  success: boolean;
  message?: string;
};

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

  loadingConfiguration = signal(true);

  indexes: Signal<string[] | undefined>;

  submitLoading = signal(false);
  submitResult: WritableSignal<SubmitResult | undefined> = signal(undefined);

  constructor(
    splunkService: SplunkService,
    readonly bitwardenSplunkService: BitwardenSplunkService,
  ) {
    // Load indexes
    const indexesObservable = from(splunkService.getAllIndexes()).pipe(
      map((indexes) => indexes.map((index) => index.name)),
    );

    this.indexes = toSignal(indexesObservable);

    // Load saved configuration
    this.loadConfiguration(indexesObservable);
  }

  async onSubmit() {
    console.log("Submit", this.model);

    this.submitLoading.set(true);
    this.submitResult.set(undefined);

    try {
      // Store secrets
      await this.bitwardenSplunkService.upsertApiKey(
        this.model.clientId,
        this.model.clientSecret,
      );

      // Update inputs.conf
      const index = this.model.indexOverride
        ? this.model.indexOverride
        : this.model.index;
      await this.bitwardenSplunkService.updateInputsConfigurationFile({
        index,
      });

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
      console.log("Bitwarden urls", apiUrl, identityUrl);
      await this.bitwardenSplunkService.updateScriptConfigurationFile({
        apiUrl,
        identityUrl,
        startDate: this.model.startDate,
      });

      // Complete setup
      await this.bitwardenSplunkService.updateAppConfigurationFile(true);
      await this.bitwardenSplunkService.reloadApp();

      // Show save confirmation
      this.submitResult.set({ success: true });
    } catch (e: unknown) {
      console.error(e);
      let message = "An error occurred. Please try again.";
      if (e instanceof Error) {
        message += " Error: " + e.message;
      }
      this.submitResult.set({ success: false, message });
    } finally {
      this.submitLoading.set(false);
    }
  }

  private loadConfiguration(indexesObservable: Observable<string[]>) {
    combineLatest([
      indexesObservable,
      this.bitwardenSplunkService.getInputsConfigurationFile(),
      this.bitwardenSplunkService.getScriptConfigurationFile(),
    ])
      .pipe(timeout(60_000), takeUntilDestroyed())
      .subscribe({
        next: ([indexes, inputsConfiguration, scriptConfiguration]) => {
          console.log(indexes, inputsConfiguration, scriptConfiguration);

          if (inputsConfiguration !== undefined) {
            if (indexes.includes(inputsConfiguration.index)) {
              this.model.index = inputsConfiguration.index;
            } else {
              this.model.indexOverride = inputsConfiguration.index;
            }
          }

          if (scriptConfiguration !== undefined) {
            const apiUrl = new URL(scriptConfiguration.apiUrl);
            const isBitwardenCloud = [
              "api.bitwarden.com",
              "api.bitwarden.eu",
            ].includes(apiUrl.host);

            if (isBitwardenCloud) {
              apiUrl.host = apiUrl.host.replace("api.", "");
              this.model.serverUrl = `https://${apiUrl.host}`;
            } else {
              apiUrl.search = "";
              apiUrl.pathname = "/";
              this.model.serverUrl = apiUrl.origin;
            }
            this.model.startDate = scriptConfiguration.startDate ?? "";
          }

          this.loadingConfiguration.set(false);
        },
        error: (error) => {
          this.loadingConfiguration.set(false);
          console.log(error);
        },
      });
  }
}
