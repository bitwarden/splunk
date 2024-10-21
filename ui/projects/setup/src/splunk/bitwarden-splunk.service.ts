import { Injectable } from "@angular/core";
import { AppConfig } from "../config";
import { SplunkService } from "./splunk.service";
import {
  InputsConfiguration,
  ScriptsConfiguration,
} from "../models/bitwarden-splunk";

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

  async upsertApiKey(clientId: string, clientSecret: string) {
    const realm = this.config.appName + "_realm";
    const secret = clientId + "_" + clientSecret;
    await this.splunkService.upsertStoragePassword(realm, "api_key", secret);
  }

  async getInputsConfigurationFile(): Promise<InputsConfiguration | undefined> {
    const configurationFile = await this.splunkService.getConfigurationFile(
      "inputs",
      this.inputStanzaName,
    );
    console.log("Configuration from inputs.conf", configurationFile);

    const properties = configurationFile.properties();
    console.log("Properties from inputs.conf", properties);

    if (Object.keys(properties).includes("index")) {
      return {
        index: properties["index"],
      } as InputsConfiguration;
    }
    return undefined;
  }

  async updateInputsConfigurationFile(
    inputsConfiguration: InputsConfiguration,
  ) {
    await this.splunkService.upsertConfigurationFile(
      "inputs",
      this.inputStanzaName,
      inputsConfiguration,
    );
  }

  async getScriptConfigurationFile(): Promise<
    ScriptsConfiguration | undefined
  > {
    const configurationFile = await this.splunkService.getConfigurationFile(
      "script",
      "config",
    );
    console.log("Configuration from script.conf", configurationFile);

    const properties = configurationFile.properties();
    console.log("Properties from script.conf", properties);

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

  async updateScriptConfigurationFile(configuration: ScriptsConfiguration) {
    await this.splunkService.upsertConfigurationFile(
      "script",
      "config",
      configuration,
    );
  }

  async updateAppConfigurationFile(isConfigured: boolean) {
    await this.splunkService.upsertConfigurationFile("app", "install", {
      is_configured: isConfigured.toString(),
    });
  }

  async reloadApp() {
    await this.splunkService.reloadApp(this.config.appName);
  }
}
