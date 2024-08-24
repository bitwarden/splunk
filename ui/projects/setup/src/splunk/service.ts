import { Injectable } from "@angular/core";
import { SplunkIndex, SplunkJs } from "./splunkjs";
import { AppConfig } from "../config";

@Injectable({
  providedIn: "root",
})
export class Service {
  private readonly globalNamespaceService = new SplunkJs({
    owner: "-",
    app: "-",
    sharing: "app",
  });
  private readonly bitwardenAppService;

  constructor(config: AppConfig) {
    this.bitwardenAppService = new SplunkJs({
      owner: "-",
      app: config.appName,
      sharing: "app",
    });
  }

  async getAllIndexes(): Promise<SplunkIndex[]> {
    const indexesCollection = this.globalNamespaceService
      .getService()
      .indexes(this.globalNamespaceService.namespace);
    await indexesCollection.fetch();
    return indexesCollection.list();
  }
}
