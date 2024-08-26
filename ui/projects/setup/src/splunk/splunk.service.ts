import { Injectable } from "@angular/core";
import { ConfigurationStanza, Index, SplunkJs } from "./splunkjs";
import { AppConfig } from "../config";

@Injectable({
  providedIn: "root",
})
export class SplunkService {
  private readonly globalNamespaceService = new SplunkJs({
    owner: "-",
    app: "-",
    sharing: "app",
  });
  private readonly bitwardenAppService;

  constructor(config: AppConfig) {
    this.bitwardenAppService = new SplunkJs({
      owner: "nobody",
      app: config.appName,
      sharing: "app",
    });
  }

  async getAllIndexes(): Promise<Index[]> {
    const indexesCollection = this.globalNamespaceService
      .getService()
      .indexes(this.globalNamespaceService.namespace);
    await indexesCollection.fetch();
    return indexesCollection.list();
  }

  async upsertStoragePassword(realm: string, name: string, password: string) {
    const storagePasswordCollection = this.bitwardenAppService
      .getService()
      .storagePasswords(this.bitwardenAppService.namespace);
    await storagePasswordCollection.fetch();
    await storagePasswordCollection.createOrReplace({
      name,
      realm,
      password,
    });
  }

  async getConfiguration(
    filename: string,
    stanzaName: string,
  ): Promise<ConfigurationStanza> {
    const configurationsCollection = this.bitwardenAppService
      .getService()
      .configurations(this.bitwardenAppService.namespace);
    await configurationsCollection.fetch();
    const configurationFile =
      await configurationsCollection.getConfFile(filename);
    console.log(configurationFile);
    return configurationFile.item(stanzaName);
  }

  async upsertConfiguration(
    filename: string,
    stanzaName: string,
    keyValueMap: Record<string, string>,
  ) {
    const configurationsCollection = this.bitwardenAppService
      .getService()
      .configurations(this.bitwardenAppService.namespace);
    await configurationsCollection.fetch();
    await configurationsCollection.createAsync(
      filename,
      stanzaName,
      keyValueMap,
    );
  }

  async reloadApp(appName: string) {
    const appsService = this.bitwardenAppService
      .getService()
      .apps(this.bitwardenAppService.namespace);
    await appsService.fetch();
    const app = appsService.item(appName);
    console.log(app);
    await app.reload();
  }
}
