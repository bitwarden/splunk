import { Component, Signal, signal, WritableSignal } from "@angular/core";
import { FormsModule, NG_VALIDATORS } from "@angular/forms";
import { NgForOf } from "@angular/common";
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
    FormsModule,
    NgForOf,
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
    serverUrlType: "bitwarden.com",
    serverUrl: "",
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
      let apiUrl: string;
      let identityUrl: string;
      if (this.isServerUrlBitwardenCloud()) {
        const serverHost =
          this.model.serverUrlType === "bitwarden.com"
            ? "bitwarden.com"
            : "bitwarden.eu";
        apiUrl = `https://api.${serverHost}`;
        identityUrl = `https://identity.${serverHost}`;
      } else {
        const containsProtocol = /^https?:\/\//.test(this.model.serverUrl);
        const serverUrl = new URL(
          containsProtocol
            ? this.model.serverUrl
            : "https://" + this.model.serverUrl,
        );

        if (!serverUrl.pathname.endsWith("/")) {
          serverUrl.pathname = serverUrl.pathname + "/";
        }

        apiUrl = serverUrl.href + "api";
        identityUrl = serverUrl.href + "identity";
      }

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

          if (
            scriptConfiguration !== undefined &&
            URL.canParse(scriptConfiguration.apiUrl)
          ) {
            const apiUrl = new URL(scriptConfiguration.apiUrl);
            if (apiUrl.host === "api.bitwarden.com") {
              this.model.serverUrlType = "bitwarden.com";
            } else if (apiUrl.host === "api.bitwarden.eu") {
              this.model.serverUrlType = "bitwarden.eu";
            } else {
              this.model.serverUrlType = "self-hosted";
              apiUrl.pathname = apiUrl.pathname.replace(/\/api$/i, "");
              this.model.serverUrl = apiUrl.href;
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

  isServerUrlBitwardenCloud(): boolean {
    return (
      this.model.serverUrlType === "bitwarden.com" ||
      this.model.serverUrlType === "bitwarden.eu"
    );
  }

  changeServerUrlType() {
    if (this.isServerUrlBitwardenCloud()) {
      this.model.serverUrl = "";
    }
  }
}
