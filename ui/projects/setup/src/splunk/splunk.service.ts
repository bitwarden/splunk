import { Injectable } from "@angular/core";
import { AppConfig } from "../config";
import { ConfigurationFileStanzaEntity, Index } from "./splunk-js";
import { SplunkJsServiceBuilder } from "./splunk-js-service-builder";

@Injectable({
  providedIn: "root",
})
export class SplunkService {
  private readonly globalNamespaceService = new SplunkJsServiceBuilder({
    owner: "-",
    app: "-",
    sharing: "app",
  });
  private readonly bitwardenAppService;

  constructor(config: AppConfig) {
    this.bitwardenAppService = new SplunkJsServiceBuilder({
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

  async getConfigurationFile(
    filename: string,
    stanzaName: string,
  ): Promise<ConfigurationFileStanzaEntity> {
    const configurationsCollection = this.bitwardenAppService
      .getService()
      .configurations(this.bitwardenAppService.namespace);
    await configurationsCollection.fetch();
    const configurationFile =
      await configurationsCollection.getConfFile(filename);
    console.log("Configuration file", configurationFile);
    return configurationFile.item(stanzaName);
  }

  async upsertConfigurationFile(
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
