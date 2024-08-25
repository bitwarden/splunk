import { Injectable } from "@angular/core";
import { AppConfig } from "../config";
import { SplunkService } from "./splunk.service";

@Injectable({
  providedIn: "root",
})
export class BitwardenSplunkService {
  constructor(
    readonly config: AppConfig,
    readonly splunkService: SplunkService,
  ) {}

  async upsertApiKey(clientId: string, clientSecret: string) {
    const realm = this.config.appName + "_realm";
    const secret = clientId + "_" + clientSecret;
    await this.splunkService.upsertStoragePassword(realm, "api_key", secret);
  }

  async updateInputsConfigurationFile(index: string) {
    const stanzaName =
      "script://$SPLUNK_HOME/etc/apps/" +
      this.config.appName +
      "/bin/bitwarden_event_logs.py";
    await this.splunkService.upsertConfiguration("inputs", stanzaName, {
      index,
    });
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
    await this.splunkService.reloadConfigurationFile("app");
  }
}
