import { Injectable } from "@angular/core";
import { AppConfig } from "../config";
import { SplunkService } from "./splunk.service";
import {
  InputsConfiguration,
  ScriptsConfiguration,
} from "../models/bitwarden-splunk";

/**
 * Service for managing Bitwarden-specific Splunk configurations.
 * Provides high-level methods for configuring the Bitwarden Splunk app,
 * including API keys, input/script configurations, and app settings.
 */
@Injectable({
  providedIn: "root",
})
export class BitwardenSplunkService {
  inputStanzaName: string;

  constructor(
    readonly config: AppConfig,
    readonly splunkService: SplunkService,
  ) {
    this.inputStanzaName =
      "script://$SPLUNK_HOME/etc/apps/" +
      this.config.appName +
      "/bin/bitwarden_event_logs.py";
  }

  /**
   * Stores or updates the Bitwarden API key (client ID and secret) in Splunk's storage.
   * @param clientId - The Bitwarden API client ID.
   * @param clientSecret - The Bitwarden API client secret.
   * @returns A promise that resolves when the API key is stored.
   */
  async upsertApiKey(clientId: string, clientSecret: string) {
    const realm = this.config.appName + "_realm";
    const secret = clientId + "_" + clientSecret;
    await this.splunkService.upsertStoragePassword(realm, "api_key", secret);
  }

  /**
   * Retrieves the current inputs configuration from inputs.conf.
   * @returns A promise that resolves to the inputs configuration, or undefined if not found.
   */
  async getInputsConfigurationFile(): Promise<InputsConfiguration | undefined> {
    const configurationFile = await this.splunkService.getConfigurationFile(
      "inputs",
      this.inputStanzaName,
    );

    const properties = configurationFile.properties();
    console.debug("Properties from inputs.conf", properties);

    if (Object.keys(properties).includes("index")) {
      return {
        index: properties["index"],
      } as InputsConfiguration;
    }
    return undefined;
  }

  /**
   * Updates the inputs configuration in inputs.conf.
   * @param inputsConfiguration - The inputs configuration to save.
   * @returns A promise that resolves when the configuration is updated.
   */
  async updateInputsConfigurationFile(
    inputsConfiguration: InputsConfiguration,
  ) {
    await this.splunkService.upsertConfigurationFile(
      "inputs",
      this.inputStanzaName,
      inputsConfiguration,
    );
  }

  /**
   * Retrieves the current script configuration from script.conf.
   * @returns A promise that resolves to the scripts configuration, or undefined if not found.
   */
  async getScriptConfigurationFile(): Promise<
    ScriptsConfiguration | undefined
  > {
    const configurationFile = await this.splunkService.getConfigurationFile(
      "script",
      "config",
    );

    const properties = configurationFile.properties();
    console.debug("Properties from script.conf", properties);

    const keys = Object.keys(properties);
    if (keys.includes("apiUrl") && keys.includes("identityUrl")) {
      return {
        apiUrl: properties["apiUrl"],
        identityUrl: properties["identityUrl"],
        startDate: keys.includes("startDate")
          ? properties["startDate"]
          : undefined,
      } as ScriptsConfiguration;
    }
    return undefined;
  }

  /**
   * Updates the script configuration in script.conf.
   * @param configuration - The scripts configuration to save.
   * @returns A promise that resolves when the configuration is updated.
   */
  async updateScriptConfigurationFile(configuration: ScriptsConfiguration) {
    await this.splunkService.upsertConfigurationFile(
      "script",
      "config",
      configuration,
    );
  }

  /**
   * Updates the app configuration in app.conf to mark whether the app is configured.
   * @param isConfigured - Boolean indicating if the app is configured.
   * @returns A promise that resolves when the configuration is updated.
   */
  async updateAppConfigurationFile(isConfigured: boolean) {
    await this.splunkService.upsertConfigurationFile("app", "install", {
      is_configured: isConfigured.toString(),
    });
  }

  /**
   * Reloads the Bitwarden Splunk app to apply configuration changes.
   * @returns A promise that resolves when the app is reloaded.
   */
  async reloadApp() {
    await this.splunkService.reloadApp(this.config.appName);
  }
}
