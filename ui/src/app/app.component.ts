import { Component, Signal, signal, WritableSignal } from "@angular/core";
import { ReactiveFormsModule, FormBuilder, Validators } from "@angular/forms";

import { SplunkService } from "../splunk/splunk.service";
import { toSignal, takeUntilDestroyed } from "@angular/core/rxjs-interop";
import { combineLatest, from, map, Observable, startWith, timeout } from "rxjs";
import { secureUrlValidator, indexRequiredValidator } from "../validators";
import { SetupForm, ServerUrlType } from "../models/setup-form";
import { BitwardenSplunkService } from "../splunk/bitwarden-splunk.service";

type SubmitResult = {
  success: boolean;
  message?: string;
};

@Component({
  selector: "[id=app-root]",
  imports: [ReactiveFormsModule],
  templateUrl: "./app.component.html",
  styleUrl: "./app.component.scss",
})
export class AppComponent {
  protected setupForm;

  protected loadingConfiguration = signal(true);

  protected indexes: Signal<string[] | undefined>;

  protected submitLoading = signal(false);
  protected submitResult: WritableSignal<SubmitResult | undefined> =
    signal(undefined);

  constructor(
    splunkService: SplunkService,
    fb: FormBuilder,
    private bitwardenSplunkService: BitwardenSplunkService,
  ) {
    // Initialize reactive form
    this.setupForm = fb.group(
      {
        clientId: ["", Validators.required],
        clientSecret: ["", Validators.required],
        serverUrlType: ["bitwarden.com" as ServerUrlType],
        serverUrl: [""],
        startDate: [""],
        index: [""],
        indexOverride: [""],
      },
      {
        validators: indexRequiredValidator(),
      },
    );

    // If self-host is specified, enable the URL field
    this.setupForm.controls.serverUrlType.valueChanges
      .pipe(
        startWith(this.setupForm.controls.serverUrlType.value),
        takeUntilDestroyed(),
      )
      .subscribe((serverUrlType) => {
        const serverUrlControl = this.setupForm.controls.serverUrl;

        if (serverUrlType === "self-hosted") {
          serverUrlControl.setValidators([
            Validators.required,
            secureUrlValidator(),
          ]);
          serverUrlControl.enable();
        } else {
          serverUrlControl.clearValidators();
          serverUrlControl.disable();
        }

        serverUrlControl.updateValueAndValidity();
      });

    // If an index name has been manually specified, disable the drop-down
    this.setupForm.controls.indexOverride.valueChanges
      .pipe(
        startWith(this.setupForm.controls.indexOverride.value),
        takeUntilDestroyed(),
      )
      .subscribe((indexOverride) => {
        const indexControl = this.setupForm.controls.index;

        if (indexOverride && indexOverride.length > 0) {
          indexControl.disable();
        } else {
          indexControl.enable();
        }
      });

    // Load indexes
    const indexesObservable = from(splunkService.getAllIndexes()).pipe(
      map((indexes) => indexes.map((index) => index.name)),
    );

    this.indexes = toSignal(indexesObservable);

    // Load saved configuration
    this.loadConfiguration(indexesObservable);
  }

  async onSubmit() {
    // Validate form before submission
    if (this.setupForm.invalid) {
      this.setupForm.markAllAsTouched();
      return;
    }

    this.submitLoading.set(true);
    this.submitResult.set(undefined);

    const formValue = this.setupForm.value as SetupForm;

    try {
      // Store secrets
      await this.bitwardenSplunkService.upsertApiKey(
        formValue.clientId,
        formValue.clientSecret,
      );

      // Update inputs.conf
      const index = formValue.indexOverride
        ? formValue.indexOverride
        : formValue.index;
      console.debug("Index", index);
      await this.bitwardenSplunkService.updateInputsConfigurationFile({
        index,
      });

      // Update script.conf
      let apiUrl: string;
      let identityUrl: string;
      if (this.isServerUrlBitwardenCloud(formValue.serverUrlType)) {
        const serverHost =
          formValue.serverUrlType === "bitwarden.com"
            ? "bitwarden.com"
            : "bitwarden.eu";
        apiUrl = `https://api.${serverHost}`;
        identityUrl = `https://identity.${serverHost}`;
      } else {
        const containsProtocol = /^https?:\/\//.test(formValue.serverUrl);
        const serverUrl = new URL(
          containsProtocol
            ? formValue.serverUrl
            : "https://" + formValue.serverUrl,
        );

        if (!serverUrl.pathname.endsWith("/")) {
          serverUrl.pathname = serverUrl.pathname + "/";
        }

        apiUrl = serverUrl.href + "api";
        identityUrl = serverUrl.href + "identity";
      }

      console.debug("Bitwarden urls", apiUrl, identityUrl);
      await this.bitwardenSplunkService.updateScriptConfigurationFile({
        apiUrl,
        identityUrl,
        startDate: formValue.startDate,
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

  protected changeServerUrlType() {
    const serverUrlType = this.setupForm.value.serverUrlType!;
    if (this.isServerUrlBitwardenCloud(serverUrlType)) {
      this.setupForm.patchValue({ serverUrl: "" });
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
          console.debug("Bitwarden app Configuration loaded");
          console.debug("Available Splunk indexes", indexes);
          console.debug("Inputs configuration", inputsConfiguration);
          console.debug("Script configuration", scriptConfiguration);

          const updates: Partial<SetupForm> = {};

          if (inputsConfiguration !== undefined) {
            if (indexes.includes(inputsConfiguration.index)) {
              updates.index = inputsConfiguration.index;
            } else {
              updates.indexOverride = inputsConfiguration.index;
            }
          }

          if (
            scriptConfiguration !== undefined &&
            URL.canParse(scriptConfiguration.apiUrl)
          ) {
            const apiUrl = new URL(scriptConfiguration.apiUrl);
            if (apiUrl.host === "api.bitwarden.com") {
              updates.serverUrlType = "bitwarden.com";
            } else if (apiUrl.host === "api.bitwarden.eu") {
              updates.serverUrlType = "bitwarden.eu";
            } else {
              updates.serverUrlType = "self-hosted";
              apiUrl.pathname = apiUrl.pathname.replace(/\/api$/i, "");
              updates.serverUrl = apiUrl.href;
            }

            updates.startDate = scriptConfiguration.startDate ?? "";
          }

          // Apply all updates at once
          this.setupForm.patchValue(updates);

          this.loadingConfiguration.set(false);
        },
        error: (error) => {
          console.error("Failed to load configuration.", error);
          this.loadingConfiguration.set(false);
        },
      });
  }

  private isServerUrlBitwardenCloud(serverUrlType: ServerUrlType): boolean {
    return (
      serverUrlType === "bitwarden.com" || serverUrlType === "bitwarden.eu"
    );
  }
}
