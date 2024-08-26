import { Injectable } from "@angular/core";
import { AppConfig } from "../config";
import { SplunkService } from "./splunk.service";

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

  async getIndexFromInputsConfigurationFile(): Promise<string> {
    const configuration = await this.splunkService.getConfiguration(
      "inputs",
      this.inputStanzaName,
    );
    return configuration.index;
  }

  async updateInputsConfigurationFile(index: string) {
    await this.splunkService.upsertConfiguration(
      "inputs",
      this.inputStanzaName,
      {
        index,
      },
    );
  }

  async updateScriptConfigurationFile(
    apiUrl: string,
    identityUrl: string,
    startDate: string,
  ) {
    await this.splunkService.upsertConfiguration("script", "config", {
      apiUrl,
      identityUrl,
      startDate,
    });
  }

  async updateAppConfigurationFile(isConfigured: boolean) {
    await this.splunkService.upsertConfiguration("app", "install", {
      is_configured: isConfigured.toString(),
    });
  }

  async reloadApp() {
    await this.splunkService.reloadApp(this.config.appName);
  }
}
