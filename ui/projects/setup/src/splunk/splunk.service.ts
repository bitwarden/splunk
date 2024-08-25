import { Injectable } from "@angular/core";
import { Index, SplunkJs } from "./splunkjs";
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
    await storagePasswordCollection.createOrReplace({
      name,
      realm,
      password,
    });
  }

  async upsertConfiguration(
    filename: string,
    stanzaName: string,
    keyValueMap: Record<string, string>,
  ) {
    const configurationsCollection = this.bitwardenAppService
      .getService()
      .configurations(this.bitwardenAppService.namespace);
    await configurationsCollection.createAsync(
      filename,
      stanzaName,
      keyValueMap,
    );
  }

  async reloadConfigurationFile(filename: string) {
    const configurationsCollection = this.bitwardenAppService
      .getService()
      .configurations(this.bitwardenAppService.namespace);
    const configurationFile =
      await configurationsCollection.getConfFile(filename);
    console.log(configurationFile);
    await configurationFile.reload();
  }
}
